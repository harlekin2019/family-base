'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { WorkspaceModule } from '@/components/workspace-modules';
import { CalendarDays, Check, ChevronRight, CircleUserRound, ClipboardCheck, CookingPot, Home, ListTodo, Menu, Plus, Search, Settings, ShoppingBasket, Sparkles, Trophy, X } from 'lucide-react';

const members = [
  { name: 'Anna', initials: 'AN', color: '#c6f36a', points: 124 },
  { name: 'Tom', initials: 'TM', color: '#ffb36b', points: 98 },
  { name: 'Lina', initials: 'LI', color: '#8cc8ff', points: 76 },
  { name: 'Finn', initials: 'FI', color: '#d7a6ff', points: 61 },
];
const nav = [['Übersicht', Home], ['Kalender', CalendarDays], ['Einkaufsliste', ShoppingBasket], ['Rezepte', CookingPot], ['Aufgaben', ListTodo], ['Putzplan', ClipboardCheck]] as const;
const events = [
  { time: '08:15', title: 'Zahnarzt Lina', who: 'Lina', color: '#8cc8ff' },
  { time: '15:30', title: 'Fußballtraining', who: 'Finn', color: '#d7a6ff' },
  { time: '18:30', title: 'Pizzaabend 🍕', who: 'Alle', color: '#c6f36a' },
];
const initialShopping = [
  { id: 1, name: 'Hafermilch', meta: '2 Packungen · Getränke', done: false },
  { id: 2, name: 'Tomaten', meta: '500 g · Gemüse', done: false },
  { id: 3, name: 'Basilikum', meta: '1 Bund · Gemüse', done: true },
];
const chores = [
  { title: 'Bad putzen', person: 'Anna', due: 'Heute', points: 15, icon: '🫧' },
  { title: 'Müll rausbringen', person: 'Finn', due: 'Heute', points: 5, icon: '♻️' },
  { title: 'Küche wischen', person: 'Tom', due: 'Morgen', points: 10, icon: '🧹' },
];

