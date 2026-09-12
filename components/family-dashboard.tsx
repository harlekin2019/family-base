'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { FamilyData, WorkspaceModule } from '@/components/workspace-modules';
import { Bell, BellRing, CalendarDays, Check, ChevronRight, CircleUserRound, ClipboardCheck, CookingPot, Home, ListTodo, Mail, Menu, Plus, Search, Settings, ShoppingBasket, Sparkles, Trophy, X } from 'lucide-react';

const nav = [['Übersicht', Home], ['Kalender', CalendarDays], ['Einkaufsliste', ShoppingBasket], ['Rezepte', CookingPot], ['Aufgaben', ListTodo], ['Putzplan', ClipboardCheck]] as const;
export function FamilyDashboard() {
  const [active, setActive] = useState('Übersicht');
  const [newItem, setNewItem] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const familyMembers = familyData?.members ?? [];
  const currentMember = familyMembers.find((member) => member.id === familyData?.session.memberId) ?? familyMembers[0];
  const currentName = String(currentMember?.name ?? 'Familie');
  const initials = currentName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const savedOpenItems = familyData?.shopping.filter((item) => !Boolean(item.checked)).length ?? 0;
  const savedRecipeCount = familyData?.recipes.length ?? 0;
  const storedChores = familyData?.chores ?? [];
  const reminders = now && currentMember ? storedChores.filter((chore) => {
    if (chore.completed_at || (chore.assigned_member_id && chore.assigned_member_id !== currentMember.id)) return false;
    return Number(chore.due_at) * 1000 <= now.getTime() + 24 * 60 * 60 * 1000;
  }).sort((a, b) => Number(a.due_at) - Number(b.due_at)) : [];
  const dashboardChores = now ? storedChores.filter((chore) => !chore.completed_at && new Date(Number(chore.due_at) * 1000).toDateString() === now.toDateString()).slice(0, 3) : [];
  const weekStart = now ? new Date(now) : null;
  if (weekStart) { weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); }
  const weekEnd = weekStart ? new Date(weekStart.getTime() + 7 * 86400000) : null;
  const weeklyChores = weekStart && weekEnd ? storedChores.filter((chore) => { const due = Number(chore.due_at) * 1000; return due >= weekStart.getTime() && due < weekEnd.getTime(); }) : [];
  const weeklyProgress = weeklyChores.length ? Math.round(weeklyChores.filter((chore) => Boolean(chore.completed_at)).length / weeklyChores.length * 100) : 0;
  const todayPoints = dashboardChores.reduce((sum, chore) => sum + Number(chore.points ?? 0), 0);
  const todayEvents = now ? (familyData?.events ?? []).filter((event) => new Date(Number(event.starts_at) * 1000).toDateString() === now.toDateString()) : [];
  const weekDays = now ? Array.from({ length: 7 }, (_, index) => { const day = new Date(now); day.setDate(now.getDate() - ((now.getDay() + 6) % 7) + index); return day; }) : [];
  const todayTitle = now?.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) ?? '';
  const rankingMonth = now?.toLocaleDateString('de-DE', { month: 'long' }).toLocaleUpperCase('de-DE') ?? '';
  const hour = now?.getHours();
  const greeting = hour === undefined ? 'Hallo' : hour >= 5 && hour < 11 ? 'Guten Morgen' : hour >= 11 && hour < 18 ? 'Guten Tag' : hour >= 18 && hour < 22 ? 'Guten Abend' : 'Gute Nacht';
  const currentDate = now?.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).toLocaleUpperCase('de-DE') ?? '';
  const updateFamily = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/family', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (response.ok) setFamilyData(await response.json() as FamilyData);
  };
  const addItem = () => { const name = newItem.trim(); if (!name) return; setNewItem(''); void updateFamily({ action: 'create-shopping', name, quantity: '', category: 'Sonstiges' }); };

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    if ('Notification' in window) setBrowserPermission(Notification.permission);
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!now || browserPermission !== 'granted' || !reminders.length) return;
    const sent = new Set(JSON.parse(localStorage.getItem('family-base-notified') ?? '[]') as string[]);
    for (const chore of reminders) {
      const key = `${String(chore.id)}:${String(chore.due_at)}`;
      if (sent.has(key)) continue;
      const overdue = Number(chore.due_at) * 1000 < now.getTime();
      new Notification(overdue ? 'Putzaufgabe überfällig' : 'Putzaufgabe steht an', {
        body: String(chore.title),
        icon: '/favicon.svg',
        tag: key,
      });
      sent.add(key);
    }
    localStorage.setItem('family-base-notified', JSON.stringify([...sent].slice(-100)));
  }, [browserPermission, now, reminders]);

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  };

  useEffect(() => {
    void fetch('/api/family').then(async (response) => { if (response.ok) setFamilyData(await response.json() as FamilyData); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_shopping_items', title: 'Einkaufsartikel hinzufügen',
      description: 'Fügt einen oder mehrere Artikel zur sichtbaren Familien-Einkaufsliste hinzu.',
      inputSchema: { type: 'object', properties: { items: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } } }, required: ['items'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const values = (input as { items?: unknown }).items;
        if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== 'string' || !value.trim())) throw new Error('Mindestens ein gültiger Artikel ist erforderlich.');
        const names = values.map((value) => (value as string).trim());
        for (const name of names) await updateFamily({ action: 'create-shopping', name, quantity: '', category: 'Sonstiges' });
        return { added: names.length, items: names };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  return <div className="min-h-screen bg-background text-foreground"><div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Home size={19} /></div><span>Family Base</span><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Menü schließen"><X /></button></div>
      <nav className="nav-list" aria-label="Hauptnavigation">{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-active' : ''} onClick={() => { setActive(label); setMenuOpen(false); }}><Icon /><span>{label}</span>{label === 'Einkaufsliste' && savedOpenItems > 0 && <em>{savedOpenItems}</em>}{label === 'Rezepte' && <em>{savedRecipeCount}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><p>FAMILIE</p><div className="member-stack">{familyMembers.map((member) => <span key={String(member.id)} style={{ background: String(member.color ?? '#8cc8ff') }} title={String(member.name)}>{String(member.name).slice(0, 2).toUpperCase()}</span>)}<button aria-label="Mitglied hinzufügen" onClick={() => setActive('Administration')}><Plus /></button></div><button className={`settings ${active === 'Administration' ? 'nav-active' : ''}`} onClick={() => { setActive('Administration'); setMenuOpen(false); }}><Settings /><span>Administration</span></button><div className="profile"><span className="avatar" style={{ background: String(currentMember?.color ?? '#ffb36b') }}>{initials}</span><span><strong>{currentName}</strong><small>{currentMember?.role === 'admin' ? 'Administrator/in' : currentMember?.role === 'child' ? 'Kind' : 'Mitglied'}</small></span><ChevronRight /></div></div>
    </aside>

    <main className="main-content"><header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Menü öffnen"><Menu /></button><div><p>{currentDate}</p><h1>{greeting}, {currentName.split(' ')[0]} <span>👋</span></h1></div><div className="top-actions"><label className="search"><Search /><input placeholder="Suchen …" aria-label="Suchen" /></label><div className="notification-anchor"><button className="notification-button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Benachrichtigungen" aria-expanded={notificationsOpen}><Bell />{reminders.length > 0 && <em>{reminders.length}</em>}</button>{notificationsOpen && <section className="notification-panel"><header><div><span>BENACHRICHTIGUNGEN</span><h2>Deine Erinnerungen</h2></div><button onClick={() => setNotificationsOpen(false)} aria-label="Schließen"><X /></button></header><div className="notification-list">{reminders.length ? reminders.map((chore) => { const due = new Date(Number(chore.due_at) * 1000); const overdue = Boolean(now && due.getTime() < now.getTime()); return <button key={String(chore.id)} onClick={() => { setActive('Putzplan'); setNotificationsOpen(false); }}><span className={overdue ? 'reminder-icon overdue' : 'reminder-icon'}><BellRing /></span><span><strong>{String(chore.title)}</strong><small>{overdue ? `Überfällig seit ${due.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}` : `Fällig ${due.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`}</small></span><ChevronRight /></button>; }) : <div className="notification-empty"><Check /><span>Aktuell ist nichts fällig.</span></div>}</div><footer><button onClick={() => void enableBrowserNotifications()} disabled={browserPermission === 'granted'}><Bell />{browserPermission === 'granted' ? 'Browser-Meldungen aktiviert' : browserPermission === 'denied' ? 'Im Browser blockiert' : 'Browser-Meldungen aktivieren'}</button><div><Mail /><span><b>E-Mail-Erinnerungen</b><small>Absenderdienst noch verbinden</small></span></div></footer></section>}</div><Button className="quick-add"><Plus /> Neu hinzufügen</Button><button className="profile-mini" aria-label="Profil"><CircleUserRound /></button></div></header>

      {active === 'Übersicht' ? <><section className="stats-row" aria-label="Tagesübersicht"><article><span className="stat-icon lime"><CalendarDays /></span><div><strong>{todayEvents.length}</strong><small>Termine heute</small></div><em>{todayEvents.length ? 'Alle im Blick' : 'Keine Termine'}</em></article><article><span className="stat-icon orange"><ShoppingBasket /></span><div><strong>{savedOpenItems}</strong><small>Offene Einkäufe</small></div><em>{savedOpenItems ? 'Liste geteilt' : 'Liste leer'}</em></article><article><span className="stat-icon blue"><ClipboardCheck /></span><div><strong>{dashboardChores.length}</strong><small>Putzaufgaben heute</small></div><em>+{todayPoints} Punkte</em></article><article><span className="stat-icon violet"><CookingPot /></span><div><strong>{savedRecipeCount}</strong><small>Gespeicherte Rezepte</small></div><em>{savedRecipeCount ? 'Sammlung öffnen' : 'Noch keine Rezepte'}</em></article></section><div className="dashboard-grid">
        <section className="panel calendar-panel"><div className="panel-title"><div><span>HEUTE</span><h2>{todayTitle}</h2></div><Button variant="ghost" onClick={() => setActive('Kalender')}>Kalender öffnen <ChevronRight /></Button></div><div className="day-strip">{weekDays.map((day) => { const selected = now?.toDateString() === day.toDateString(); return <button key={day.toISOString()} className={selected ? 'selected-day' : ''} onClick={() => setActive('Kalender')}><small>{day.toLocaleDateString('de-DE', { weekday: 'short' })}</small><strong>{day.getDate()}</strong>{selected && <i />}</button>; })}</div><div className="events">{todayEvents.length ? todayEvents.map((event) => { const member = familyMembers.find((item) => item.id === event.member_id); const who = event.is_shared ? 'Alle' : String(member?.name ?? 'Privat'); const color = String(event.is_shared ? '#c7f36c' : member?.color ?? '#8cc8ff'); const time = event.all_day ? 'Ganztägig' : new Date(Number(event.starts_at) * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); return <div className="event" key={String(event.id)}><time>{time}</time><i style={{ background: color }} /><div><strong>{String(event.title)}</strong><small>{who}{event.all_day ? '' : ` · ${time} Uhr`}</small></div><span className="person-dot" style={{ background: color }}>{who.slice(0,1)}</span></div>; }) : <div className="dashboard-empty"><CalendarDays /><span>Heute sind keine Termine eingetragen.</span></div>}</div></section>

        <section className="panel shopping-panel"><div className="panel-title"><div><span>EINKAUFSLISTE</span><h2>Noch {savedOpenItems} Dinge</h2></div><Badge className="soft-badge">Geteilt</Badge></div><div className="add-row"><Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Artikel hinzufügen …"/><Button size="icon" onClick={addItem} aria-label="Artikel hinzufügen"><Plus /></Button></div><div className="shopping-list">{(familyData?.shopping ?? []).slice(0, 4).map((item) => <button key={String(item.id)} onClick={() => void updateFamily({ action: 'toggle-shopping', id: item.id })} className={item.checked ? 'done' : ''}><span className="check">{Boolean(item.checked) && <Check />}</span><span><strong>{String(item.name)}</strong><small>{[item.quantity, item.category].filter(Boolean).join(' · ') || 'Ohne Zusatz'}</small></span></button>)}{!familyData?.shopping.length && <div className="dashboard-empty compact"><ShoppingBasket /><span>Die Einkaufsliste ist leer.</span></div>}</div><Button variant="ghost" className="full-link" onClick={() => setActive('Einkaufsliste')}>Zur Einkaufsliste <ChevronRight /></Button></section>

        <section className="panel chores-panel"><div className="panel-title"><div><span>PUTZPLAN</span><h2>Was heute ansteht</h2></div><button className="round-add" onClick={() => setActive('Putzplan')} aria-label="Putzaufgabe hinzufügen"><Plus /></button></div>{dashboardChores.length ? <div className="chore-list">{dashboardChores.map((chore) => { const member = familyMembers.find((item) => item.id === chore.assigned_member_id); return <div key={String(chore.id)}><span className="chore-emoji">🧽</span><div><strong>{String(chore.title)}</strong><small>{String(member?.name ?? 'Nicht zugeordnet')} · Heute</small></div><Badge className="points">+{Number(chore.points)} P</Badge></div>; })}</div> : <div className="chore-empty"><ClipboardCheck /><span>Für heute sind keine Putzaufgaben eingetragen.</span></div>}<div className="weekly-progress"><div><span>Wochenfortschritt</span><strong>{weeklyProgress}%</strong></div><Progress value={weeklyProgress} /></div></section>

        <section className="panel leaderboard-panel"><div className="panel-title"><div><span>{rankingMonth}</span><h2>Punkte‑Rangliste</h2></div><Trophy className="trophy" /></div><div className="podium">{[...familyMembers].sort((a, b) => Number(b.points) - Number(a.points)).map((member, index) => <div key={String(member.id)}><span className="rank">{index + 1}</span><span className="member-avatar" style={{ background: String(member.color ?? '#8cc8ff') }}>{String(member.name).slice(0, 2).toUpperCase()}</span><span className="member-name">{String(member.name)}</span><strong>{Number(member.points)} P</strong><div className="bar"><i style={{ width: `${Math.min(100, Number(member.points))}%`, background: String(member.color ?? '#8cc8ff') }} /></div></div>)}</div><Button variant="ghost" className="full-link" onClick={() => setActive('Putzplan')}>Statistik ansehen <ChevronRight /></Button></section>
      </div></> : <WorkspaceModule active={active} onDataChange={setFamilyData} />}
    </main>
  </div>{menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Menü schließen" />}</div>;
}
