import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY_MS = 86_400_000;
const PERIOD_DAYS = 90;
const QUERY = `query ProfileActivity($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function dateTime(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Contribution dates must use YYYY-MM-DD.');
  }
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid contribution date.');
  }
  return timestamp;
}

function validateDays(days) {
  if (!Array.isArray(days) || days.length < 1 || days.length > 366) {
    throw new Error('Expected between 1 and 366 contribution days.');
  }
  let previous;
  return days.map((day) => {
    if (!day || !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) {
      throw new Error('Contribution counts must be non-negative integers.');
    }
    const timestamp = dateTime(day.date);
    if (previous !== undefined && timestamp - previous !== DAY_MS) {
      throw new Error('Contribution days must be unique, consecutive, and ascending.');
    }
    previous = timestamp;
    return { date: day.date, contributionCount: day.contributionCount };
  });
}

export function parseCalendarDays(payload, fromDate, toDate) {
  const from = dateTime(fromDate);
  const to = dateTime(toDate);
  if (to < from || (to - from) / DAY_MS >= 366) throw new Error('Invalid contribution period.');
  if (!payload || (payload.errors && (!Array.isArray(payload.errors) || payload.errors.length))) {
    throw new Error('GitHub GraphQL returned errors.');
  }
  const weeks = payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!Array.isArray(weeks) || !weeks.length) throw new Error('GitHub contribution calendar is missing.');
  const days = weeks.flatMap((week) => {
    if (!Array.isArray(week?.contributionDays)) throw new Error('Invalid contribution calendar week.');
    return week.contributionDays;
  }).filter((day) => {
    if (!day || !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) {
      throw new Error('Invalid contribution calendar day.');
    }
    const timestamp = dateTime(day.date);
    return timestamp >= from && timestamp <= to;
  }).sort((a, b) => a.date.localeCompare(b.date));
  const validated = validateDays(days);
  if (validated.length !== (to - from) / DAY_MS + 1 || validated[0].date !== fromDate || validated.at(-1).date !== toDate) {
    throw new Error('GitHub returned an incomplete contribution period.');
  }
  return validated;
}

function shortDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(dateTime(date)));
}

export function renderContributionGraph(inputDays, { theme = 'light' } = {}) {
  const days = validateDays(inputDays);
  if (!['light', 'dark'].includes(theme)) throw new Error('Unknown contribution graph theme.');
  const dark = theme === 'dark';
  const color = {
    background: dark ? '#0d1117' : '#373f51',
    border: dark ? '#30363d' : '#373f51',
    text: dark ? '#e6edf3' : '#81b29a',
    muted: dark ? '#8b949e' : '#bac3d1',
    grid: dark ? '#21262d' : '#4c5469',
    line: '#edae49',
    title: '#e07a5f',
  };
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Contribution total is too large.');
  const maximum = Math.max(...days.map((day) => day.contributionCount));
  const rawStep = Math.max(1, maximum / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].find((multiple) => multiple * magnitude >= rawStep) * magnitude;
  const ceiling = step * 4;
  const plot = { left: 58, right: 846, top: 88, bottom: 196 };
  const x = (index) => days.length === 1 ? (plot.left + plot.right) / 2
    : plot.left + index / (days.length - 1) * (plot.right - plot.left);
  const y = (count) => plot.bottom - count / ceiling * (plot.bottom - plot.top);
  const number = (value) => value.toFixed(2);
  const line = days.map((day, index) => `${index === 0 ? 'M' : 'L'}${number(x(index))},${number(y(day.contributionCount))}`).join(' ');
  const area = `${line} L${number(x(days.length - 1))},${plot.bottom} L${number(x(0))},${plot.bottom} Z`;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = index * step;
    const position = number(y(value));
    return `<line x1="${plot.left}" y1="${position}" x2="${plot.right}" y2="${position}" stroke="${color.grid}"/>
    <text x="46" y="${number(y(value) + 4)}" text-anchor="end" fill="${color.muted}" font-size="11">${value}</text>`;
  }).join('\n    ');
  const tickCount = Math.min(6, days.length);
  const dates = Array.from({ length: tickCount }, (_, index) => {
    const dayIndex = tickCount === 1 ? 0 : Math.round(index / (tickCount - 1) * (days.length - 1));
    const anchor = tickCount === 1 ? 'middle' : index === 0 ? 'start' : index === tickCount - 1 ? 'end' : 'middle';
    return `<text x="${number(x(dayIndex))}" y="219" text-anchor="${anchor}" fill="${color.muted}" font-size="11">${escapeXml(shortDate(days[dayIndex].date))}</text>`;
  }).join('\n    ');
  const markers = days.filter((day) => day.contributionCount > 0).length <= 25
    ? days.map((day, index) => day.contributionCount > 0 || days.length === 1
      ? `<circle cx="${number(x(index))}" cy="${number(y(day.contributionCount))}" r="2.6" fill="${color.line}"><title>${escapeXml(day.date)}: ${day.contributionCount} contributions</title></circle>` : '').filter(Boolean).join('\n    ')
    : '';
  const period = days.length === 1 ? days[0].date : `${days[0].date} to ${days.at(-1).date}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="250" viewBox="0 0 880 250" role="img" aria-labelledby="title description">
  <title id="title">Contribution Activity</title>
  <desc id="description">${escapeXml(period)}: ${total} contributions across ${days.length} ${days.length === 1 ? 'day' : 'days'}. The graph shows contributions per day.</desc>
  <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color.line}" stop-opacity="0.25"/><stop offset="100%" stop-color="${color.line}" stop-opacity="0.02"/></linearGradient></defs>
  <rect x="0.5" y="0.5" width="879" height="249" rx="12" fill="${color.background}" stroke="${color.border}"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="30" y="35" fill="${color.title}" font-size="20" font-weight="600">Contribution Activity</text>
    <text x="30" y="58" fill="${color.muted}" font-size="12">Last ${days.length} ${days.length === 1 ? 'day' : 'days'} · ${escapeXml(shortDate(days[0].date))} – ${escapeXml(shortDate(days.at(-1).date))}</text>
    <text x="846" y="35" text-anchor="end" fill="${color.text}" font-size="14" font-weight="600">${total.toLocaleString('en-US')} contributions</text>
    <text x="846" y="58" text-anchor="end" fill="${color.muted}" font-size="11">Contributions / day</text>
    ${grid}
    <path d="${area}" fill="url(#area)"/>
    <path d="${line}" fill="none" stroke="${color.line}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${markers}
    ${dates}
  </g>
