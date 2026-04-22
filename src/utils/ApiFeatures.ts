import {
    and,
    asc,
    desc,
    eq,
    gt,
    gte,
    like,
    lt,
    lte,
    sql,
    type AnyColumn,
    type SQL,
} from "drizzle-orm";
import { SQLiteTable, getTableConfig } from "drizzle-orm/sqlite-core";
import type { AppDatabase } from "../config/database.js";
import { AppError } from "./AppError.js";

type QueryValue = string | string[] | undefined;
type QueryString = Record<string, unknown>;

const OPERATORS = ["gte", "gt", "lte", "lt"] as const;
type Operator = typeof OPERATORS[number];

const RESERVED = new Set(["sort", "page", "limit", "fields"]);

function isOperator(value: string): value is Operator {
    return (OPERATORS as readonly string[]).includes(value);
}

function isValidDate(value: string): boolean {
    return !isNaN(Date.parse(value)) && isNaN(Number(value));
}

function isValidNumber(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
}

function coerce(raw: string): string | number | Date {
    if (isValidDate(raw)) return new Date(raw);
    if (isValidNumber(raw)) return parseFloat(raw);
    return raw;
}

function toStringValue(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[value.length - 1] as string;
    return undefined;
}

function getColumn(columns: Record<string, AnyColumn>, field: string): AnyColumn | null {
    return columns[field] ?? null;
}

interface PaginateInfo {
    page: number;
    limit: number;
    offset: number;
}

/**
 * Builds a Drizzle query from URL parameters while keeping the same
 * public API as the previous Mongo-based ApiFeatures implementation:
 *
 *   ?field=value                       -> case-insensitive LIKE for strings or eq for numbers/dates
 *   ?field[gte|gt|lte|lt]=value        -> comparison operators
 *   ?sort=field,-otherField            -> ORDER BY field ASC, otherField DESC
 *   ?fields=a,b,c                      -> column projection
 *   ?page=1&limit=10                   -> pagination with defaults 1 / 10
 *
 * Typical usage:
 *
 *   const features = new ApiFeatures(db, users, req.query)
 *     .filter().sort().limitFields().paginate();
 *   const rows = await features.exec();
 *   const total = await features.count();
 */
export class ApiFeatures<TTable extends SQLiteTable> {
    private readonly db: AppDatabase;
    private readonly table: TTable;
    private readonly columns: Record<string, AnyColumn>;
    private readonly queryString: QueryString;
    private readonly hasQuery: boolean;

    private whereConds: SQL[] = [];
    private orderBy: SQL[] = [];
    private projection: Record<string, AnyColumn> | null = null;
    private paginateInfo: PaginateInfo | null = null;

    constructor(db: AppDatabase, table: TTable, queryString: QueryString | undefined) {
        this.db = db;
        this.table = table;

        const cfg = getTableConfig(table);
        const cols: Record<string, AnyColumn> = {};
        for (const col of cfg.columns) {
            cols[col.name] = col as unknown as AnyColumn;
        }
        this.columns = cols;

        this.queryString = queryString ?? {};
        this.hasQuery = Object.keys(this.queryString).length > 0;
    }

    filter(): this {
        if (!this.hasQuery) return this;

        for (const [key, rawValue] of Object.entries(this.queryString)) {
            if (RESERVED.has(key)) continue;

            const column = getColumn(this.columns, key);
            if (!column) continue;

            if (rawValue !== null && typeof rawValue === "object" && !Array.isArray(rawValue)) {
                for (const [op, opValue] of Object.entries(rawValue as Record<string, unknown>)) {
                    if (!isOperator(op)) continue;
                    const raw = toStringValue(opValue);
                    if (raw === undefined) continue;

                    const coerced = coerce(raw);
                    this.whereConds.push(this.compareOp(column, op, coerced));
                }
                continue;
            }

            const raw = toStringValue(rawValue as QueryValue);
            if (raw === undefined) continue;

            const coerced = coerce(raw);
            if (typeof coerced === "string") {
                this.whereConds.push(
                    like(sql`lower(${column})`, `%${coerced.toLowerCase()}%`),
                );
            } else if (coerced instanceof Date) {
                this.whereConds.push(eq(column, coerced));
            } else {
                this.whereConds.push(eq(column, coerced));
            }
        }

        return this;
    }

    private compareOp(column: AnyColumn, op: Operator, value: string | number | Date): SQL {
        switch (op) {
            case "gte":
                return gte(column, value);
            case "gt":
                return gt(column, value);
            case "lte":
                return lte(column, value);
            case "lt":
                return lt(column, value);
        }
    }

    sort(): this {
        const sortRaw = toStringValue(this.queryString.sort as QueryValue);
        if (!sortRaw) return this;

        for (const token of sortRaw.split(",").map(s => s.trim()).filter(Boolean)) {
            const descending = token.startsWith("-");
            const fieldName = descending ? token.slice(1) : token;
            const column = getColumn(this.columns, fieldName);
            if (!column) continue;

            this.orderBy.push(descending ? desc(column) : asc(column));
        }

        return this;
    }

    limitFields(): this {
        const fieldsRaw = toStringValue(this.queryString.fields as QueryValue);
        if (!fieldsRaw) return this;

        const picked: Record<string, AnyColumn> = {};
        for (const name of fieldsRaw.split(",").map(s => s.trim()).filter(Boolean)) {
            const column = getColumn(this.columns, name);
            if (column) picked[name] = column;
        }

        if (Object.keys(picked).length > 0) {
            this.projection = picked;
        }

        return this;
    }

    paginate(): this {
        const pageRaw = toStringValue(this.queryString.page as QueryValue);
        const limitRaw = toStringValue(this.queryString.limit as QueryValue);

        const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
        const limit = Math.max(1, parseInt(limitRaw ?? "10", 10) || 10);
        const offset = (page - 1) * limit;

        this.paginateInfo = { page, limit, offset };
        return this;
    }

    get pagination(): PaginateInfo {
        return this.paginateInfo ?? { page: 1, limit: 10, offset: 0 };
    }

    /** Runs COUNT(*) with the same applied filters. */
    async count(): Promise<number> {
        const base = this.db
            .select({ count: sql<number>`count(*)` })
            .from(this.table as SQLiteTable);

        const qb = this.whereConds.length > 0
            ? base.where(and(...this.whereConds))
            : base;

        const result = await qb.all();
        const first = result[0];
        return Number(first?.count ?? 0);
    }

    /** Executes the final query with all applied modifiers. */
    async exec(): Promise<Record<string, unknown>[]> {
        if (this.paginateInfo && this.queryString.page !== undefined) {
            const total = await this.count();
            if (this.paginateInfo.offset >= total && total > 0) {
                throw new AppError("Esta página não existe", 404);
            }
        }

        const selection = (this.projection ?? this.columns) as Record<string, AnyColumn>;

        let qb = this.db
            .select(selection as never)
            .from(this.table as SQLiteTable)
            .$dynamic();

        if (this.whereConds.length > 0) {
            qb = qb.where(and(...this.whereConds));
        }

        if (this.orderBy.length > 0) {
            qb = qb.orderBy(...this.orderBy);
        }

        if (this.paginateInfo) {
            qb = qb.limit(this.paginateInfo.limit).offset(this.paginateInfo.offset);
        }

        return (await qb.all()) as Record<string, unknown>[];
    }
}
