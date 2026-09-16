import { digitsOnly } from "@shared/validators/mecarvit";

export type EnderecoFields = {
    estado: string;
    cidade: string;
    cep: string;
    bairro: string;
    rua: string;
    numero: number;
    complemento: string;
};

export function normalizeEnderecoFields(item: EnderecoFields): EnderecoFields {
    return {
        estado: item.estado.trim().toUpperCase(),
        cidade: item.cidade.trim(),
        cep: digitsOnly(item.cep),
        bairro: item.bairro.trim(),
        rua: item.rua.trim(),
        numero: Number(item.numero),
        complemento: (item.complemento ?? "").trim()
    };
}

export function enderecosMatch(a: EnderecoFields, b: EnderecoFields): boolean {
    const left = normalizeEnderecoFields(a);
    const right = normalizeEnderecoFields(b);

    return (
        left.estado === right.estado
        && left.cidade === right.cidade
        && left.cep === right.cep
        && left.bairro === right.bairro
        && left.rua === right.rua
        && left.numero === right.numero
        && left.complemento === right.complemento
    );
}
