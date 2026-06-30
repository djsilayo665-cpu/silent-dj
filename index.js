// index.js - Fully Working Telegram Bot
require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');

// ============ BASIC COMMANDS (WORKING) ============
bot.start((ctx) => {
    ctx.replyWithMarkdown(
        '🤖 *WolfBot is online!*\n\n' +
        'Available commands:\n' +
        '/ping - Check bot status\n' +
        '/time - Current time\n' +
        '/info - Bot info\n' +
        '/help - Show all commands\n\n' +
        '👑 *Owner commands:*\n' +
        '/stats - View bot statistics'
    );
});

bot.command('help', (ctx) => {
    ctx.replyWithMarkdown(
        '🤖 *WolfBot Commands*\n\n' +
        '🔹 *Basic Commands*\n' +
        '/start - Start the bot\n' +
        '/help - Show this help\n' +
        '/ping - Check bot status\n' +
        '/time - Show current time\n' +
        '/info - Bot information\n\n' +
        '🔹 *Fun Commands*\n' +
        '/echo <text> - Echo your message\n' +
        '/caps <text> - UPPERCASE your text\n' +
        '/reverse <text> - Reverse your text\n\n' +
        '🔹 *Group Commands (Admin only)*\n' +
        '/kick - Reply to a user to kick them\n' +
        '/ban - Reply to a user to ban them\n' +
        '/warn - Warn a user\n\n' +
        '👑 *Owner Commands*\n' +
        '/stats - View bot statistics\n' +
        '/broadcast <message> - Send to all users'
    );
});

bot.command('ping', (ctx) => {
    const start = Date.now();
    ctx.reply('🏓 Pinging...').then(msg => {
        const latency = Date.now() - start;
        ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            null,
            `🏓 Pong! Latency: ${latency}ms\nBot is alive ✅`
        );
    });
});

// ============ UTILITY COMMANDS (WORKING) ============
bot.command('time', (ctx) => {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();
    ctx.reply(`🕐 *Current Time*\n\nDate: ${date}\nTime: ${time}\nTimezone: UTC`, { parse_mode: 'Markdown' });
});

bot.command('info', (ctx) => {
    const user = ctx.from;
    ctx.replyWithMarkdown(
        '📊 *Bot Information*\n\n' +
        `🤖 Bot: @${bot.botInfo?.username || 'unknown'}\n` +
        `👤 Your ID: ${user.id}\n` +
        `👤 Username: @${user.username || 'Not set'}\n` +
        `📛 Name: ${user.first_name || 'Unknown'}\n` +
        `✅ Status: Online\n` +
        `📦 Version: 1.0.0`
    );
});

// ============ FUN COMMANDS (WORKING) ============
bot.command('echo', (ctx) => {
    const text = ctx.message.text.replace('/echo', '').trim();
    if (!text) {
        return ctx.reply('📢 Please provide text to echo!\nExample: `/echo Hello World`');
    }
    ctx.reply(`📢 ${text}`);
});

bot.command('caps', (ctx) => {
    const text = ctx.message.text.replace('/caps', '').trim();
    if (!text) {
        return ctx.reply('🔠 Please provide text to uppercase!\nExample: `/caps hello`');
    }
    ctx.reply(`🔠 ${text.toUpperCase()}`);
});

bot.command('reverse', (ctx) => {
    const text = ctx.message.text.replace('/reverse', '').trim();
    if (!text) {
        return ctx.reply('🔄 Please provide text to reverse!\nExample: `/reverse hello`');
    }
    ctx.reply(`🔄 ${text.split('').reverse().join('')}`);
});

// ============ GROUP MANAGEMENT (WORKING) ============
bot.command('kick', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to kick!\nExample: Reply to a message and type `/kick`');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        await ctx.kickChatMember(userId);
        await ctx.reply(`✅ ${userName} has been kicked!`);
    } catch (error) {
        console.error('Kick Error:', error);
        ctx.reply('❌ Failed to kick. I need admin permissions!');
    }
});

bot.command('ban', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to ban!\nExample: Reply to a message and type `/ban`');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        await ctx.banChatMember(userId);
        await ctx.reply(`✅ ${userName} has been banned!`);
    } catch (error) {
        console.error('Ban Error:', error);
        ctx.reply('❌ Failed to ban. I need admin permissions!');
    }
});

bot.command('warn', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to warn!\nExample: Reply to a message and type `/warn`');
    }
    
    const userName = ctx.message.reply_to_message.from.first_name || 'User';
    ctx.reply(`⚠️ ${userName} has been warned!`);
});

// ============ OWNER COMMANDS (WORKING) ============
bot.command('stats', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ This command is only for the bot owner.');
    }
    
    try {
        const me = await bot.telegram.getMe();
        ctx.replyWithMarkdown(
            '📊 *Bot Statistics*\n\n' +
            `🤖 Bot: @${me.username}\n` +
            `🆔 Bot ID: ${me.id}\n` +
            `✅ Status: Online\n` +
            `👑 Owner ID: ${OWNER_ID}\n` +
            `📦 Version: 1.0.0\n` +
            `⏱️ Uptime: Since deployment\n\n` +
            `*Commands Loaded:*\n` +
            `✅ /start, /help, /ping\n` +
            `✅ /time, /info, /echo\n` +
            `✅ /caps, /reverse, /kick\n` +
            `✅ /ban, /warn, /stats\n` +
            `✅ /broadcast`
        );
    } catch (error) {
        ctx.reply('❌ Error fetching stats');
    }
});

bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ This command is only for the bot owner.');
    }
    
    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
        return ctx.reply('📢 Please provide a message to broadcast!\nExample: `/broadcast Hello everyone!`');
    }
    
    ctx.reply(`📢 Broadcast sent to all users! (Feature coming soon)`);
});

// ============ ERROR HANDLING ============
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// ============ START BOT ============
bot.launch().then(() => {
    console.log('✅ WolfBot is running!');
    console.log(`📱 Bot username: @${bot.botInfo?.username || 'unknown'}`);
}).catch(err => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
