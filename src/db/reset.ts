import { env } from "../config/env.js";
import { resetAllData } from "../config/database.js";

if (env.isProduction && process.env.FORCE_RESET !== "1") {
    console.error("Recusa: NODE_ENV=production. Use FORCE_RESET=1 se realmente quiser apagar os dados.");
    process.exit(1);
}

console.log(`Limpando dados em ${env.empresasDir}...`);

const removed = resetAllData();

if (removed.length === 0) {
    console.log("Nenhum arquivo de dados encontrado.");
} else {
    for (const file of removed) {
        console.log(`Removido: ${file}`);
    }

    console.log(`${removed.length} arquivo(s) apagado(s).`);
}

console.log("Pronto. Se o servidor estiver rodando, reinicie (`npm run dev`).");
