import type { PublicUser } from "../entities/User.js";

declare global {
    namespace Express {
        interface Request {
            user?: PublicUser;
        }
    }
}

export {};
