import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { CreateUserDTO, PublicUser, UpdateUserDTO } from "../entities/User.js";
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

export async function updateUserById(
    id: number,
    dto: UpdateUserDTO
): Promise<PublicUser | null> {
    const db = getDatabase();

    const updateData: Partial<Pick<UserRow, "name" | "email" | "password" | "modifiedAt">> = {};

    if (dto.name !== undefined) {
        updateData.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
        updateData.email = dto.email.trim().toLowerCase();
    }

    if (dto.password !== undefined) {
        updateData.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
        return null;
    }

    updateData.modifiedAt = new Date();

    const [row] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

    return row ? toPublicUser(row) : null;
}

export async function deleteUserById(id: number): Promise<PublicUser | null> {
    const db = getDatabase();
    const [row] = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();

    return row ? toPublicUser(row) : null;
}