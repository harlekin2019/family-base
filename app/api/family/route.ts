import { env } from 'cloudflare:workers';
import { extendedCatalog } from '@/lib/product-catalog';

type Session = { familyId: string; memberId: string; role: string; name: string };
const json = (data: unknown, status = 200) => Response.json(data, { status });
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const minutes = (value: unknown) => { const text = String(value ?? ''); const hours = Number(text.match(/(\d+)H/)?.[1] ?? 0); const mins = Number(text.match(/(\d+)M/)?.[1] ?? 0); return hours * 60 + mins || null; };
const recipeImage = (value: unknown, pageUrl: URL, html: string): string | null => {
  const candidates: string[] = [];
  const collect = (entry: unknown) => { if (typeof entry === 'string') candidates.push(entry); else if (Array.isArray(entry)) entry.forEach(collect); else if (entry && typeof entry === 'object') { const row = entry as Record<string, unknown>; collect(row.url); collect(row.contentUrl); collect(row.thumbnailUrl); } };
  collect(value);
  const meta = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
  if (meta?.[1]) candidates.push(meta[1]);
  for (const candidate of candidates) { try { return new URL(candidate.replaceAll('&amp;', '&'), pageUrl).toString(); } catch { /* try next candidate */ } }
  return null;
};
const recipeSteps = (value: unknown): string[] => { if (!Array.isArray(value)) return []; return value.flatMap((step) => { if (typeof step === 'string') return [step]; if (!step || typeof step !== 'object') return []; const row = step as Record<string, unknown>; if (Array.isArray(row.itemListElement)) return recipeSteps(row.itemListElement); return row.text ? [String(row.text)] : []; }).filter(Boolean); };
const catalogSeed = `Äpfel|Obst & Gemüse|1 kg;Bananen|Obst & Gemüse|1 kg;Orangen|Obst & Gemüse|1 kg;Zitronen|Obst & Gemüse|2 Stück;Tomaten|Obst & Gemüse|500 g;Gurke|Obst & Gemüse|1 Stück;Paprika|Obst & Gemüse|3 Stück;Karotten|Obst & Gemüse|1 kg;Kartoffeln|Obst & Gemüse|2,5 kg;Zwiebeln|Obst & Gemüse|1 kg;Knoblauch|Obst & Gemüse|1 Knolle;Salat|Obst & Gemüse|1 Kopf;Brokkoli|Obst & Gemüse|1 Stück;Champignons|Obst & Gemüse|400 g;Milch|Molkerei & Kühlung|1 l;Haferdrink|Molkerei & Kühlung|1 l;Butter|Molkerei & Kühlung|250 g;Naturjoghurt|Molkerei & Kühlung|500 g;Quark|Molkerei & Kühlung|500 g;Sahne|Molkerei & Kühlung|200 ml;Eier|Molkerei & Kühlung|10 Stück;Gouda|Molkerei & Kühlung|250 g;Mozzarella|Molkerei & Kühlung|125 g;Frischkäse|Molkerei & Kühlung|200 g;Brot|Backwaren|1 Stück;Brötchen|Backwaren|6 Stück;Toastbrot|Backwaren|1 Packung;Mehl|Backen|1 kg;Zucker|Backen|1 kg;Backpulver|Backen|1 Packung;Nudeln|Vorrat|500 g;Reis|Vorrat|1 kg;Haferflocken|Vorrat|500 g;Müsli|Vorrat|500 g;Passierte Tomaten|Vorrat|500 ml;Mais|Vorrat|1 Dose;Kidneybohnen|Vorrat|1 Dose;Kichererbsen|Vorrat|1 Dose;Olivenöl|Vorrat|500 ml;Salz|Gewürze|500 g;Pfeffer|Gewürze|1 Packung;Mineralwasser|Getränke|6 × 1,5 l;Apfelsaft|Getränke|1 l;Kaffee|Getränke|500 g;Tee|Getränke|1 Packung;Hackfleisch|Fleisch & Fisch|500 g;Hähnchenbrust|Fleisch & Fisch|500 g;Lachsfilet|Fleisch & Fisch|400 g;Tiefkühlgemüse|Tiefkühlkost|750 g;Pizza|Tiefkühlkost|1 Packung;Pommes|Tiefkühlkost|1 kg;Toilettenpapier|Haushalt|8 Rollen;Küchenrolle|Haushalt|4 Rollen;Spülmittel|Haushalt|1 Flasche;Spülmaschinentabs|Haushalt|1 Packung;Waschmittel|Haushalt|1 Packung;Müllbeutel|Haushalt|1 Rolle;Allzweckreiniger|Haushalt|1 Flasche;Zahnpasta|Drogerie|1 Tube;Duschgel|Drogerie|1 Flasche;Shampoo|Drogerie|1 Flasche;Seife|Drogerie|1 Packung;Taschentücher|Drogerie|1 Packung;Windeln|Baby|1 Packung;Katzenfutter|Tierbedarf|1 Packung;Hundefutter|Tierbedarf|1 Packung`.split(';').map((row) => row.split('|'));

