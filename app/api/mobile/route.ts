import { env } from 'cloudflare:workers';

type MobileSession = { familyId: string; memberId: string; name: string };
type Rule = { frequency: 'weekly' | 'biweekly' | 'monthly'; weekdays: number[]; rotationMemberIds: string[] };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const text = (body: Record<string, unknown>, key: string) => String(body[key] ?? '').trim();
const optionalText = (body: Record<string, unknown>, key: string) => text(body, key) || null;
const optionalNumber = (body: Record<string, unknown>, key: string) => {
  const value = Number(body[key]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
};
const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const parseRule = (value: unknown): Rule | null => {
  try {
    const row = JSON.parse(String(value ?? '')) as Partial<Rule>;
    if (!['weekly', 'biweekly', 'monthly'].includes(String(row.frequency))) return null;
    return { frequency: row.frequency as Rule['frequency'], weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(Number) : [], rotationMemberIds: Array.isArray(row.rotationMemberIds) ? row.rotationMemberIds.map(String) : [] };
  } catch { return null; }
};
const ruleFromBody = (body: Record<string, unknown>, allowedMembers: Set<string>) => {
  const frequency = ['weekly', 'biweekly', 'monthly'].includes(text(body, 'repeatRule')) ? text(body, 'repeatRule') as Rule['frequency'] : null;
  const weekdays = Array.isArray(body.weekdays) ? body.weekdays.map(Number).filter((day) => day >= 1 && day <= 7) : [];
  const rotationMemberIds = Array.isArray(body.rotationMemberIds) ? body.rotationMemberIds.map(String).filter((memberId) => allowedMembers.has(memberId)) : [];
  return { value: frequency ? JSON.stringify({ frequency, weekdays, rotationMemberIds }) : null, rotationMemberIds };
};
const nextDue = (dueAt: number, rule: Rule) => {
  const due = new Date(dueAt * 1000);
  if (rule.frequency === 'monthly') { due.setUTCMonth(due.getUTCMonth() + 1); return Math.floor(due.getTime() / 1000); }
  const days = rule.weekdays.length ? [...new Set(rule.weekdays)].sort((a, b) => a - b) : [((due.getUTCDay() + 6) % 7) + 1];
  const current = ((due.getUTCDay() + 6) % 7) + 1;
  const next = days.find((day) => day > current);
  due.setUTCDate(due.getUTCDate() + (next ? next - current : (rule.frequency === 'biweekly' ? 14 : 7) - current + days[0]));
  return Math.floor(due.getTime() / 1000);
};

async function authenticate(request: Request): Promise<MobileSession | null> {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer?.startsWith('fb_') || !env.DB) return null;
  const tokenHash = await hash(bearer);
  const row = await env.DB.prepare(`SELECT d.id,d.family_id,d.member_id,m.name FROM device_tokens d JOIN members m ON m.id=d.member_id WHERE d.token_hash=? AND d.revoked_at IS NULL LIMIT 1`).bind(tokenHash).first<{ id: string; family_id: string; member_id: string; name: string }>();
  if (!row) return null;
  await env.DB.prepare('UPDATE device_tokens SET last_used_at=? WHERE id=?').bind(Math.floor(Date.now() / 1000), row.id).run();
  return { familyId: row.family_id, memberId: row.member_id, name: row.name };
}
async function familyMemberIds(familyId: string) {
  const rows = await env.DB.prepare('SELECT id FROM members WHERE family_id=?').bind(familyId).all<{ id: string }>();
  return new Set(rows.results.map((row) => row.id));
}
async function snapshot(s: MobileSession) {
  const now = Math.floor(Date.now() / 1000);
  const [shopping, todos, chores, members, projects] = await Promise.all([
    env.DB.prepare('SELECT id,name,quantity,category,checked FROM shopping_items WHERE family_id=? AND checked=0 ORDER BY rowid DESC LIMIT 100').bind(s.familyId).all(),
    env.DB.prepare(`SELECT t.id,t.title,t.due_at,t.assigned_member_id,t.project_id,p.name AS project FROM todos t JOIN projects p ON p.id=t.project_id WHERE p.family_id=? AND t.completed=0 ORDER BY CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,t.due_at,t.rowid DESC LIMIT 100`).bind(s.familyId).all(),
    env.DB.prepare(`SELECT id,title,due_at,points,assigned_member_id,repeat_rule FROM chores WHERE family_id=? AND completed_at IS NULL ORDER BY due_at,rowid DESC LIMIT 100`).bind(s.familyId).all(),
    env.DB.prepare('SELECT id,name,color FROM members WHERE family_id=? ORDER BY name').bind(s.familyId).all(),
    env.DB.prepare('SELECT id,name,icon FROM projects WHERE family_id=? ORDER BY name').bind(s.familyId).all(),
  ]);
  return { member: { id: s.memberId, name: s.name }, shopping: shopping.results, todos: todos.results, chores: chores.results, members: members.results, projects: projects.results, serverTime: now };
}

export async function GET(request: Request) {
  const session = await authenticate(request);
  return session ? json(await snapshot(session)) : json({ error: 'Ungültiger oder widerrufener Gerätezugang.' }, 401);
}

