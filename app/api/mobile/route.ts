import { env } from 'cloudflare:workers';

type MobileSession = { familyId: string; memberId: string; name: string };
type Rule = { frequency: 'weekly' | 'biweekly' | 'monthly'; weekdays: number[]; rotationMemberIds: string[] };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const parseRule = (value: unknown): Rule | null => { try { const row=JSON.parse(String(value??'')) as Partial<Rule>; if(!['weekly','biweekly','monthly'].includes(String(row.frequency))) return null; return {frequency:row.frequency as Rule['frequency'],weekdays:Array.isArray(row.weekdays)?row.weekdays.map(Number):[],rotationMemberIds:Array.isArray(row.rotationMemberIds)?row.rotationMemberIds.map(String):[]}; } catch { return null; } };
const nextDue = (dueAt:number,rule:Rule) => { const due=new Date(dueAt*1000); if(rule.frequency==='monthly'){due.setUTCMonth(due.getUTCMonth()+1);return Math.floor(due.getTime()/1000);} const days=rule.weekdays.length?[...new Set(rule.weekdays)].sort((a,b)=>a-b):[((due.getUTCDay()+6)%7)+1];const current=((due.getUTCDay()+6)%7)+1;const next=days.find(day=>day>current);due.setUTCDate(due.getUTCDate()+(next?next-current:(rule.frequency==='biweekly'?14:7)-current+days[0]));return Math.floor(due.getTime()/1000); };
async function authenticate(request: Request): Promise<MobileSession | null> {
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer?.startsWith('fb_') || !env.DB) return null;
  const tokenHash = await hash(bearer);
  const row = await env.DB.prepare(`SELECT d.id, d.family_id, d.member_id, m.name FROM device_tokens d JOIN members m ON m.id=d.member_id WHERE d.token_hash=? AND d.revoked_at IS NULL LIMIT 1`).bind(tokenHash).first<{ id: string; family_id: string; member_id: string; name: string }>();
  if (!row) return null;
  await env.DB.prepare('UPDATE device_tokens SET last_used_at=? WHERE id=?').bind(Math.floor(Date.now()/1000), row.id).run();
  return { familyId: row.family_id, memberId: row.member_id, name: row.name };
}
async function snapshot(s: MobileSession) {
  const now = Math.floor(Date.now()/1000); const tomorrow = now + 86400;
  const [shopping, todos, chores] = await Promise.all([
    env.DB.prepare('SELECT id,name,quantity,category,checked FROM shopping_items WHERE family_id=? AND checked=0 ORDER BY rowid DESC LIMIT 30').bind(s.familyId).all(),
    env.DB.prepare(`SELECT t.id,t.title,t.due_at,p.name AS project FROM todos t JOIN projects p ON p.id=t.project_id WHERE p.family_id=? AND t.completed=0 AND (t.assigned_member_id IS NULL OR t.assigned_member_id=?) ORDER BY t.due_at LIMIT 30`).bind(s.familyId,s.memberId).all(),
    env.DB.prepare(`SELECT id,title,due_at,points FROM chores WHERE family_id=? AND completed_at IS NULL AND (assigned_member_id IS NULL OR assigned_member_id=?) AND due_at<? ORDER BY due_at LIMIT 30`).bind(s.familyId,s.memberId,tomorrow).all(),
  ]);
  return { member: { id:s.memberId,name:s.name }, shopping:shopping.results, todos:todos.results, chores:chores.results, serverTime:now };
}
export async function GET(request: Request) { const s=await authenticate(request); return s ? json(await snapshot(s)) : json({error:'Ungültiger oder widerrufener Gerätezugang.'},401); }
export async function POST(request: Request) {
  const s=await authenticate(request); if(!s) return json({error:'Ungültiger oder widerrufener Gerätezugang.'},401);
  const body=await request.json() as Record<string,unknown>; const action=String(body.action??''); const id=String(body.id??'');
  if(action==='toggle-shopping') await env.DB.prepare('UPDATE shopping_items SET checked=NOT checked WHERE id=? AND family_id=?').bind(id,s.familyId).run();
  else if(action==='toggle-todo') await env.DB.prepare('UPDATE todos SET completed=NOT completed WHERE id=? AND project_id IN (SELECT id FROM projects WHERE family_id=?)').bind(id,s.familyId).run();
  else if(action==='complete-chore') {
    const chore=await env.DB.prepare('SELECT assigned_member_id,points,due_at,repeat_rule FROM chores WHERE id=? AND family_id=? AND completed_at IS NULL').bind(id,s.familyId).first<{assigned_member_id:string|null;points:number;due_at:number;repeat_rule:string|null}>();
    if(chore){ const rule=parseRule(chore.repeat_rule);const rotation=rule?.rotationMemberIds??[];const index=rotation.indexOf(chore.assigned_member_id??'');const nextMember=rotation.length?rotation[(index+1+rotation.length)%rotation.length]:chore.assigned_member_id;await env.DB.batch([rule?env.DB.prepare('UPDATE chores SET due_at=?,assigned_member_id=?,completed_at=NULL WHERE id=? AND family_id=?').bind(nextDue(chore.due_at,rule),nextMember,id,s.familyId):env.DB.prepare('UPDATE chores SET completed_at=? WHERE id=? AND family_id=?').bind(Math.floor(Date.now()/1000),id,s.familyId),env.DB.prepare('UPDATE members SET points=points+? WHERE id=? AND family_id=?').bind(chore.points,chore.assigned_member_id,s.familyId)]); }
  } else return json({error:'Unbekannte Aktion.'},400);
  return json(await snapshot(s));
}