export function FamilyDashboard() {
  const [active, setActive] = useState('Übersicht');
  const [shopping, setShopping] = useState(initialShopping);
  const [newItem, setNewItem] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const openItems = shopping.filter((item) => !item.done).length;
  const addItem = () => { const name = newItem.trim(); if (!name) return; setShopping((items) => [...items, { id: Date.now(), name, meta: 'Manuell hinzugefügt', done: false }]); setNewItem(''); };

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_shopping_items', title: 'Einkaufsartikel hinzufügen',
      description: 'Fügt einen oder mehrere Artikel zur sichtbaren Familien-Einkaufsliste hinzu.',
      inputSchema: { type: 'object', properties: { items: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } } }, required: ['items'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const values = (input as { items?: unknown }).items;
        if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== 'string' || !value.trim())) throw new Error('Mindestens ein gültiger Artikel ist erforderlich.');
        const names = values.map((value) => (value as string).trim());
        setShopping((current) => [...current, ...names.map((name, index) => ({ id: Date.now() + index, name, meta: 'Automatisch hinzugefügt', done: false }))]);
        return { added: names.length, items: names };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return <div className="min-h-screen bg-background text-foreground"><div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Home size={19} /></div><span>familio</span><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Menü schließen"><X /></button></div>
      <nav className="nav-list" aria-label="Hauptnavigation">{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-active' : ''} onClick={() => { setActive(label); setMenuOpen(false); }}><Icon /><span>{label}</span>{label === 'Einkaufsliste' && <em>{openItems}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><p>FAMILIE</p><div className="member-stack">{members.map((m) => <span key={m.name} style={{ background: m.color }} title={m.name}>{m.initials}</span>)}<button aria-label="Mitglied hinzufügen" onClick={() => setActive('Administration')}><Plus /></button></div><button className={`settings ${active === 'Administration' ? 'nav-active' : ''}`} onClick={() => { setActive('Administration'); setMenuOpen(false); }}><Settings /><span>Administration</span></button><div className="profile"><span className="avatar">JS</span><span><strong>Julia Schneider</strong><small>Administratorin</small></span><ChevronRight /></div></div>
    </aside>

    <main className="main-content"><header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Menü öffnen"><Menu /></button><div><p>MITTWOCH, 2. SEPTEMBER</p><h1>Guten Morgen, Julia <span>👋</span></h1></div><div className="top-actions"><label className="search"><Search /><input placeholder="Suchen …" aria-label="Suchen" /></label><Button className="quick-add"><Plus /> Neu hinzufügen</Button><button className="profile-mini" aria-label="Profil"><CircleUserRound /></button></div></header>

      {active === 'Übersicht' ? <><section className="stats-row" aria-label="Tagesübersicht"><article><span className="stat-icon lime"><CalendarDays /></span><div><strong>3</strong><small>Termine heute</small></div><em>Alle im Blick</em></article><article><span className="stat-icon orange"><ShoppingBasket /></span><div><strong>{openItems}</strong><small>Offene Einkäufe</small></div><em>Liste teilen</em></article><article><span className="stat-icon blue"><ClipboardCheck /></span><div><strong>2</strong><small>Aufgaben fällig</small></div><em>+20 Punkte</em></article><article><span className="stat-icon violet"><CookingPot /></span><div><strong>12</strong><small>Lieblingsrezepte</small></div><em>2 neu</em></article></section><div className="dashboard-grid">
        <section className="panel calendar-panel"><div className="panel-title"><div><span>HEUTE</span><h2>Mittwoch, 2. September</h2></div><Button variant="ghost">Kalender öffnen <ChevronRight /></Button></div><div className="day-strip">{[['31','MO'],['01','DI'],['02','MI'],['03','DO'],['04','FR'],['05','SA'],['06','SO']].map(([d,w]) => <button key={d} className={d === '02' ? 'selected-day' : ''}><small>{w}</small><strong>{d}</strong>{d === '02' && <i />}</button>)}</div><div className="events">{events.map((e) => <div className="event" key={e.title}><time>{e.time}</time><i style={{ background: e.color }} /><div><strong>{e.title}</strong><small>{e.who} · {e.time} Uhr</small></div><span className="person-dot" style={{ background: e.color }}>{e.who.slice(0,1)}</span></div>)}</div></section>

        <section className="panel shopping-panel"><div className="panel-title"><div><span>EINKAUFSLISTE</span><h2>Noch {openItems} Dinge</h2></div><Badge className="soft-badge">Geteilt</Badge></div><div className="add-row"><Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Artikel hinzufügen …"/><Button size="icon" onClick={addItem} aria-label="Artikel hinzufügen"><Plus /></Button></div><div className="shopping-list">{shopping.slice(-4).map((item) => <button key={item.id} onClick={() => setShopping((all) => all.map((i) => i.id === item.id ? {...i, done: !i.done} : i))} className={item.done ? 'done' : ''}><span className="check">{item.done && <Check />}</span><span><strong>{item.name}</strong><small>{item.meta}</small></span></button>)}</div><Button variant="ghost" className="full-link">Zur Einkaufsliste <ChevronRight /></Button></section>

        <section className="panel chores-panel"><div className="panel-title"><div><span>PUTZPLAN</span><h2>Was heute ansteht</h2></div><button className="round-add"><Plus /></button></div><div className="chore-list">{chores.map((c) => <div key={c.title}><span className="chore-emoji">{c.icon}</span><div><strong>{c.title}</strong><small>{c.person} · {c.due}</small></div><Badge className="points">+{c.points} P</Badge></div>)}</div><div className="weekly-progress"><div><span>Wochenfortschritt</span><strong>68%</strong></div><Progress value={68} /></div></section>

        <section className="panel leaderboard-panel"><div className="panel-title"><div><span>SEPTEMBER</span><h2>Punkte‑Rangliste</h2></div><Trophy className="trophy" /></div><div className="podium">{members.map((m, i) => <div key={m.name}><span className="rank">{i + 1}</span><span className="member-avatar" style={{ background: m.color }}>{m.initials}</span><span className="member-name">{m.name}</span><strong>{m.points} P</strong><div className="bar"><i style={{ width: `${m.points / 1.24}%`, background: m.color }} /></div></div>)}</div><Button variant="ghost" className="full-link">Statistik ansehen <ChevronRight /></Button></section>
      </div></> : <WorkspaceModule active={active} />}
    </main>
  </div>{menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Menü schließen" />}</div>;
}
