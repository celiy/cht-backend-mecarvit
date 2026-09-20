import { AppError } from "./AppError.js";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bounds of a `aaaa-mm-dd` day, anchored at UTC.
 *
 * Date-only columns are stored as UTC midnight, because that is what
 * `new Date("aaaa-mm-dd")` produces. Comparing a timestamp column against a
 * single `Date` would only match rows whose time happens to be exactly
 * midnight, so day filters are expressed as an inclusive range instead.
 *
 * @param value Query value in `aaaa-mm-dd` form.
 * @returns Inclusive `[start, end]` bounds for that UTC day.
 * @throws {AppError} 400 when the value is not a valid date.
 */
export function utcDayRange(value: string): { start: Date; end: Date } {
    const raw = value.trim();

    if (!DATE_ONLY_PATTERN.test(raw)) {
        throw new AppError("Data inválida", 400, {
            data: "Use o formato aaaa-mm-dd"
        });
    }

    const start = new Date(`${raw}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== raw) {
        throw new AppError("Data inválida", 400, {
            data: "Data não existe no calendário"
        });
    }

    return {
        start,
        end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
    };
}
