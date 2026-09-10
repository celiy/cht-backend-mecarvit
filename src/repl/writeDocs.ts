import { createApp } from "../app.js";
import { documentRoutes } from "./documentRoutes.js";

const files = await documentRoutes(createApp());

console.log(files.length === 0 ? "Nenhuma rota encontrada" : files.join("\n"));
