import cron from 'node-cron';

// 0 0 * * * -> Roda à meia noite
cron.schedule('0 0 * * *', async () => {
    // placeholder
});

// 0 3 * * * -> Roda às 3 da manhã
cron.schedule('0 3 * * *', async () => {
    // placeholder
});

// 0 4 * * * -> Roda às 4 da manhã
cron.schedule('0 4 * * *', async () => {
    // placeholder
});

// 0 0 * * 0 -> Roda à meia noite de domingo
cron.schedule('0 0 * * 0', async () => {
    // placeholder
});
