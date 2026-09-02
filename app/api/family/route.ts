import { env } from 'cloudflare:workers';

type Session = { familyId: string; memberId: string; role: string; name: string };
const json = (data: unknown, status = 200) => Response.json(data, { status });
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function session(request: Request): Promise<Session | null> {
  const userId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (!userId || !email || !env.DB) return null;
  let member = await env.DB.prepare('SELECT id, family_id, role, name FROM members WHERE user_id = ? OR (email = ? AND user_id IS NULL) LIMIT 1').bind(userId, email).first<{ id: string; family_id: string; role: string; name: string }>();
  if (member) {
    await env.DB.prepare('UPDATE members SET user_id = ? WHERE id = ? AND user_id IS NULL').bind(userId, member.id).run();
    return { familyId: member.family_id, memberId: member.id, role: member.role, name: member.name };
  }
  const familyId = id('family');
  const memberId = id('member');
  const displayName = decodeURIComponent(request.headers.get('oai-authenticated-user-full-name') ?? email.split('@')[0]);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO families (id, name, created_at) VALUES (?, ?, ?)').bind(familyId, `Familie ${displayName}`, Math.floor(Date.now() / 1000)),
    env.DB.prepare("INSERT INTO members (id, family_id, user_id, name, email, role, color, points) VALUES (?, ?, ?, ?, ?, 'admin', '#c7f36c', 0)").bind(memberId, familyId, userId, displayName, email),
  ]);
  return { familyId, memberId, role: 'admin', name: displayName };
}

async function loadAll(s: Session) {
  const db = env.DB;
  const [members, recipes, shopping, projects, todos, events, chores] = await Promise.all([
    db.prepare('SELECT * FROM members WHERE family_id = ? ORDER BY name').bind(s.familyId).all(),
    db.prepare('SELECT * FROM recipes WHERE family_id = ? ORDER BY title').bind(s.familyId).all(),
    db.prepare('SELECT * FROM shopping_items WHERE family_id = ? ORDER BY checked, rowid DESC').bind(s.familyId).all(),
    db.prepare('SELECT * FROM projects WHERE family_id = ? ORDER BY name').bind(s.familyId).all(),
    db.prepare('SELECT t.* FROM todos t JOIN projects p ON p.id=t.project_id WHERE p.family_id = ? ORDER BY t.completed, t.due_at').bind(s.familyId).all(),
    db.prepare('SELECT * FROM events WHERE family_id = ? ORDER BY starts_at').bind(s.familyId).all(),
    db.prepare('SELECT * FROM chores WHERE family_id = ? ORDER BY completed_at IS NOT NULL, due_at').bind(s.familyId).all(),
  ]);
  return { session: s, members: members.results, recipes: recipes.results, shopping: shopping.results, projects: projects.results, todos: todos.results, events: events.results, chores: chores.results };
}

export async function GET(request: Request) {
  const s = await session(request);
  if (!s) return json({ error: 'Nicht angemeldet' }, 401);
  return json(await loadAll(s));
}

