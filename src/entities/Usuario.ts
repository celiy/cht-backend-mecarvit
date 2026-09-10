export interface PublicUsuario {
    cpf: string;
    nome: string;
    email: string;
    ativo: boolean;
    senhaInicial: boolean;
    fundador: boolean;
    cargoId: number;
    empresaId: number;
    nivelAcesso: string;
    cargoNome: string;
    criadoEm: Date;
    modificadoEm: Date;
}

export interface AuthUsuario extends PublicUsuario {
    senha: string;
}