export async function POST(request: Request) {
  const session = await authenticate(request);
  if (!session) return json({ error: 'Ungültiger oder widerrufener Gerätezugang.' }, 401);
  const body = await request.json() as Record<string, unknown>;
  const action = text(body, 'action');
  const itemId = text(body, 'id');
  const db = env.DB;
  try {
    if (action === 'create-shopping') {
      if (!text(body, 'name')) return json({ error: 'Bitte einen Artikel eingeben.' }, 400);
      await db.prepare('INSERT INTO shopping_items (id,family_id,name,quantity,category,checked) VALUES (?,?,?,?,?,0)').bind(newId('shop'), session.familyId, text(body, 'name'), optionalText(body, 'quantity'), text(body, 'category') || 'Sonstiges').run();
    } else if (action === 'update-shopping') {
      if (!itemId || !text(body, 'name')) return json({ error: 'Artikel und Name werden benötigt.' }, 400);
      await db.prepare('UPDATE shopping_items SET name=?,quantity=?,category=? WHERE id=? AND family_id=?').bind(text(body, 'name'), optionalText(body, 'quantity'), text(body, 'category') || 'Sonstiges', itemId, session.familyId).run();
    } else if (action === 'delete-shopping') {
      await db.prepare('DELETE FROM shopping_items WHERE id=? AND family_id=?').bind(itemId, session.familyId).run();
    } else if (action === 'toggle-shopping') {
      await db.prepare('UPDATE shopping_items SET checked=NOT checked WHERE id=? AND family_id=?').bind(itemId, session.familyId).run();
    } else if (action === 'create-todo' || action === 'update-todo') {
      const title = text(body, 'title'); const projectId = text(body, 'projectId');
      if (!title || !projectId) return json({ error: 'Titel und Projekt werden benötigt.' }, 400);
      const project = await db.prepare('SELECT id FROM projects WHERE id=? AND family_id=?').bind(projectId, session.familyId).first();
      if (!project) return json({ error: 'Das Projekt wurde nicht gefunden.' }, 404);
      const members = await familyMemberIds(session.familyId);
      const memberId = members.has(text(body, 'memberId')) ? text(body, 'memberId') : null;
      if (action === 'create-todo') {
        await db.prepare('INSERT INTO todos (id,project_id,title,completed,assigned_member_id,due_at) VALUES (?,?,?,0,?,?)').bind(newId('todo'), projectId, title, memberId, optionalNumber(body, 'dueAt')).run();
      } else {
        await db.prepare(`UPDATE todos SET project_id=?,title=?,assigned_member_id=?,due_at=? WHERE id=? AND project_id IN (SELECT id FROM projects WHERE family_id=?)`).bind(projectId, title, memberId, optionalNumber(body, 'dueAt'), itemId, session.familyId).run();
      }
    } else if (action === 'delete-todo') {
      await db.prepare('DELETE FROM todos WHERE id=? AND project_id IN (SELECT id FROM projects WHERE family_id=?)').bind(itemId, session.familyId).run();
    } else if (action === 'toggle-todo') {
      await db.prepare('UPDATE todos SET completed=NOT completed WHERE id=? AND project_id IN (SELECT id FROM projects WHERE family_id=?)').bind(itemId, session.familyId).run();
    } else if (action === 'create-chore' || action === 'update-chore') {
      const title = text(body, 'title'); const dueAt = optionalNumber(body, 'dueAt');
      if (!title || !dueAt) return json({ error: 'Aufgabe und Termin werden benötigt.' }, 400);
      const members = await familyMemberIds(session.familyId);
      const rule = ruleFromBody(body, members);
      const memberId = rule.rotationMemberIds[0] ?? (members.has(text(body, 'memberId')) ? text(body, 'memberId') : null);
      const points = Math.max(1, Math.min(1000, Number(body.points) || 1));
      if (action === 'create-chore') {
        await db.prepare('INSERT INTO chores (id,family_id,title,assigned_member_id,due_at,repeat_rule,points) VALUES (?,?,?,?,?,?,?)').bind(newId('chore'), session.familyId, title, memberId, dueAt, rule.value, points).run();
      } else {
        await db.prepare('UPDATE chores SET title=?,assigned_member_id=?,due_at=?,repeat_rule=?,points=? WHERE id=? AND family_id=?').bind(title, memberId, dueAt, rule.value, points, itemId, session.familyId).run();
      }
    } else if (action === 'delete-chore') {
      await db.prepare('DELETE FROM chores WHERE id=? AND family_id=?').bind(itemId, session.familyId).run();
    } else if (action === 'complete-chore') {
      const chore = await db.prepare('SELECT assigned_member_id,points,due_at,repeat_rule FROM chores WHERE id=? AND family_id=? AND completed_at IS NULL').bind(itemId, session.familyId).first<{ assigned_member_id: string | null; points: number; due_at: number; repeat_rule: string | null }>();
      if (chore) {
        const rule = parseRule(chore.repeat_rule); const rotation = rule?.rotationMemberIds ?? [];
        const index = rotation.indexOf(chore.assigned_member_id ?? '');
        const nextMember = rotation.length ? rotation[(index + 1 + rotation.length) % rotation.length] : chore.assigned_member_id;
        const statements = [rule
          ? db.prepare('UPDATE chores SET due_at=?,assigned_member_id=?,completed_at=NULL WHERE id=? AND family_id=?').bind(nextDue(chore.due_at, rule), nextMember, itemId, session.familyId)
          : db.prepare('UPDATE chores SET completed_at=? WHERE id=? AND family_id=?').bind(Math.floor(Date.now() / 1000), itemId, session.familyId)];
        if (chore.assigned_member_id) statements.push(db.prepare('UPDATE members SET points=points+? WHERE id=? AND family_id=?').bind(chore.points, chore.assigned_member_id, session.familyId));
        await db.batch(statements);
      }
    } else return json({ error: 'Unbekannte Aktion.' }, 400);
    return json(await snapshot(session));
  } catch (error) {
    console.error('Mobile action failed', action, error);
    return json({ error: 'Die Änderung konnte nicht gespeichert werden.' }, 500);
  }
}
