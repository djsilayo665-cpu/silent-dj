// index.js - Silent DJ Bot with Dot Commands
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const moment = require('moment-timezone');
const ytSearch = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');

// ============ CONFIGURATION ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const BOT_NAME = process.env.BOT_NAME || 'Silent DJ';
const BOT_PREFIX = process.env.BOT_PREFIX || '.';

// ============ TELEGRAM BOT ============
const bot = new Telegraf(TELEGRAM_TOKEN);

// ============ COMMAND HANDLERS ============

// Play command handler
async function handlePlayCommand(ctx, query) {
    if (!query) {
        return ctx.reply('🎵 Please specify a song!\nExample: `.play Despacito`');
    }

    await ctx.reply('🔍 Searching for "' + query + '"...');

    try {
        const result = await ytSearch(query);

        if (!result || !result.videos || result.videos.length === 0) {
            return ctx.reply('❌ No results found for: "' + query + '"');
        }

        const video = result.videos[0];

        await ctx.replyWithMarkdown(
            `🎵 *Now Playing: ${video.title}*\n\n` +
            `👤 *Artist:* ${video.author.name}\n` +
            `⏱️ *Duration:* ${video.duration.timestamp}\n` +
            `👀 *Views:* ${video.views.toLocaleString()}\n` +
            `📅 *Uploaded:* ${video.ago}\n\n` +
            `🔗 [Watch on YouTube](${video.url})`
        );
    } catch (error) {
        console.error('Play error:', error);
        ctx.reply('❌ Error searching for song. Please try again.');
    }
}

// Ping command handler
async function handlePingCommand(ctx) {
    const start = Date.now();
    ctx.reply('🏓 Pinging...').then(msg => {
        const latency = Date.now() - start;
        ctx.telegram.editMessageText(
            msg.chat.id,
            msg.message_id,
            null,
            `🏓 *Pong!*\nLatency: ${latency}ms\nBot: ✅ Online`,
            { parse_mode: 'Markdown' }
        );
    });
}

// Help command handler
async function handleHelpCommand(ctx) {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Help*\n\n` +
        `*🎵 Music*\n` +
        `${BOT_PREFIX}play <song>\n` +
        `${BOT_PREFIX}lyrics <song>\n\n` +
        `*🎬 Video*\n` +
        `${BOT_PREFIX}video <song>\n` +
        `${BOT_PREFIX}yt <url>\n\n` +
        `*🖼️ Pictures*\n` +
        `${BOT_PREFIX}image <prompt>\n` +
        `${BOT_PREFIX}art <prompt>\n` +
        `${BOT_PREFIX}anime <prompt>\n` +
        `${BOT_PREFIX}logo <text>\n\n` +
        `*🤖 AI*\n` +
        `${BOT_PREFIX}ai <question>\n` +
        `${BOT_PREFIX}translate <text>\n` +
        `${BOT_PREFIX}summarize <text>\n\n` +
        `*🎮 Games*\n` +
        `${BOT_PREFIX}dice\n` +
        `${BOT_PREFIX}coinflip\n` +
        `${BOT_PREFIX}joke\n\n` +
        `*🛠️ Utility*\n` +
        `${BOT_PREFIX}ping\n` +
        `${BOT_PREFIX}time\n` +
        `${BOT_PREFIX}info\n\n` +
        `Send /menu to open the menu.`
    );
}

// Time command handler
async function handleTimeCommand(ctx) {
    const now = moment();
    ctx.replyWithMarkdown(
        `🕐 *Current Time*\n\n` +
        `📅 Date: ${now.format('MMMM D, YYYY')}\n` +
        `🕐 Time: ${now.format('h:mm:ss A')}\n` +
        `📆 Day: ${now.format('dddd')}\n` +
        `🌍 Timezone: UTC`
    );
}

// Info command handler
async function handleInfoCommand(ctx) {
    const user = ctx.from;
    ctx.replyWithMarkdown(
        `📊 *${BOT_NAME} Bot Information*\n\n` +
        `🤖 Bot: @${bot.botInfo?.username || 'unknown'}\n` +
        `📦 Version: 2.0.0\n` +
        `👤 Your ID: ${user.id}\n` +
        `👤 Username: @${user.username || 'Not set'}\n` +
        `📊 Commands: 30+\n` +
        `🎵 Music • 🎬 Video • 🖼️ Pictures • 🤖 AI`
    );
}

// Dice command handler
async function handleDiceCommand(ctx) {
    const result = Math.floor(Math.random() * 6) + 1;
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    ctx.reply(`🎲 You rolled: *${result}* ${emojis[result - 1]}`, { parse_mode: 'Markdown' });
}

// Coin flip command handler
async function handleCoinFlipCommand(ctx) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    ctx.reply(`🪙 *${result}!*`, { parse_mode: 'Markdown' });
}

// Joke command handler
async function handleJokeCommand(ctx) {
    try {
        const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
        const joke = response.data;
        ctx.reply(`😂 *${joke.setup}*\n\n${joke.punchline}`, { parse_mode: 'Markdown' });
    } catch (error) {
        ctx.reply('😂 Why don\'t scientists trust atoms? Because they make up everything!');
    }
}

// ============ DOT COMMAND HANDLER ============
bot.use(async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();
    
    const text = ctx.message.text;
    
    if (text.startsWith('.')) {
        const commandText = text.substring(1);
        const parts = commandText.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        
        console.log(`📩 Dot command: ${command} with args: ${args}`);
        
        switch (command) {
            case 'play':
                await handlePlayCommand(ctx, args);
                return;
            case 'ping':
                await handlePingCommand(ctx);
                return;
            case 'help':
                await handleHelpCommand(ctx);
                return;
            case 'time':
                await handleTimeCommand(ctx);
                return;
            case 'info':
                await handleInfoCommand(ctx);
                return;
            case 'dice':
                await handleDiceCommand(ctx);
                return;
            case 'coinflip':
                await handleCoinFlipCommand(ctx);
                return;
            case 'joke':
                await handleJokeCommand(ctx);
                return;
            case 'menu':
                await bot.telegram.sendMessage(ctx.chat.id, 
                    `🎵 *${BOT_NAME} Menu*\n\nSend /menu to open the full menu.`, 
                    { parse_mode: 'Markdown' }
                );
                return;
            default:
                await ctx.reply(`❌ Unknown command: .${command}\n\nType .help for available commands.`);
                return;
        }
    }
    
    return next();
});

// ============ SLASH COMMANDS ============

bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        `Welcome to ${BOT_NAME}! I can help you with:\n\n` +
        `🎵 Music - Play songs from YouTube\n` +
        `🎬 Video - Download videos\n` +
        `🖼️ Pictures - Generate images\n` +
        `🤖 AI - Chat and get answers\n\n` +
        `Try: .play Despacito\n` +
        `Send /menu to see all commands.`
    );
});

// Menu command
bot.command('menu', (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎵 Music', 'menu_music')],
        [Markup.button.callback('🎬 Video', 'menu_video')],
        [Markup.button.callback('🖼️ Pictures', 'menu_pictures')],
        [Markup.button.callback('🤖 AI', 'menu_ai')],
        [Markup.button.callback('🎮 Games', 'menu_games')],
        [Markup.button.callback('🛠️ Utility', 'menu_utility')]
    ]);
    
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        'Select a category:',
        keyboard
    );
});

// Menu callbacks
bot.action('menu_music', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎵 *Music Commands*\n\n` +
        `${BOT_PREFIX}play <song> - Play a song\n` +
        `${BOT_PREFIX}lyrics <song> - Get lyrics`
    );
});

