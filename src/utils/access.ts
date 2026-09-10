export function hasAccess(nivelAcesso: string, digit: string): boolean {
    if (nivelAcesso.includes("0")) {
        return true;
    }

    return nivelAcesso.includes(digit);
}

export function isSuperadmin(nivelAcesso: string): boolean {
    return nivelAcesso.includes("0");
}
