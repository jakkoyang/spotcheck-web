// Minimal evaluator for OpenStreetMap `opening_hours` strings — the subset our data uses:
//   "24/7", "Mo-Fr 07:00-22:00; Sa,Su 08:00-20:00", "Tu-Sa 11:00-14:00,17:00-21:00",
//   "Su-Th 11:00-21:00", times past midnight ("Tu-Fr 08:00-02:00"), "Mo off",
//   and month-scoped rules ("Sep-May: Mo-Th 08:00-21:00"). Public-holiday rules are ignored.
// Anything else returns null ("hours unknown") rather than guessing.

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Rule {
  months: Set<number> | null // null = every month
  days: Set<number>
  intervals: [number, number][] // minutes from midnight; end may exceed 1440
}

function expandRange<T extends string>(token: string, names: readonly T[]): number[] | null {
  const [from, to] = token.split('-')
  const a = names.indexOf(from as T)
  const b = to === undefined ? a : names.indexOf(to as T)
  if (a < 0 || b < 0) return null
  const out: number[] = []
  for (let i = a; ; i = (i + 1) % names.length) {
    out.push(i)
    if (i === b) break
  }
  return out
}

function parseList<T extends string>(spec: string, names: readonly T[]): Set<number> | null {
  const out = new Set<number>()
  for (const token of spec.split(',')) {
    const values = expandRange(token.trim(), names)
    if (!values) return null
    values.forEach((v) => out.add(v))
  }
  return out
}

function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function parseRule(raw: string): Rule | 'skip' | null {
  let text = raw.trim()
  if (!text) return 'skip'
  if (/^PH\b/.test(text)) return 'skip'
  // Seasonal date-range exceptions ("May 15 - Sep 1 Mo-Fr 07:00-14:00") are skipped, so the
  // regular schedule applies year-round.
  if (/^[A-Z][a-z]{2} \d{1,2}\s*-\s*[A-Z][a-z]{2} \d{1,2}\b/.test(text)) return 'skip'

  let months: Set<number> | null = null
  const monthMatch = /^([A-Z][a-z]{2}(?:-[A-Z][a-z]{2})?(?:,[A-Z][a-z]{2}(?:-[A-Z][a-z]{2})?)*):?\s+(.*)$/.exec(text)
  if (monthMatch && MONTHS.includes(monthMatch[1].slice(0, 3))) {
    months = parseList(monthMatch[1], MONTHS)
    if (!months) return null
    text = monthMatch[2]
  }

  const [daySpec, timeSpec] = text.includes(' ') ? [text.slice(0, text.indexOf(' ')), text.slice(text.indexOf(' ') + 1).trim()] : ['Mo-Su', text]
  const days = parseList(daySpec.replace(/,PH$/, ''), DAYS)
  if (!days) return null

  if (timeSpec === 'off' || timeSpec === 'closed') return { months, days, intervals: [] }
  const intervals: [number, number][] = []
  for (const span of timeSpec.split(',')) {
    const [start, end] = span.split('-').map((s) => parseTime(s.trim()))
    if (start === null || end === null || start === undefined || end === undefined) return null
    intervals.push([start, end <= start ? end + 1440 : end])
  }
  return { months, days, intervals }
}

export function parseOpeningHours(spec: string | null): Rule[] | null {
  if (!spec) return null
  if (spec.trim() === '24/7') return [{ months: null, days: new Set([0, 1, 2, 3, 4, 5, 6]), intervals: [[0, 1440]] }]
  const rules: Rule[] = []
  for (const part of spec.split(';')) {
    const rule = parseRule(part)
    if (rule === null) return null
    if (rule !== 'skip') rules.push(rule)
  }
  return rules.length ? rules : null
}

// Later rules override earlier ones for the days they cover (OSM semantics).
function intervalsFor(rules: Rule[], date: Date): [number, number][] {
  let result: [number, number][] = []
  for (const rule of rules) {
    if (rule.months && !rule.months.has(date.getMonth())) continue
    if (rule.days.has(date.getDay())) result = rule.intervals
  }
  return result
}

function formatTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const mins = m % 60
  const suffix = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return mins ? `${h12}:${String(mins).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`
}

export interface OpenStatus {
  isOpen: boolean
  label: string
}

export function getOpenStatus(spec: string | null, now = new Date()): OpenStatus | null {
  const rules = parseOpeningHours(spec)
  if (!rules) return null
  if (spec?.trim() === '24/7') return { isOpen: true, label: 'Open 24 hours' }

  const minuteOfDay = now.getHours() * 60 + now.getMinutes()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  // Open now: today's interval, or yesterday's interval that runs past midnight.
  const candidates: [number, number][] = [
    ...intervalsFor(rules, now),
    ...intervalsFor(rules, yesterday).map(([s, e]) => [s - 1440, e - 1440] as [number, number]),
  ]
  const current = candidates.find(([s, e]) => minuteOfDay >= s && minuteOfDay < e)
  if (current) return { isOpen: true, label: `Open · Closes ${formatTime(current[1])}` }

  // Next opening within the coming week.
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now)
    day.setDate(now.getDate() + offset)
    const next = intervalsFor(rules, day)
      .map(([s]) => s)
      .filter((s) => offset > 0 || s > minuteOfDay)
      .sort((a, b) => a - b)[0]
    if (next !== undefined) {
      const when = offset === 0 ? '' : offset === 1 ? ' tomorrow' : ` ${DAYS[day.getDay()]}`
      return { isOpen: false, label: `Closed · Opens${when} ${formatTime(next)}` }
    }
  }
  return { isOpen: false, label: 'Closed' }
}
