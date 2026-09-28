/**
 * Sanity check for mock date helpers (duplicated logic mirrors seed.ts buckets).
 * Run: npx tsx src/db/mock/seedDates.check.ts
 */

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function addLocalDays(date: Date, days: number): Date {
    const next = new Date(date);

    next.setDate(next.getDate() + days);

    return startOfLocalDay(next);
}

function mondayOfWeek(now: Date): Date {
    const today = startOfLocalDay(now);
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    return addLocalDays(today, mondayOffset);
}

function assert(cond: boolean, label: string) {
    if (!cond) {
        throw new Error(label);
    }
}

const now = new Date("2026-09-28T15:00:00");
const weekStart = mondayOfWeek(now);
const today = startOfLocalDay(now);

assert(weekStart.getDay() === 1, "monday");
assert(weekStart.getTime() <= today.getTime(), "weekStart <= today");
assert(today.getDate() === 28, "fixture day");

const inWeek = (d: Date) => d.getTime() >= weekStart.getTime() && d.getTime() <= now.getTime();

assert(inWeek(today), "today in week filter");
assert(inWeek(weekStart), "monday in week filter");

console.log("seedDates ok", { weekStart: weekStart.toISOString(), today: today.toISOString() });