bot.action('menu_video', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎬 *Video Commands*\n\n` +
        `${BOT_PREFIX}video <song> - Download video\n` +
        `${BOT_PREFIX}yt <url> - Download YouTube`
    );
});

bot.action('menu_pictures', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🖼️ *Picture Commands*\n\n` +
        `${BOT_PREFIX}image <prompt> - Generate AI image\n` +
        `${BOT_PREFIX}art <prompt> - Art style image\n` +
        `${BOT_PREFIX}anime <prompt> - Anime style\n` +
        `${BOT_PREFIX}logo <text> - Generate logo`
    );
});

bot.action('menu_ai', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🤖 *AI Commands*\n\n` +
        `${BOT_PREFIX}ai <question> - Ask AI\n` +
        `${BOT_PREFIX}translate <text> - Translate\n` +
        `${BOT_PREFIX}summarize <text> - Summarize`
    );
});

bot.action('menu_games', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎮 *Game Commands*\n\n` +
        `${BOT_PREFIX}dice - Roll a dice\n` +
        `${BOT_PREFIX}coinflip - Flip a coin\n` +
        `${BOT_PREFIX}joke - Random joke`
    );
});

bot.action('menu_utility', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🛠️ *Utility Commands*\n\n` +
        `${BOT_PREFIX}ping - Check bot status\n` +
        `${BOT_PREFIX}time - Current time\n` +
        `${BOT_PREFIX}info - Bot info`
    );
});

// Slash versions of commands (for compatibility)
bot.command('play', async (ctx) => {
    const query = ctx.message.text.replace('/play', '').trim();
    await handlePlayCommand(ctx, query);
});

bot.command('ping', handlePingCommand);
bot.command('help', handleHelpCommand);
bot.command('time', handleTimeCommand);
bot.command('info', handleInfoCommand);
bot.command('dice', handleDiceCommand);
bot.command('coinflip', handleCoinFlipCommand);
bot.command('joke', handleJokeCommand);

// ============ ERROR HANDLING ============
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// ============ START BOT ============
bot.launch().then(() => {
    console.log(`🎵 ${BOT_NAME} Bot is running!`);
    console.log(`📱 @${bot.botInfo?.username || 'unknown'}`);
    console.log(`📋 Both / and . commands work!`);
    console.log(`📊 Try: .play Despacito or /play Despacito`);
}).catch(err => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
