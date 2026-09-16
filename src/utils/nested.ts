import { digitsOnly } from "@shared/validators/mecarvit";

/** PUT/PATCH body that only replaces the pagamentos list (modal de pagamentos). */
export function isPagamentosOnlyBody(body: Record<string, unknown>): boolean {
    const keys = Object.keys(body).filter((key) => body[key] !== undefined);

    return keys.length === 1 && keys[0] === "pagamentos";
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    return null;
}

export function asPagamentos(value: unknown): Array<{
    id?: number;
    tipo: string;
    valor: number;
}> | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => {
        const record = asRecord(item) ?? {};
        const idRaw = record.id;
        const id =
            idRaw === undefined || idRaw === null || idRaw === ""
                ? undefined
                : Number(idRaw);

        return {
            id: Number.isInteger(id) && id! > 0 ? id : undefined,
            tipo: String(record.tipo ?? ""),
            valor: Number(record.valor)
        };
    });
}

export function asItens(value: unknown): Array<{
    servicoId?: number;
    servicoNome?: string;
    quantidade: number;
    valorObra: number;
    valorPecas?: number | null;
}> | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => {
        const record = asRecord(item) ?? {};
        const servicoIdRaw = record.servicoId;
        const servicoId =
            servicoIdRaw === undefined || servicoIdRaw === null || servicoIdRaw === ""
                ? undefined
                : Number(servicoIdRaw);
        const servicoNomeRaw = record.servicoNome;

        return {
            servicoId: Number.isInteger(servicoId) && servicoId! > 0 ? servicoId : undefined,
            servicoNome:
                servicoNomeRaw === undefined || servicoNomeRaw === null
                    ? undefined
                    : String(servicoNomeRaw),
            quantidade: Number(record.quantidade),
            valorObra: Number(record.valorObra),
            valorPecas: record.valorPecas === undefined || record.valorPecas === null
                ? null
                : Number(record.valorPecas)
        };
    });
}

export function asResponsaveis(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => {
        if (typeof item === "string") {
            return digitsOnly(item);
        }

        const record = asRecord(item);

        return digitsOnly(String(record?.cpf ?? ""));
    });
}

export function asEnderecoIds(value: unknown): number[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => Number(item));
}

export function asEnderecos(value: unknown): Array<{
    estado: string;
    cidade: string;
    cep: string;
    bairro: string;
    rua: string;
    numero: number;
    complemento: string;
}> | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => {
        const record = asRecord(item) ?? {};

        return {
            estado: String(record.estado ?? ""),
            cidade: String(record.cidade ?? ""),
            cep: String(record.cep ?? ""),
            bairro: String(record.bairro ?? ""),
            rua: String(record.rua ?? ""),
            numero: Number(record.numero),
            complemento: String(record.complemento ?? "")
        };
    });
}

export function asVeiculos(value: unknown): Array<{
    modelo: string;
    placa: string;
    tipo?: string;
    kilometragem?: number;
    dataTrocaOleo?: Date | string;
    chassi?: string;
}> | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => {
        const record = asRecord(item) ?? {};

        return {
            modelo: String(record.modelo ?? ""),
            placa: String(record.placa ?? ""),
            tipo: record.tipo === undefined ? undefined : String(record.tipo),
            kilometragem: record.kilometragem === undefined ? undefined : Number(record.kilometragem),
            dataTrocaOleo: record.dataTrocaOleo as string | undefined,
            chassi: record.chassi === undefined ? undefined : String(record.chassi)
        };
    });
}
