'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CookingPot,
  FolderKanban,
  Link2,
  LoaderCircle,
  Pencil,
  Plus,
  ShoppingBasket,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';

type Row = Record<string, string | number | boolean | null>;
export type FamilyData = {
  session: Row;
  members: Row[];
  recipes: Row[];
  shopping: Row[];
  projects: Row[];
  todos: Row[];
  events: Row[];
  chores: Row[];
  catalog: Row[];
};
const empty: FamilyData = {
  session: {},
  members: [],
  recipes: [],
  shopping: [],
  projects: [],
  todos: [],
  events: [],
  chores: [],
  catalog: [],
};
const field = (form: FormData, key: string) =>
  String(form.get(key) ?? '').trim();
const unix = (value: string) =>
  value ? Math.floor(new Date(value).getTime() / 1000) : 0;
const dateText = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(Number(value) * 1000))
    : 'Ohne Termin';

const cleaningCatalog = [
  { room: 'Küche', tasks: ['Arbeitsflächen abwischen', 'Spüle und Armaturen reinigen', 'Herd und Kochfeld reinigen', 'Backofen reinigen', 'Mikrowelle reinigen', 'Kühlschrank auswischen', 'Geschirrspüler reinigen', 'Schränke außen abwischen', 'Dunstabzugshaube reinigen', 'Mülleimer leeren und auswischen', 'Boden saugen', 'Boden wischen'] },
  { room: 'Badezimmer', tasks: ['Waschbecken reinigen', 'Toilette reinigen', 'Dusche reinigen', 'Badewanne reinigen', 'Armaturen entkalken', 'Spiegel putzen', 'Fliesen abwischen', 'Abfluss reinigen', 'Handtücher wechseln', 'Badvorleger wechseln', 'Mülleimer leeren', 'Boden saugen', 'Boden wischen'] },
  { room: 'Gäste-WC', tasks: ['Waschbecken reinigen', 'Toilette reinigen', 'Armaturen entkalken', 'Spiegel putzen', 'Handtücher wechseln', 'Seife auffüllen', 'Mülleimer leeren', 'Boden wischen'] },
  { room: 'Wohnzimmer', tasks: ['Staub wischen', 'Möbel abwischen', 'Sofa absaugen', 'Kissen und Decken ordnen', 'Regale reinigen', 'Fernseher entstauben', 'Pflanzen pflegen', 'Boden saugen', 'Boden wischen', 'Fenster putzen'] },
  { room: 'Schlafzimmer', tasks: ['Bett machen', 'Bettwäsche wechseln', 'Matratze absaugen', 'Nachttische abwischen', 'Schränke abstauben', 'Kleidung wegräumen', 'Boden saugen', 'Boden wischen', 'Fenster putzen'] },
  { room: 'Kinderzimmer', tasks: ['Spielzeug aufräumen', 'Schreibtisch aufräumen', 'Oberflächen abwischen', 'Regale entstauben', 'Bettwäsche wechseln', 'Kleidung wegräumen', 'Boden saugen', 'Boden wischen', 'Fenster putzen'] },
  { room: 'Arbeitszimmer', tasks: ['Schreibtisch aufräumen', 'Schreibtisch abwischen', 'Bildschirme reinigen', 'Tastatur reinigen', 'Regale entstauben', 'Papierkorb leeren', 'Boden saugen', 'Boden wischen'] },
  { room: 'Flur & Treppenhaus', tasks: ['Garderobe aufräumen', 'Schuhe ordnen', 'Geländer abwischen', 'Lichtschalter reinigen', 'Fußmatte ausschütteln', 'Boden saugen', 'Boden wischen', 'Treppe reinigen'] },
  { room: 'Esszimmer', tasks: ['Esstisch abwischen', 'Stühle reinigen', 'Oberflächen entstauben', 'Boden saugen', 'Boden wischen', 'Fenster putzen'] },
  { room: 'Hauswirtschaftsraum', tasks: ['Wäsche sortieren', 'Waschmaschine reinigen', 'Trockner reinigen', 'Flusensieb säubern', 'Regale aufräumen', 'Vorräte prüfen', 'Boden saugen', 'Boden wischen'] },
  { room: 'Keller', tasks: ['Aufräumen', 'Regale entstauben', 'Spinnweben entfernen', 'Vorräte prüfen', 'Boden fegen', 'Boden wischen', 'Fenster putzen'] },
  { room: 'Garage', tasks: ['Aufräumen', 'Werkzeug sortieren', 'Regale abwischen', 'Müll entsorgen', 'Boden fegen', 'Garagentor reinigen'] },
  { room: 'Balkon & Terrasse', tasks: ['Möbel abwischen', 'Geländer reinigen', 'Pflanzen pflegen', 'Laub entfernen', 'Boden fegen', 'Boden wischen', 'Grill reinigen'] },
  { room: 'Garten', tasks: ['Rasen mähen', 'Beete jäten', 'Pflanzen gießen', 'Hecke schneiden', 'Laub harken', 'Gartenmöbel reinigen', 'Müll einsammeln'] },
  { room: 'Gesamtes Zuhause', tasks: ['Alle Räume lüften', 'Staub wischen', 'Türgriffe reinigen', 'Lichtschalter reinigen', 'Heizkörper entstauben', 'Sockelleisten reinigen', 'Spinnweben entfernen', 'Fenster putzen', 'Staubsaugen', 'Böden wischen', 'Mülleimer leeren', 'Putzmittel auffüllen'] },
] as const;

