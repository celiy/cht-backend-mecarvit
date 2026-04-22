import { closeDatabase, runMigrations } from "../config/database.js";

console.log("Applying migrations...");

try {
    runMigrations();
    console.log("Migrations applied successfully.");
} catch (err) {
    console.error("Failed to apply migrations:", err);
    process.exitCode = 1;
} finally {
    closeDatabase();
}
