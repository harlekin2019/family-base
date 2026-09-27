export type ImportedCalendarEvent = {
  uid: string;
  title: string;
  startsAt: number;
  endsAt: number | null;
  allDay: boolean;
};

const unescapeIcs = (value: string) => value
  .replace(/\\n/gi, ' ')
  .replace(/\\,/g, ',')
  .replace(/\\;/g, ';')
  .replace(/\\\\/g, '\\')
  .trim();

function parseDate(value: string, allDay: boolean, timeZone?: string) {
  if (allDay) {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    if (!match) return 0;
    return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 1000);
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) return 0;
  const parts = match.slice(1, 7).map(Number);
  const guess = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  let milliseconds = guess;
  if (!match[7] && timeZone) {
    try {
      const displayed = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess));
      const part = (type: Intl.DateTimeFormatPartTypes) => Number(displayed.find((entry) => entry.type === type)?.value ?? 0);
      const offset = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')) - guess;
      milliseconds = guess - offset;
    } catch { /* Unbekannte Zeitzone: UTC als sichere Grundlage verwenden. */ }
  }
  return Math.floor(milliseconds / 1000);
}

export function validateGoogleCalendarUrl(raw: string) {
  const url = new URL(raw);
  const allowedHost = url.hostname === 'calendar.google.com' || url.hostname === 'www.google.com';
  if (url.protocol !== 'https:' || !allowedHost || !url.pathname.includes('/calendar/ical/')) {
    throw new Error('Bitte die private iCal-Adresse eines Google-Kalenders verwenden.');
  }
  return url.toString();
}

export function parseGoogleCalendar(text: string): ImportedCalendarEvent[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  return blocks.flatMap((block) => {
    const values = new Map<string, { params: string; value: string }>();
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(':');
      if (separator < 0) continue;
      const left = line.slice(0, separator);
      const key = left.split(';')[0].toUpperCase();
      if (!values.has(key)) values.set(key, { params: left.slice(key.length), value: line.slice(separator + 1) });
    }
    const uid = values.get('UID')?.value.trim();
    const start = values.get('DTSTART');
    if (!uid || !start) return [];
    const allDay = /VALUE=DATE(?:;|$)/i.test(start.params) || /^\d{8}$/.test(start.value);
    const timeZone = start.params.match(/TZID=([^;:]+)/i)?.[1];
    const startsAt = parseDate(start.value.trim(), allDay, timeZone);
    if (!startsAt) return [];
    const end = values.get('DTEND');
    const endTimeZone = end?.params.match(/TZID=([^;:]+)/i)?.[1] ?? timeZone;
    const endsAt = end ? parseDate(end.value.trim(), allDay, endTimeZone) || null : null;
    return [{ uid, title: unescapeIcs(values.get('SUMMARY')?.value || 'Google-Kalendertermin'), startsAt, endsAt, allDay }];
  });
}
