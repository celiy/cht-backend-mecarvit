import cron from "node-cron";

// 0 0 * * * -> Runs at midnight
cron.schedule("0 0 * * *", async () => {
    // placeholder
});

// 0 3 * * * -> Runs at 3 AM
cron.schedule("0 3 * * *", async () => {
    // placeholder
});

// 0 4 * * * -> Runs at 4 AM
cron.schedule("0 4 * * *", async () => {
    // placeholder
});

// 0 0 * * 0 -> Runs at Sunday midnight
cron.schedule("0 0 * * 0", async () => {
    // placeholder
});