async function ensureCatalog() {
  const products = [...catalogSeed, ...extendedCatalog];
  const expectedCount = new Set(products.map(([name]) => name.toLocaleLowerCase('de-DE'))).size;
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM product_catalog').first<{ count: number }>();
  if (Number(count?.count) >= expectedCount) return;
  for (let offset = 0; offset < products.length; offset += 75) {
    await env.DB.batch(products.slice(offset, offset + 75).map(([name, category, quantity], index) => env.DB.prepare('INSERT OR IGNORE INTO product_catalog (id, name, category, default_quantity) VALUES (?, ?, ?, ?)').bind(`product_${offset + index + 1}`, name, category, quantity)));
  }
}

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
  await ensureCatalog();
  const [members, recipes, shopping, projects, todos, events, chores, catalog] = await Promise.all([
    db.prepare('SELECT * FROM members WHERE family_id = ? ORDER BY name').bind(s.familyId).all(),
    db.prepare('SELECT * FROM recipes WHERE family_id = ? ORDER BY title').bind(s.familyId).all(),
    db.prepare('SELECT * FROM shopping_items WHERE family_id = ? ORDER BY checked, rowid DESC').bind(s.familyId).all(),
    db.prepare('SELECT * FROM projects WHERE family_id = ? ORDER BY name').bind(s.familyId).all(),
    db.prepare('SELECT t.* FROM todos t JOIN projects p ON p.id=t.project_id WHERE p.family_id = ? ORDER BY t.completed, t.due_at').bind(s.familyId).all(),
    db.prepare('SELECT * FROM events WHERE family_id = ? ORDER BY starts_at').bind(s.familyId).all(),
    db.prepare('SELECT * FROM chores WHERE family_id = ? ORDER BY completed_at IS NOT NULL, due_at').bind(s.familyId).all(),
    db.prepare('SELECT * FROM product_catalog ORDER BY category, name').all(),
  ]);
  return { session: s, members: members.results, recipes: recipes.results, shopping: shopping.results, projects: projects.results, todos: todos.results, events: events.results, chores: chores.results, catalog: catalog.results };
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
    else if (action === 'create-event') await db.prepare('INSERT INTO events (id, family_id, title, starts_at, ends_at, member_id, is_shared, all_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id('event'), s.familyId, text('title'), Number(body.startsAt), Number(body.endsAt) || null, text('memberId') || null, body.isShared ? 1 : 0, body.allDay ? 1 : 0).run();
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
    else if (action === 'create-recipe') await db.prepare('INSERT INTO recipes (id, family_id, title, source_url, image_url, description, duration, prep_time, cook_time, servings, ingredients, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id('recipe'), s.familyId, text('title'), text('sourceUrl') || null, text('imageUrl') || null, text('description') || null, Number(body.duration) || null, Number(body.prepTime) || null, Number(body.cookTime) || null, Number(body.servings) || 4, text('ingredients') || '[]', text('instructions') || '[]').run();
    else if (action === 'recipe-to-shopping') {
      const recipe = await db.prepare('SELECT id, ingredients FROM recipes WHERE id = ? AND family_id = ?').bind(text('id'), s.familyId).first<{ id: string; ingredients: string }>();
      if (recipe) {
        const ingredients = JSON.parse(recipe.ingredients) as string[];
        await db.batch(ingredients.map((name) => db.prepare('INSERT INTO shopping_items (id, family_id, name, category, checked, recipe_id) VALUES (?, ?, ?, ?, false, ?)').bind(id('shop'), s.familyId, name, 'Aus Rezept', recipe.id)));
      }
    }
    else if (action === 'ingredients-to-shopping') {
      const recipe = await db.prepare('SELECT ingredients FROM recipes WHERE id = ? AND family_id = ?').bind(text('id'), s.familyId).first<{ ingredients: string }>();
      const allowed = recipe ? JSON.parse(recipe.ingredients) as string[] : [];
      const requested = Array.isArray(body.ingredients) ? body.ingredients.map(String).filter((item) => allowed.includes(item)) : [];
      if (!requested.length) return json({ error: 'Bitte mindestens eine Zutat auswählen.' }, 400);
      await db.batch(requested.map((name) => db.prepare('INSERT INTO shopping_items (id, family_id, name, category, checked, recipe_id) VALUES (?, ?, ?, ?, false, ?)').bind(id('shop'), s.familyId, name, 'Aus Rezept', text('id'))));
    }
    else if (action === 'delete-recipe') {
      const recipeId = text('id');
      const recipe = await db.prepare('SELECT id FROM recipes WHERE id = ? AND family_id = ?').bind(recipeId, s.familyId).first();
      if (!recipe) return json({ error: 'Rezept nicht gefunden.' }, 404);
      await db.batch([
        db.prepare('UPDATE shopping_items SET recipe_id = NULL WHERE recipe_id = ? AND family_id = ?').bind(recipeId, s.familyId),
        db.prepare('DELETE FROM recipes WHERE id = ? AND family_id = ?').bind(recipeId, s.familyId),
      ]);
    }
    else if (action === 'import-recipe') {
      const url = new URL(text('url'));
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Ungültige URL');
      const response = await fetch(url, { headers: { 'User-Agent': 'Familio Recipe Importer/1.0' } });
      const html = await response.text();
      const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      if (!matches.length) throw new Error('Kein Rezept auf dieser Seite gefunden.');
      const items: Record<string, unknown>[] = [];
      for (const match of matches) { try { const raw = JSON.parse(match[1]); const rows = Array.isArray(raw) ? raw : raw['@graph'] ?? [raw]; if (Array.isArray(rows)) items.push(...rows); } catch { /* ignore unrelated invalid JSON-LD */ } }
      const recipe = items.find((item: Record<string, unknown>) => item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe')));
      if (!recipe) throw new Error('Kein Rezept auf dieser Seite gefunden.');
      const prepTime = minutes(recipe.prepTime); const cookTime = minutes(recipe.cookTime); const totalTime = minutes(recipe.totalTime) ?? ((prepTime ?? 0) + (cookTime ?? 0) || null);
      const values = [String(recipe.name ?? url.hostname), recipeImage(recipe.image, url, html), String(recipe.description ?? '') || null, totalTime, prepTime, cookTime, Number(String(recipe.recipeYield ?? '4').match(/\d+/)?.[0] ?? 4), JSON.stringify(recipe.recipeIngredient ?? []), JSON.stringify(recipeSteps(recipe.recipeInstructions))] as const;
      const existing = await db.prepare('SELECT id FROM recipes WHERE family_id = ? AND source_url = ?').bind(s.familyId, url.toString()).first<{ id: string }>();
      if (existing) await db.prepare('UPDATE recipes SET title = ?, image_url = ?, description = ?, duration = ?, prep_time = ?, cook_time = ?, servings = ?, ingredients = ?, instructions = ? WHERE id = ? AND family_id = ?').bind(...values, existing.id, s.familyId).run();
      else await db.prepare('INSERT INTO recipes (id, family_id, title, source_url, image_url, description, duration, prep_time, cook_time, servings, ingredients, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id('recipe'), s.familyId, values[0], url.toString(), ...values.slice(1)).run();
    } else return json({ error: 'Unbekannte Aktion' }, 400);
    return json(await loadAll(s));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Aktion fehlgeschlagen' }, 400);
  }
}