</svg>\n`;
}

export async function generateContributionGraphs({
  username = process.env.PROFILE_USERNAME || 'zhongshuyi',
  token = process.env.GITHUB_TOKEN,
  now = new Date(),
  outputDirectory = 'dist',
} = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new Error('Invalid PROFILE_USERNAME.');
  if (typeof token !== 'string' || !token.trim()) throw new Error('GITHUB_TOKEN is required.');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid generation date.');
  const toDate = now.toISOString().slice(0, 10);
  const fromDate = new Date(dateTime(toDate) - (PERIOD_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
  let response;
  try {
    response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': `${username}-profile-contribution-graph`,
      },
      body: JSON.stringify({ query: QUERY, variables: { login: username, from: `${fromDate}T00:00:00Z`, to: now.toISOString() } }),
    });
  } catch {
    throw new Error('GitHub GraphQL request failed or timed out.');
  }
  if (!response.ok) throw new Error(`GitHub GraphQL request failed with HTTP ${response.status}.`);
  let payload;
  try { payload = await response.json(); } catch { throw new Error('GitHub GraphQL returned invalid JSON.'); }
  const days = parseCalendarDays(payload, fromDate, toDate);
  const light = renderContributionGraph(days);
  const dark = renderContributionGraph(days, { theme: 'dark' });
  const directory = resolve(outputDirectory);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'activity-graph.svg'), light, 'utf8');
  await writeFile(resolve(directory, 'activity-graph-dark.svg'), dark, 'utf8');
  return { days: days.length, from: fromDate, to: toDate };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateContributionGraphs();
  console.log('Generated light and dark contribution activity graphs.');
}
