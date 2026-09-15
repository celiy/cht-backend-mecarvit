import { integer } from "drizzle-orm/sqlite-core";

export function timestamps() {
    return {
        criadoEm: integer("criado_em", { mode: "timestamp" })
            .notNull()
            .$defaultFn(() => new Date()),
        modificadoEm: integer("modificado_em", { mode: "timestamp" })
            .notNull()
            .$defaultFn(() => new Date())
            .$onUpdateFn(() => new Date())
    };
}

export function mockFlag() {
    return {
        mock: integer("mock", { mode: "boolean" }).notNull().default(false)
    };
}
