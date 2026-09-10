import request from "supertest";
import type { Express } from "express";

export const SENHA = "SenhaForte1";
export const SENHA_NOVA = "OutraSenha9";

let sequence = 1;

function cpfDigit(nums: number[], initialFactor: number): number {
    let sum = 0;
    let factor = initialFactor;

    for (const value of nums) {
        sum += value * factor;
        factor -= 1;
    }

    const rest = (sum * 10) % 11;

    return rest === 10 ? 0 : rest;
}

export function uniqueCpf(): string {
    const base = String(200000000 + sequence).padStart(9, "0").slice(-9);
    sequence += 1;
    const nums = base.split("").map(Number);
    const d1 = cpfDigit(nums, 10);
    const d2 = cpfDigit([...nums, d1], 11);

    return `${base}${d1}${d2}`;
}

function cnpjDigit(nums: number[]): number {
    let factor = nums.length - 7;
    let sum = 0;

    for (const value of nums) {
        sum += value * factor;
        factor -= 1;

        if (factor < 2) {
            factor = 9;
        }
    }

    const result = 11 - (sum % 11);

    return result > 9 ? 0 : result;
}

export function uniqueCnpj(): string {
    const base = String(120000000000 + sequence).padStart(12, "0").slice(-12);
    sequence += 1;
    const nums = base.split("").map(Number);
    const d1 = cnpjDigit(nums);
    const d2 = cnpjDigit([...nums, d1]);

    return `${base}${d1}${d2}`;
}

export function uniqueEmail(prefix = "user"): string {
    sequence += 1;
    return `${prefix}${sequence}@oficina.test`;
}

export function bearer(token: string) {
    return { Authorization: `Bearer ${token}` };
}

export async function cadastrarOficina(
    app: Express,
    overrides?: {
        empresaNome?: string;
        nome?: string;
        email?: string;
        cpf?: string;
        senha?: string;
    }
) {
    const cpf = overrides?.cpf ?? uniqueCpf();
    const email = overrides?.email ?? uniqueEmail("gestor");
    const senha = overrides?.senha ?? SENHA;
    const response = await request(app)
        .post("/api/cadastro")
        .send({
            empresa: { nome: overrides?.empresaNome ?? `Oficina ${sequence}` },
            usuario: {
                cpf,
                nome: overrides?.nome ?? "Ana Gestora",
                email,
                senha
            }
        });

    return {
        response,
        cpf,
        email,
        senha,
        token: response.body?.data?.token as string | undefined,
        empresaId: response.body?.data?.empresa?.id as number | undefined,
        usuario: response.body?.data?.usuario as Record<string, unknown> | undefined
    };
}

export async function criarCargo(app: Express, token: string, nivelAcesso = "2345", nome = "Operacional") {
    const response = await request(app)
        .post("/api/cargo")
        .set(bearer(token))
        .send({ nome, nivelAcesso })
        .expect(201);

    return response.body.data as { id: number; nome: string; nivelAcesso: string };
}

export async function criarFuncionario(
    app: Express,
    token: string,
    cargoId: number,
    overrides?: { nome?: string; email?: string; senha?: string }
) {
    const cpf = uniqueCpf();
    const email = overrides?.email ?? uniqueEmail("func");
    const senha = overrides?.senha ?? SENHA;
    const response = await request(app)
        .post("/api/usuario")
        .set(bearer(token))
        .send({
            cpf,
            nome: overrides?.nome ?? "Bruno Funcionario",
            email,
            senha,
            cargoId
        })
        .expect(201);

    return {
        cpf,
        email,
        senha,
        usuario: response.body.data as Record<string, unknown>
    };
}

export const enderecoPadrao = {
    estado: "SP",
    cidade: "Sao Paulo",
    cep: "01001000",
    bairro: "Se",
    rua: "Praca da Se",
    numero: 1,
    complemento: "Sala 1"
};
