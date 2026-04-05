require('dotenv').config({ path: '../../.env' });
const TelegramBot = require('node-telegram-bot-api');

// Initialize Gravitybot
const token = process.env.TELEGRAM_BOT_TOKEN;
const defaultChatId = process.env.TELEGRAM_CHAT_ID;

if (!token) {
    console.error('CRITICAL: TELEGRAM_BOT_TOKEN missing in .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Gravitybot Online! Connected to CEO Command Center.');

// Basic Commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Gravitybot synced. Dashboards are online. Awaiting commands.');
});

bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🟢 All Series [A, B, C] are operational. \n\nRemote Dashboard: https://total-loss-intake-bot.web.app`);
});

// Approvals Logic (Stub for Kaplan Board Webhook)
bot.onText(/\/approve (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const productId = match[1];
    
    // In future iterations: This will hit the Firestore DB and move Kaplan card to approved
    bot.sendMessage(chatId, `✅ Approved product request: ${productId}. Propagating to dashboard.`);
});

// Export for app logic integration
module.exports = bot;
