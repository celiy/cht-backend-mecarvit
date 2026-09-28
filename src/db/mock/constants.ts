export const MOCK_COMPANY_NAME = "Oficina Mock Mecarvit";

export const MOCK_COMPANY_NAMES = [
    MOCK_COMPANY_NAME,
    "Oficina Mock Norte"
] as const;

export const MOCK_LOGIN = {
    nome: "Alex Superadmin",
    email: "superadmin@mock.mecarvit",
    senha: "Mock1234",
    cpf: "52998224725"
} as const;

export const MOCK_STAFF_PASSWORD = "Mock1234";

export const MOCK_SHARED_STAFF = [
    {
        nome: "Carla Compartilhada",
        email: "gerente.compartilhada@mock.mecarvit",
        cpf: "39053344705"
    },
    {
        nome: "Diego Compartilhado",
        email: "mecanico.compartilhado@mock.mecarvit",
        cpf: "15350946056"
    }
] as const;

export const MOCK_COUNTS = {
    staff: 48,
    clients: 220,
    services: 24,
    extraFinance: 600,
    orders: 900
} as const;
