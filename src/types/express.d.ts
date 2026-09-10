import type { PublicUsuario } from "../entities/Usuario.js";
import type { AppDatabase } from "../config/database.js";

declare global {
    namespace Express {
        interface Request {
            user?: PublicUsuario;
            empresaId?: number;
            db?: AppDatabase;
        }
    }
}

export {};
