// index.js - Minimal working version
require('dotenv').config();
const { Telegraf } = require('telegraf');

console.log('🚀 Silent DJ Bot starting...');

// Check for required token
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
    process.exit(1);
}

// Create bot instance
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Handle /start command
bot.start((ctx) => {
    ctx.reply('🎵 Silent DJ Bot is online! Send /help for commands.');
});

// Handle /help command
bot.command('help', (ctx) => {
    ctx.reply(
        '🤖 *Silent DJ Bot Commands*\n\n' +
        '/start - Start the bot\n' +
        '/play <song> - Play a song\n' +
        '/help - Show this help'
    );
});

// Handle /play command
bot.command('play', (ctx) => {
    const songName = ctx.message.text.replace('/play', '').trim();
    if (!songName) {
        return ctx.reply('🎵 Please specify a song!\nExample: `/play Despacito`');
    }
    ctx.reply(`🔍 Searching for "${songName}"...\n\n🎵 Now playing: ${songName}`);
});

// Simple error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// Start the bot
bot.launch().then(() => {
    console.log('✅ Bot is running!');
    console.log('📱 Bot username: @' + process.env.BOT_NAME || 'silent_dj_bot');
}).catch(err => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
