import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { CreateUserDTO, PublicUser } from "@shared/entities/User";
import { getDatabase } from "../config/database.js";
import { users, type UserRow } from "../db/schema/users.js";

const BCRYPT_ROUNDS = 12;

function toPublicUser(row: UserRow): PublicUser {
    const { password: _password, ...publicFields } = row;
    return publicFields;
}

export async function createUser(dto: CreateUserDTO): Promise<PublicUser> {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const [row] = await db
        .insert(users)
        .values({
            name: dto.name.trim(),
            email: dto.email.trim().toLowerCase(),
            password: passwordHash,
        })
        .returning();

    return toPublicUser(row);
}

export async function findUserById(id: number): Promise<PublicUser | null> {
    const db = getDatabase();
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toPublicUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const db = getDatabase();
    const [row] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);
    return row ?? null;
}

export function toPublic(row: UserRow): PublicUser {
    return toPublicUser(row);
}