export function WorkspaceModule({
  active,
  onDataChange,
}: {
  active: string;
  onDataChange?: (data: FamilyData) => void;
}) {
  const [data, setData] = useState<FamilyData>(empty);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState('');
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/family');
      const result = (await response.json()) as FamilyData & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setData(result);
      onDataChange?.(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Daten konnten nicht geladen werden.',
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as FamilyData & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setData(result);
      onDataChange?.(result);
      setModal('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };
  const submit =
    (action: string, mapper?: (form: FormData) => Record<string, unknown>) =>
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void act({
        action,
        ...(mapper ? mapper(form) : Object.fromEntries(form)),
      });
    };
  const props = { data, act, submit, modal, setModal };
  return (
    <section className="workspace">
      <div className="workspace-heading">
        <div>
          <p>FAMILIENBEREICH</p>
          <h2>{active}</h2>
        </div>
        {busy && <LoaderCircle className="spin" />}
      </div>
      {error && (
        <div className="error-box">
          {error}
          <button onClick={refresh}>Erneut versuchen</button>
        </div>
      )}
      {active === 'Kalender' && <CalendarView {...props} />}
      {active === 'Einkaufsliste' && <ShoppingView {...props} />}
      {active === 'Rezepte' && <RecipeView {...props} />}
      {active === 'Aufgaben' && <TodoView {...props} />}
      {active === 'Putzplan' && <ChoreView {...props} />}
      {active === 'Administration' && <AdminView {...props} />}
    </section>
  );
}

type ViewProps = {
  data: FamilyData;
  act: (payload: Record<string, unknown>) => Promise<void>;
  submit: (
    action: string,
    mapper?: (form: FormData) => Record<string, unknown>,
  ) => (event: React.FormEvent<HTMLFormElement>) => void;
  modal: string;
  setModal: (value: string) => void;
};
const MemberSelect = ({
  members,
  name = 'memberId',
}: {
  members: Row[];
  name?: string;
}) => (
  <select name={name} className="control">
    <option value="">Gemeinsam / nicht zugeordnet</option>
    {members.map((m) => (
      <option key={String(m.id)} value={String(m.id)}>
        {String(m.name)}
      </option>
    ))}
  </select>
);

function CalendarView({ data, act, submit, modal, setModal }: ViewProps) {
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');
  const [cursor, setCursor] = useState(() => new Date());
  const [allDay, setAllDay] = useState(false);
  const days = useMemo(() => {
    const selected = new Date(cursor);
    selected.setHours(0, 0, 0, 0);
    if (calendarView === 'day') return [selected];
    if (calendarView === 'week') {
      const monday = new Date(selected);
      monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return day;
      });
    }
    const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [calendarView, cursor]);
  const monthLabel = cursor.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const moveCalendar = (direction: -1 | 1) => {
    setCursor((current) => {
      const next = new Date(current);
      if (calendarView === 'day') next.setDate(next.getDate() + direction);
      if (calendarView === 'week') next.setDate(next.getDate() + direction * 7);
      if (calendarView === 'month') next.setMonth(next.getMonth() + direction);
      return next;
    });
  };
  return (
    <>
      <div className="calendar-controls">
        <div className="calendar-navigation">
          <button onClick={() => moveCalendar(-1)} aria-label="Vorheriger Zeitraum"><ChevronLeft /></button>
          <button onClick={() => setCursor(new Date())}>Heute</button>
          <button onClick={() => moveCalendar(1)} aria-label="Nächster Zeitraum"><ChevronRight /></button>
          <h3>{monthLabel}</h3>
        </div>
        <div className="calendar-view-switch" aria-label="Kalenderansicht">
          {([['day', 'Tag'], ['week', 'Woche'], ['month', 'Monat']] as const).map(([value, label]) => (
            <button key={value} className={calendarView === value ? 'active' : ''} onClick={() => setCalendarView(value)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="module-toolbar">
        <div className="filter-pills">
          <button className="active">Alle Kalender</button>
          {data.members.map((m) => (
            <button key={String(m.id)}>
              <i style={{ background: String(m.color) }} />
              {String(m.name)}
            </button>
          ))}
        </div>
        <Button onClick={() => setModal('event')}>
          <Plus /> Termin
        </Button>
      </div>
      <div className={`week-grid calendar-${calendarView}`}>
        {days.map((day) => (
          <article key={day.toISOString()} className={calendarView === 'month' && day.getMonth() !== cursor.getMonth() ? 'outside-month' : ''}>
            <header>
              <span>
                {day.toLocaleDateString('de-DE', { weekday: 'short' })}
              </span>
              <strong>{day.getDate()}</strong>
            </header>
            {data.events
              .filter(
                (e) =>
                  new Date(Number(e.starts_at) * 1000).toDateString() ===
                  day.toDateString(),
              )
              .map((event) => (
                <div className="calendar-event" key={String(event.id)}>
                  <b>
                    {event.all_day
                      ? 'Ganztägig'
                      : new Date(
                          Number(event.starts_at) * 1000,
                        ).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                  </b>
                  <span>{String(event.title)}</span>
                  <small>
                    {event.is_shared
                      ? 'Gemeinsam'
                      : ((data.members.find((m) => m.id === event.member_id)
                          ?.name as string) ?? 'Privat')}
                  </small>
                </div>
              ))}
          </article>
        ))}
      </div>
      {modal === 'event' && (
        <Modal title="Neuer Termin" close={() => setModal('')}>
          <form
            onSubmit={submit('create-event', (f) => ({
              title: field(f, 'title'),
              startsAt: unix(field(f, 'startsAt')),
              endsAt: unix(field(f, 'endsAt')),
              memberId: field(f, 'memberId'),
              isShared: f.get('isShared') === 'on',
              allDay: f.get('allDay') === 'on',
            }))}
          >
            <Input name="title" placeholder="Titel" required />
            <label className="checkline all-day-toggle">
              <input type="checkbox" name="allDay" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> Ganztägiger Termin
            </label>
            <div className="form-row">
              <label className="field-label"><span>{allDay ? 'Startdatum' : 'Beginn'}</span><Input name="startsAt" type={allDay ? 'date' : 'datetime-local'} required /></label>
              <label className="field-label"><span>{allDay ? 'Enddatum' : 'Ende'}</span><Input name="endsAt" type={allDay ? 'date' : 'datetime-local'} /></label>
            </div>
            <MemberSelect members={data.members} />
            <label className="checkline">
              <input type="checkbox" name="isShared" /> Gilt für die ganze
              Familie
            </label>
            <Button type="submit">Termin speichern</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function ShoppingView({ data, act, submit }: ViewProps) {
  const categories = [
    ...new Set(data.shopping.map((i) => String(i.category ?? 'Sonstiges'))),
  ];
  return (
    <>
      <form
        className="quick-form"
        onSubmit={submit('create-shopping', (form) => {
          const name = field(form, 'name');
          const product = data.catalog.find(
            (item) => String(item.name).toLowerCase() === name.toLowerCase(),
          );
          return {
            name,
            quantity:
              field(form, 'quantity') || product?.default_quantity || '',
            category:
              field(form, 'category') || product?.category || 'Sonstiges',
          };
        })}
      >
        <ShoppingBasket />
        <span>
          <Input
            name="name"
            list="product-catalog"
            placeholder="Artikel suchen oder eingeben …"
            required
          />
          <datalist id="product-catalog">
            {data.catalog.map((item) => (
              <option key={String(item.id)} value={String(item.name)}>
                {String(item.category)}
              </option>
            ))}
          </datalist>
          <small>{data.catalog.length} voreingestellte Artikel</small>
        </span>
        <Input name="quantity" placeholder="Menge (optional)" />
        <select name="category" className="control" defaultValue="">
          <option value="">Kategorie automatisch</option>
          {[...new Set(data.catalog.map((item) => String(item.category)))].map(
            (category) => (
              <option key={category}>{category}</option>
            ),
          )}
        </select>
        <Button type="submit">
          <Plus /> Hinzufügen
        </Button>
      </form>
      <div className="category-grid">
        {categories.length ? (
          categories.map((category) => (
            <article className="list-card" key={category}>
              <h3>{category}</h3>
              {data.shopping
                .filter((i) => String(i.category ?? 'Sonstiges') === category)
                .map((item) => (
                  <button
                    className={item.checked ? 'checked' : ''}
                    key={String(item.id)}
                    onClick={() =>
                      act({ action: 'toggle-shopping', id: item.id })
                    }
                  >
                    <span className="task-check">
                      {item.checked && <Check />}
                    </span>
                    <span>
                      <b>{String(item.name)}</b>
                      <small>{String(item.quantity ?? '')}</small>
                    </span>
                  </button>
                ))}
            </article>
          ))
        ) : (
          <Empty icon={<ShoppingBasket />} text="Die Einkaufsliste ist leer." />
        )}
      </div>
    </>
  );
}

function RecipeView({ data, act, submit, modal, setModal }: ViewProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Row | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const openRecipe = (recipe: Row) => {
    setSelectedRecipe(recipe);
    setSelectedIngredients(safeIngredients(recipe.ingredients));
  };
  const removeRecipe = (recipe: Row, after?: () => void) => {
    if (window.confirm(`„${String(recipe.title)}“ wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`)) {
      void act({ action: 'delete-recipe', id: recipe.id }).then(after);
    }
  };
  if (selectedRecipe) {
    const ingredients = safeIngredients(selectedRecipe.ingredients);
    const steps = safeInstructions(selectedRecipe.instructions);
    return (
      <section className="recipe-detail">
        <div className="recipe-detail-actions">
          <Button variant="ghost" onClick={() => setSelectedRecipe(null)}>
            <ArrowLeft /> Zur Rezeptübersicht
          </Button>
          <Button variant="destructive" onClick={() => removeRecipe(selectedRecipe, () => setSelectedRecipe(null))}>
            <Trash2 /> Rezept löschen
          </Button>
        </div>
        <div className="recipe-hero">
          <div>
            <Badge>{Number(selectedRecipe.servings)} Portionen</Badge>
            <h2>{String(selectedRecipe.title)}</h2>
            {selectedRecipe.description && (
              <p>{String(selectedRecipe.description)}</p>
            )}
            <div className="recipe-times">
              <span>
                <Clock /> Gesamt {Number(selectedRecipe.duration) || '–'} Min.
              </span>
              <span>
                Vorbereitung {Number(selectedRecipe.prep_time) || '–'} Min.
              </span>
              <span>
                Kochzeit {Number(selectedRecipe.cook_time) || '–'} Min.
              </span>
            </div>
          </div>
          {selectedRecipe.image_url ? (
            <img
              src={String(selectedRecipe.image_url)}
              alt={String(selectedRecipe.title)}
            />
          ) : (
            <div className="recipe-hero-placeholder">
              <CookingPot />
              <span>Kein Rezeptbild verfügbar</span>
            </div>
          )}
        </div>
        <div className="recipe-detail-grid">
          <aside className="ingredient-panel">
            <h3>Zutaten</h3>
            <p>
              {selectedIngredients.length} von {ingredients.length} ausgewählt
            </p>
            {ingredients.map((ingredient) => (
              <label key={ingredient}>
                <input
                  type="checkbox"
                  checked={selectedIngredients.includes(ingredient)}
                  onChange={() =>
                    setSelectedIngredients((current) =>
                      current.includes(ingredient)
                        ? current.filter((item) => item !== ingredient)
                        : [...current, ingredient],
                    )
                  }
                />
                <span>{ingredient}</span>
              </label>
            ))}
            <Button
              onClick={() =>
                act({
                  action: 'ingredients-to-shopping',
                  id: selectedRecipe.id,
                  ingredients: selectedIngredients,
                })
              }
            >
              <ShoppingBasket /> Ausgewählte hinzufügen
            </Button>
          </aside>
          <section className="instruction-panel">
            <h3>Zubereitung</h3>
            {steps.length ? (
              steps.map((step, index) => (
                <article key={`${index}-${step.slice(0, 20)}`}>
                  <strong>Schritt {index + 1}</strong>
                  <p>{step}</p>
                </article>
              ))
            ) : (
              <Empty
                icon={<CookingPot />}
                text="Für dieses ältere Rezept wurden noch keine Zubereitungsschritte gespeichert."
              />
            )}
          </section>
        </div>
      </section>
    );
  }
  return (
    <>
      <div className="module-toolbar">
        <form
          className="url-import"
          onSubmit={submit('import-recipe', (f) => ({ url: field(f, 'url') }))}
        >
          <Link2 />
          <Input
            name="url"
            type="url"
            placeholder="Rezept-URL, z. B. von Chefkoch"
            required
          />
          <Button type="submit">Importieren</Button>
        </form>
        <Button variant="outline" onClick={() => setModal('recipe')}>
          <Plus /> Manuell
        </Button>
      </div>
      <div className="recipe-grid">
        {data.recipes.map((recipe) => (
          <article
            className="recipe-card clickable"
            key={String(recipe.id)}
            tabIndex={0}
            onClick={() => openRecipe(recipe)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') openRecipe(recipe);
            }}
          >
            {recipe.image_url ? (
              <img src={String(recipe.image_url)} alt={String(recipe.title)} />
            ) : (
              <div className="recipe-placeholder">
                <CookingPot />
                <span>Bild fehlt</span>
              </div>
            )}
            <div>
              <Badge>{Number(recipe.servings)} Portionen</Badge>
              <h3>{String(recipe.title)}</h3>
              <p>
                {String(recipe.description ?? '') ||
                  safeIngredients(recipe.ingredients).slice(0, 3).join(' · ') ||
                  'Eigenes Familienrezept'}
              </p>
              <div className="recipe-card-actions">
                <Button
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    void act({ action: 'recipe-to-shopping', id: recipe.id });
                  }}
                >
                  <ShoppingBasket /> Auf Einkaufsliste
                </Button>
                <Button variant="destructive" size="icon" aria-label={`${String(recipe.title)} löschen`} onClick={(event) => { event.stopPropagation(); removeRecipe(recipe); }}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          </article>
        ))}
        {!data.recipes.length && (
          <Empty
            icon={<CookingPot />}
            text="Importiere das erste Rezept per URL oder lege es manuell an."
          />
        )}
      </div>
      {modal === 'recipe' && (
        <Modal title="Rezept anlegen" close={() => setModal('')}>
          <form
            onSubmit={submit('create-recipe', (f) => {
              const prep = Number(field(f, 'prepTime')) || 0;
              const cook = Number(field(f, 'cookTime')) || 0;
              return {
                title: field(f, 'title'),
                imageUrl: field(f, 'imageUrl'),
                description: field(f, 'description'),
                servings: Number(field(f, 'servings')),
                prepTime: prep,
                cookTime: cook,
                duration: prep + cook,
                ingredients: JSON.stringify(
                  field(f, 'ingredients').split('\n').filter(Boolean),
                ),
                instructions: JSON.stringify(
                  field(f, 'instructions').split('\n').filter(Boolean),
                ),
              };
            })}
          >
            <Input name="title" placeholder="Rezeptname" required />
            <Input
              name="imageUrl"
              type="url"
              placeholder="URL zum Rezeptbild"
            />
            <textarea
              name="description"
              className="control"
              placeholder="Kurze Beschreibung"
            />
            <div className="form-row">
              <Input name="servings" type="number" min="1" defaultValue="4" />
              <Input
                name="prepTime"
                type="number"
                min="0"
                placeholder="Vorbereitung (Min.)"
              />
              <Input
                name="cookTime"
                type="number"
                min="0"
                placeholder="Kochzeit (Min.)"
              />
            </div>
            <textarea
              name="ingredients"
              className="control textarea"
              placeholder={
                'Eine Zutat pro Zeile\n500 g Tomaten\n1 Bund Basilikum'
              }
              required
            />
            <textarea
              name="instructions"
              className="control textarea"
              placeholder={
                'Ein Schritt pro Zeile\nTomaten schneiden\nAlles 20 Minuten köcheln'
              }
              required
            />
            <Button type="submit">Rezept speichern</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function TodoView({ data, act, submit, modal, setModal }: ViewProps) {
  return (
    <>
      <div className="module-toolbar">
        <p className="module-copy">
          Organisiert Aufgaben in Projekten wie Urlaub, Renovierung oder Schule.
        </p>
        <Button onClick={() => setModal('project')}>
          <Plus /> Projekt
        </Button>
      </div>
      <div className="project-grid">
        {data.projects.map((project) => (
          <article className="project-card" key={String(project.id)}>
            <header>
              <span>{String(project.icon ?? '📌')}</span>
              <div>
                <h3>{String(project.name)}</h3>
                <small>
                  {
                    data.todos.filter(
                      (t) => t.project_id === project.id && !t.completed,
                    ).length
                  }{' '}
                  offen
                </small>
              </div>
            </header>
            <form
              className="inline-task"
              onSubmit={submit('create-todo', (f) => ({
                projectId: project.id,
                title: field(f, 'title'),
                memberId: field(f, 'memberId'),
                dueAt: unix(field(f, 'dueAt')),
              }))}
            >
              <Input name="title" placeholder="Neue Aufgabe" required />
              <MemberSelect members={data.members} />
              <Input name="dueAt" type="date" />
              <Button size="icon" type="submit">
                <Plus />
              </Button>
            </form>
            {data.todos
              .filter((t) => t.project_id === project.id)
              .map((todo) => (
                <button
                  className={`todo-row ${todo.completed ? 'checked' : ''}`}
                  key={String(todo.id)}
                  onClick={() => act({ action: 'toggle-todo', id: todo.id })}
                >
                  <span className="task-check">
                    {todo.completed && <Check />}
                  </span>
                  <span>
                    <b>{String(todo.title)}</b>
                    <small>
                      {(data.members.find(
                        (m) => m.id === todo.assigned_member_id,
                      )?.name as string) ?? 'Nicht zugeordnet'}{' '}
                      · {dateText(todo.due_at)}
                    </small>
                  </span>
                </button>
              ))}
          </article>
        ))}
        {!data.projects.length && (
          <Empty icon={<FolderKanban />} text="Lege dein erstes Projekt an." />
        )}
      </div>
      {modal === 'project' && (
        <Modal title="Neues Projekt" close={() => setModal('')}>
          <form onSubmit={submit('create-project')}>
            <Input
              name="name"
              placeholder="Projektname, z. B. Sommerurlaub"
              required
            />
            <Input name="icon" placeholder="Icon, z. B. 🏖️" />
            <Button type="submit">Projekt anlegen</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function ChoreView({ data, act, submit, modal, setModal }: ViewProps) {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const selectedRoomEntry = cleaningCatalog.find((entry) => entry.room === selectedRoom);
  const suggestedTitle = selectedRoom && selectedTask ? `${selectedRoom} – ${selectedTask}` : '';
  return (
    <>
      <div className="module-toolbar">
        <p className="module-copy">
          Erledigte Aufgaben schreiben die Punkte sofort dem zugeordneten
          Mitglied gut.
        </p>
        <Button onClick={() => setModal('chore')}>
          <Plus /> Aufgabe
        </Button>
      </div>
      <div className="chore-board">
        <section>
          <h3>Offen</h3>
          {data.chores
            .filter((c) => !c.completed_at)
            .map((chore) => (
              <article className="chore-item" key={String(chore.id)}>
                <div className="chore-icon">
                  <ClipboardCheck />
                </div>
                <div>
                  <b>{String(chore.title)}</b>
                  <small>
                    {(data.members.find(
                      (m) => m.id === chore.assigned_member_id,
                    )?.name as string) ?? 'Nicht zugeordnet'}{' '}
                    · {dateText(chore.due_at)}
                  </small>
                </div>
                <Badge>+{Number(chore.points)} P</Badge>
                <Button
                  onClick={() =>
                    act({ action: 'complete-chore', id: chore.id })
                  }
                >
                  Erledigt
                </Button>
              </article>
            ))}
          {!data.chores.some((c) => !c.completed_at) && (
            <Empty icon={<Check />} text="Alles erledigt – großartig!" />
          )}
        </section>
        <section className="ranking">
          <h3>
            <Trophy /> Monatsrangliste
          </h3>
          {[...data.members]
            .sort((a, b) => Number(b.points) - Number(a.points))
            .map((member, index) => (
              <div key={String(member.id)}>
                <strong>{index + 1}</strong>
                <span
                  className="member-avatar"
                  style={{ background: String(member.color) }}
                >
                  {String(member.name).slice(0, 2).toUpperCase()}
                </span>
                <b>{String(member.name)}</b>
                <em>{Number(member.points)} Punkte</em>
              </div>
            ))}
        </section>
      </div>
      {modal === 'chore' && (
        <Modal title="Putzaufgabe anlegen" close={() => setModal('')}>
          <form
            onSubmit={submit('create-chore', (f) => ({
              title: field(f, 'title'),
              memberId: field(f, 'memberId'),
              dueAt: unix(field(f, 'dueAt')),
              repeatRule: field(f, 'repeatRule'),
              points: Number(field(f, 'points')),
            }))}
          >
            <div className="cleaning-catalog-picker">
              <label htmlFor="chore-room">Raum auswählen</label>
              <select
                id="chore-room"
                className="control"
                value={selectedRoom}
                onChange={(event) => {
                  setSelectedRoom(event.target.value);
                  setSelectedTask('');
                }}
              >
                <option value="">Raum auswählen …</option>
                {cleaningCatalog.map((entry) => (
                  <option key={entry.room} value={entry.room}>{entry.room}</option>
                ))}
              </select>
              <label htmlFor="chore-template">Tätigkeit auswählen</label>
              <select
                id="chore-template"
                className="control"
                value={selectedTask}
                disabled={!selectedRoomEntry}
                onChange={(event) => setSelectedTask(event.target.value)}
              >
                <option value="">Tätigkeit auswählen …</option>
                {selectedRoomEntry?.tasks.map((task) => (
                  <option key={task} value={task}>{task}</option>
                ))}
              </select>
              <small>Oder darunter eine eigene Aufgabe eingeben.</small>
            </div>
            <Input
              key={suggestedTitle}
              name="title"
              placeholder="Aufgabe"
              defaultValue={suggestedTitle}
              required
            />
            <MemberSelect members={data.members} />
            <Input name="dueAt" type="datetime-local" required />
            <select name="repeatRule" className="control">
              <option value="">Einmalig</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
            </select>
            <Input name="points" type="number" min="1" defaultValue="10" />
            <Button type="submit">Aufgabe speichern</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function AdminView({ data, act, submit }: ViewProps) {
  const [editing, setEditing] = useState<Row | null>(null);
  const remove = (member: Row) => {
    if (
      window.confirm(
        `${String(member.name)} wirklich aus der Familie entfernen? Zugeordnete Aufgaben bleiben erhalten und werden auf „nicht zugeordnet“ gesetzt.`,
      )
    )
      void act({ action: 'delete-member', id: member.id });
  };
  return (
    <>
      <div className="admin-grid">
        <section className="admin-card">
          <h3>
            <Users /> Familienmitglied hinzufügen
          </h3>
          <p>
            Mit der angegebenen E‑Mail wird ein Mitglied beim ersten Anmelden
            automatisch dieser Familie zugeordnet.
          </p>
          <form onSubmit={submit('create-member')}>
            <Input name="name" placeholder="Name" required />
            <Input name="email" type="email" placeholder="E-Mail-Adresse" />
            <select name="role" className="control">
              <option value="member">Mitglied</option>
              <option value="child">Kind</option>
              <option value="admin">Administrator</option>
            </select>
            <input
              name="color"
              type="color"
              className="color-input"
              defaultValue="#8cc8ff"
            />
            <Button type="submit">
              <Plus /> Mitglied hinzufügen
            </Button>
          </form>
        </section>
        <section className="admin-card members-table">
          <div className="members-title">
            <div>
              <h3>Alle Familienmitglieder</h3>
              <p>
                {data.members.length}{' '}
                {data.members.length === 1 ? 'Mitglied' : 'Mitglieder'}
              </p>
            </div>
            <Badge variant="outline">
              {data.members.filter((member) => member.user_id).length}{' '}
              angemeldet
            </Badge>
          </div>
          {data.members.map((member) => (
            <div className="member-admin-row" key={String(member.id)}>
              <span
                className="member-avatar"
                style={{ background: String(member.color) }}
              >
                {String(member.name).slice(0, 2).toUpperCase()}
              </span>
              <span>
                <b>{String(member.name)}</b>
                <small>{String(member.email ?? 'Noch ohne Login')}</small>
              </span>
              <Badge variant="outline">
                {member.role === 'admin'
                  ? 'Admin'
                  : member.role === 'child'
                    ? 'Kind'
                    : 'Mitglied'}
              </Badge>
              <span className="member-actions">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setEditing(member)}
                  aria-label={`${String(member.name)} bearbeiten`}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="destructive"
                  onClick={() => remove(member)}
                  disabled={member.id === data.session.memberId}
                  aria-label={`${String(member.name)} löschen`}
                >
                  <Trash2 />
                </Button>
              </span>
            </div>
          ))}
        </section>
      </div>
      {editing && (
        <Modal title="Mitglied bearbeiten" close={() => setEditing(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void act({
                action: 'update-member',
                id: editing.id,
                name: field(form, 'name'),
                email: field(form, 'email'),
                role: field(form, 'role'),
                color: field(form, 'color'),
              }).then(() => setEditing(null));
            }}
          >
            <Input
              name="name"
              defaultValue={String(editing.name)}
              placeholder="Name"
              required
            />
            <Input
              name="email"
              type="email"
              defaultValue={String(editing.email ?? '')}
              placeholder="E-Mail-Adresse"
            />
            <select
              name="role"
              className="control"
              defaultValue={String(editing.role)}
            >
              <option value="member">Mitglied</option>
              <option value="child">Kind</option>
              <option value="admin">Administrator</option>
            </select>
            <input
              name="color"
              type="color"
              className="color-input"
              defaultValue={String(editing.color ?? '#8cc8ff')}
            />
            <div className="modal-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
              >
                Abbrechen
              </Button>
              <Button type="submit">Änderungen speichern</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button onClick={close} aria-label="Schließen">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty-state">
      {icon}
      <p>{text}</p>
    </div>
  );
}
function safeIngredients(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
function safeInstructions(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
