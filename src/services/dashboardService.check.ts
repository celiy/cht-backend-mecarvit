import {
    deadlinePeriodRange,
    periodRange,
    parseDashboardPeriodo,
    parseDashboardMeses
} from "./dashboardService.js";

function assert(cond: boolean, label: string) {
    if (!cond) {
        throw new Error(label);
    }
}

assert(parseDashboardPeriodo(undefined) === "esta_semana", "default periodo");
assert(parseDashboardMeses("12") === 12, "meses 12");

const monday = new Date("2026-09-28T15:00:00");
const week = periodRange("esta_semana", monday);
assert(week != null && week.start.getDay() === 1, "week starts monday");

const deadlineWeek = deadlinePeriodRange("esta_semana", monday);

if (!deadlineWeek || !week) {
    throw new Error("deadline/week range");
}

assert(deadlineWeek.start.getTime() < week.start.getTime(), "deadline starts before monday");
assert(deadlineWeek.end.getDay() === 0, "deadline end sunday");

const all = periodRange("em_geral");
assert(all === null, "em_geral null range");

console.log("dashboardService ok");