export async function POST(request: Request) {
  const s = await session(request);
  if (!s) return json({ error: 'Nicht angemeldet' }, 401);
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action ?? '');
  const db = env.DB;
  const text = (key: string) => String(body[key] ?? '').trim();
  try {
    if (action === 'create-shopping') await db.prepare('INSERT INTO shopping_items (id, family_id, name, quantity, category, checked) VALUES (?, ?, ?, ?, ?, false)').bind(id('shop'), s.familyId, text('name'), text('quantity'), text('category') || 'Sonstiges').run();
    else if (action === 'toggle-shopping') await db.prepare('UPDATE shopping_items SET checked = NOT checked WHERE id = ? AND family_id = ?').bind(text('id'), s.familyId).run();
    else if (action === 'create-project') await db.prepare('INSERT INTO projects (id, family_id, name, icon) VALUES (?, ?, ?, ?)').bind(id('project'), s.familyId, text('name'), text('icon') || '📌').run();
    else if (action === 'create-todo') await db.prepare('INSERT INTO todos (id, project_id, title, completed, assigned_member_id, due_at) SELECT ?, p.id, ?, false, ?, ? FROM projects p WHERE p.id = ? AND p.family_id = ?').bind(id('todo'), text('title'), text('memberId') || null, Number(body.dueAt) || null, text('projectId'), s.familyId).run();
    else if (action === 'toggle-todo') await db.prepare('UPDATE todos SET completed = NOT completed WHERE id = ? AND project_id IN (SELECT id FROM projects WHERE family_id = ?)').bind(text('id'), s.familyId).run();
    else if (action === 'create-event') await db.prepare('INSERT INTO events (id, family_id, title, starts_at, ends_at, member_id, is_shared) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id('event'), s.familyId, text('title'), Number(body.startsAt), Number(body.endsAt) || null, text('memberId') || null, body.isShared ? 1 : 0).run();
    else if (action === 'create-chore') await db.prepare('INSERT INTO chores (id, family_id, title, assigned_member_id, due_at, repeat_rule, points) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id('chore'), s.familyId, text('title'), text('memberId') || null, Number(body.dueAt), text('repeatRule') || null, Number(body.points) || 1).run();
    else if (action === 'complete-chore') {
      const chore = await db.prepare('SELECT assigned_member_id, points FROM chores WHERE id = ? AND family_id = ? AND completed_at IS NULL').bind(text('id'), s.familyId).first<{ assigned_member_id: string | null; points: number }>();
      if (chore) await db.batch([
        db.prepare('UPDATE chores SET completed_at = ? WHERE id = ? AND family_id = ?').bind(Math.floor(Date.now() / 1000), text('id'), s.familyId),
        db.prepare('UPDATE members SET points = points + ? WHERE id = ? AND family_id = ?').bind(chore.points, chore.assigned_member_id, s.familyId),
      ]);
    }
    else if (action === 'create-member') {
      if (s.role !== 'admin') return json({ error: 'Nur Administratoren dürfen Mitglieder anlegen.' }, 403);
      await db.prepare("INSERT INTO members (id, family_id, name, email, role, color, points) VALUES (?, ?, ?, ?, ?, ?, 0)").bind(id('member'), s.familyId, text('name'), text('email') || null, text('role') || 'member', text('color') || '#8cc8ff').run();
    }
    else if (action === 'update-member') {
      if (s.role !== 'admin') return json({ error: 'Nur Administratoren dürfen Mitglieder bearbeiten.' }, 403);
      const target = await db.prepare('SELECT id, role FROM members WHERE id = ? AND family_id = ?').bind(text('id'), s.familyId).first<{ id: string; role: string }>();
      if (!target) return json({ error: 'Mitglied nicht gefunden.' }, 404);
      const role = ['admin', 'member', 'child'].includes(text('role')) ? text('role') : 'member';
      if (target.role === 'admin' && role !== 'admin') {
        const count = await db.prepare("SELECT COUNT(*) AS count FROM members WHERE family_id = ? AND role = 'admin'").bind(s.familyId).first<{ count: number }>();
        if (Number(count?.count) <= 1) return json({ error: 'Der letzte Administrator kann nicht herabgestuft werden.' }, 400);
      }
      await db.prepare('UPDATE members SET name = ?, email = ?, role = ?, color = ? WHERE id = ? AND family_id = ?').bind(text('name'), text('email') || null, role, text('color') || '#8cc8ff', target.id, s.familyId).run();
    }
    else if (action === 'delete-member') {
      if (s.role !== 'admin') return json({ error: 'Nur Administratoren dürfen Mitglieder löschen.' }, 403);
      if (text('id') === s.memberId) return json({ error: 'Das eigene Konto kann nicht gelöscht werden.' }, 400);
      const target = await db.prepare('SELECT id, role FROM members WHERE id = ? AND family_id = ?').bind(text('id'), s.familyId).first<{ id: string; role: string }>();
      if (!target) return json({ error: 'Mitglied nicht gefunden.' }, 404);
      if (target.role === 'admin') {
        const count = await db.prepare("SELECT COUNT(*) AS count FROM members WHERE family_id = ? AND role = 'admin'").bind(s.familyId).first<{ count: number }>();
        if (Number(count?.count) <= 1) return json({ error: 'Der letzte Administrator kann nicht gelöscht werden.' }, 400);
      }
      await db.batch([
        db.prepare('UPDATE todos SET assigned_member_id = NULL WHERE assigned_member_id = ?').bind(target.id),
        db.prepare('UPDATE events SET member_id = NULL WHERE member_id = ? AND family_id = ?').bind(target.id, s.familyId),
        db.prepare('UPDATE chores SET assigned_member_id = NULL WHERE assigned_member_id = ? AND family_id = ?').bind(target.id, s.familyId),
        db.prepare('DELETE FROM members WHERE id = ? AND family_id = ?').bind(target.id, s.familyId),
      ]);
    }
    else if (action === 'create-recipe') await db.prepare('INSERT INTO recipes (id, family_id, title, source_url, image_url, duration, servings, ingredients) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id('recipe'), s.familyId, text('title'), text('sourceUrl') || null, text('imageUrl') || null, Number(body.duration) || null, Number(body.servings) || 4, text('ingredients') || '[]').run();
    else if (action === 'recipe-to-shopping') {
      const recipe = await db.prepare('SELECT id, ingredients FROM recipes WHERE id = ? AND family_id = ?').bind(text('id'), s.familyId).first<{ id: string; ingredients: string }>();
      if (recipe) {
        const ingredients = JSON.parse(recipe.ingredients) as string[];
        await db.batch(ingredients.map((name) => db.prepare('INSERT INTO shopping_items (id, family_id, name, category, checked, recipe_id) VALUES (?, ?, ?, ?, false, ?)').bind(id('shop'), s.familyId, name, 'Aus Rezept', recipe.id)));
      }
    }
    else if (action === 'import-recipe') {
      const url = new URL(text('url'));
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Ungültige URL');
      const response = await fetch(url, { headers: { 'User-Agent': 'Familio Recipe Importer/1.0' } });
      const html = await response.text();
      const match = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (!match) throw new Error('Kein Rezept auf dieser Seite gefunden.');
      const raw = JSON.parse(match[1]);
      const items = Array.isArray(raw) ? raw : raw['@graph'] ?? [raw];
      const recipe = items.find((item: Record<string, unknown>) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));
      if (!recipe) throw new Error('Kein Rezept auf dieser Seite gefunden.');
      const image = Array.isArray(recipe.image) ? recipe.image[0] : typeof recipe.image === 'object' ? recipe.image?.url : recipe.image;
      await db.prepare('INSERT INTO recipes (id, family_id, title, source_url, image_url, servings, ingredients) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id('recipe'), s.familyId, String(recipe.name ?? url.hostname), url.toString(), image ?? null, Number(String(recipe.recipeYield ?? '4').match(/\d+/)?.[0] ?? 4), JSON.stringify(recipe.recipeIngredient ?? [])).run();
    } else return json({ error: 'Unbekannte Aktion' }, 400);
    return json(await loadAll(s));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Aktion fehlgeschlagen' }, 400);
  }
}
