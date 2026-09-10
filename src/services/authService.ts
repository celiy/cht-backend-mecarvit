import bcrypt from "bcrypt";
import { digitsOnly } from "@shared/validators/mecarvit";
import {
    createCompanyDatabase,
    listLocalEmpresaIds,
    listLocalEmpresas,
    openCompany,
    empresaExists,
    removeCompanyFiles
} from "../config/database.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { isSuperadmin } from "../utils/access.js";
import * as usuarioService from "./usuarioService.js";
import type { AuthUsuario, PublicUsuario } from "../entities/Usuario.js";

function publicFromAuth(user: PublicUsuario): PublicUsuario {
    return user;
}

export async function cadastrarEmpresa(dto: {
    empresa: { nome: string };
    usuario: { cpf: string; nome: string; email: string; senha: string };
}) {
    const { empresaId, db } = await createCompanyDatabase(dto.empresa.nome);

    try {
        const usuario = await usuarioService.createUsuario(db, {
            cpf: dto.usuario.cpf,
            nome: dto.usuario.nome,
            email: dto.usuario.email,
            senha: dto.usuario.senha,
            cargoId: 1,
            empresaId,
            fundador: true,
            senhaInicial: false,
            ativo: true
        });
        const token = signToken({
            sub: usuario.cpf,
            email: usuario.email,
            empresaId
        });

        return {
            token,
            usuario,
            empresa: { id: empresaId, nome: dto.empresa.nome.trim() },
            precisaTrocarSenha: false
        };
    } catch (error) {
        removeCompanyFiles(empresaId);
        throw error;
    }
}

export async function listarEmpresasLocais() {
    return listLocalEmpresas();
}

export async function login(dto: { email: string; senha: string; empresaId?: number }) {
    const email = dto.email.trim().toLowerCase();

    if (dto.empresaId !== undefined) {
        if (!empresaExists(dto.empresaId)) {
            throw new AppError("Empresa não encontrada", 404, { empresaId: "Empresa não encontrada" });
        }

        const db = openCompany(dto.empresaId);
        const user = await usuarioService.findAuthByEmail(db, email);

        if (!user || !(await bcrypt.compare(dto.senha, user.senha))) {
            throw new AppError("Credenciais inválidas", 401);
        }

        if (!user.ativo) {
            throw new AppError("Usuário inativo", 403);
        }

        const { senha: _senha, ...publicUser } = user;
        const token = signToken({
            sub: publicUser.cpf,
            email: publicUser.email,
            empresaId: dto.empresaId
        });

        return {
            token,
            usuario: publicFromAuth(publicUser),
            empresa: { id: dto.empresaId },
            precisaTrocarSenha: publicUser.senhaInicial
        };
    }

    const matches: Array<{ empresaId: number; user: AuthUsuario }> = [];

    for (const empresaId of listLocalEmpresaIds()) {
        const db = openCompany(empresaId);
        const user = await usuarioService.findAuthByEmail(db, email);

        if (!user || !(await bcrypt.compare(dto.senha, user.senha))) {
            continue;
        }

        if (!user.ativo) {
            continue;
        }

        matches.push({ empresaId, user });
    }

    const gestores = matches.filter((item) => item.user && isSuperadmin(item.user.nivelAcesso));

    if (gestores.length === 1 && gestores[0]?.user) {
        const match = gestores[0];
        const { senha: _senha, ...publicUser } = match.user;
        const token = signToken({
            sub: publicUser.cpf,
            email: publicUser.email,
            empresaId: match.empresaId
        });

        return {
            token,
            usuario: publicFromAuth(publicUser),
            empresa: { id: match.empresaId },
            precisaTrocarSenha: publicUser.senhaInicial
        };
    }

    if (matches.length > 0) {
        throw new AppError("Selecione a empresa para continuar", 400, {
            empresaId: "empresaId é obrigatório para este usuário"
        });
    }

    throw new AppError("Credenciais inválidas", 401);
}

export function normalizeCpf(cpf: string): string {
    return digitsOnly(cpf);
}
