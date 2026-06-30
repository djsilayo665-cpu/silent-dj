// index.js - Silent DJ Bot (WhatsApp + Telegram)
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const axios = require('axios');
const moment = require('moment-timezone');
const ytSearch = require('yt-search');
const qrcode = require('qrcode-terminal');

// ============ CONFIGURATION ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const BOT_NAME = process.env.BOT_NAME || 'Silent DJ';
const BOT_PREFIX = process.env.BOT_PREFIX || '.';

// ============ TELEGRAM BOT ============
const telegramBot = new Telegraf(TELEGRAM_TOKEN);

// ============ WHATSAPP CONNECTION ============
let whatsappSock = null;
let whatsappConnected = false;

async function connectWhatsApp() {
    console.log('📱 Connecting to WhatsApp...');
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./session');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Silent DJ', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 Scan this QR code with WhatsApp:');
                qrcode.generate(qr, { small: true });
            }
            
            if (connection === 'open') {
                whatsappConnected = true;
                console.log('✅ WhatsApp connected successfully!');
                console.log(`📱 Bot is ready on WhatsApp!`);
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('🔄 Reconnecting to WhatsApp...');
                    setTimeout(connectWhatsApp, 5000);
                } else {
                    console.log('❌ WhatsApp logged out. Please restart.');
                }
            }
        });

        // Handle WhatsApp messages
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.key.fromMe && msg.message) {
                await handleWhatsAppMessage(msg, sock);
            }
        });

        whatsappSock = sock;
        return sock;
    } catch (error) {
        console.error('❌ WhatsApp connection error:', error);
        setTimeout(connectWhatsApp, 10000);
    }
}

// ============ MESSAGE HANDLERS ============

// Handle WhatsApp messages
async function handleWhatsAppMessage(msg, sock) {
    try {
        let messageText = '';
        let sender = msg.key.remoteJid;
        
        // Extract text
        if (msg.message.conversation) {
            messageText = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage?.caption) {
            messageText = msg.message.imageMessage.caption;
        }
        
        if (!messageText) return;
        
        console.log(`📩 WhatsApp message from ${sender}: ${messageText}`);
        
        // Process command
        const response = await processCommand(messageText, 'whatsapp', sender);
        
        if (response) {
            await sock.sendMessage(sender, { text: response });
        }
    } catch (error) {
        console.error('❌ Error handling WhatsApp message:', error);
    }
}

// Handle Telegram messages
telegramBot.on('text', async (ctx) => {
    try {
        const messageText = ctx.message.text;
        const userId = ctx.from.id;
        
        const response = await processCommand(messageText, 'telegram', userId);
        
        if (response) {
            await ctx.reply(response);
        }
    } catch (error) {
        console.error('❌ Error handling Telegram message:', error);
        ctx.reply('❌ An error occurred. Please try again.');
    }
});

// ============ COMMAND PROCESSOR ============
async function processCommand(text, platform, userId) {
    // Remove prefix if present
    let command = text;
    if (text.startsWith(BOT_PREFIX)) {
        command = text.substring(1);
    }
    
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    // ============ MUSIC COMMANDS ============
    if (cmd === 'play' || cmd === 'p') {
        if (!args) return '🎵 Please specify a song!\nExample: `.play Despacito`';
        
        try {
            const result = await ytSearch(args);
            if (!result || !result.videos || result.videos.length === 0) {
                return '❌ No results found for this song.';
            }
            
            const video = result.videos[0];
            return `🎵 *Now Playing: ${video.title}*\n` +
                   `👤 Artist: ${video.author.name}\n` +
                   `⏱️ Duration: ${video.duration.timestamp}\n` +
                   `🔗 ${video.url}`;
        } catch (error) {
            return '❌ Error searching for song. Please try again.';
        }
    }
    
    if (cmd === 'help' || cmd === 'h') {
        return getHelpText(platform);
    }
    
    if (cmd === 'menu') {
        return getMenuText(platform);
    }
    
    // ============ UTILITY COMMANDS ============
    if (cmd === 'ping') {
        return '🏓 Pong! Bot is alive ✅';
    }
    
    if (cmd === 'time') {
        const now = moment();
        return `🕐 *Current Time*\n` +
               `📅 Date: ${now.format('MMMM D, YYYY')}\n` +
               `🕐 Time: ${now.format('h:mm:ss A')}\n` +
               `🌍 Timezone: UTC`;
    }
    
    if (cmd === 'info') {
        return `📊 *${BOT_NAME} Bot*\n\n` +
               `🤖 Platform: ${platform}\n` +
               `📦 Version: 2.0.0\n` +
               `✅ Status: Online\n` +
               `🎵 Music | 🤖 AI | 🎮 Games | 🛠️ Utility`;
    }
    
    // ============ AI COMMANDS ============
    if (cmd === 'ai') {
        if (!args) return '🤖 Please ask a question!\nExample: `.ai What is AI?`';
        return `🤖 *You asked:* "${args}"\n\n*(AI feature coming soon!)*`;
    }
    
    // ============ GAME COMMANDS ============
    if (cmd === 'dice') {
        const result = Math.floor(Math.random() * 6) + 1;
        const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return `🎲 You rolled: *${result}* ${emojis[result - 1]}`;
    }
    
    if (cmd === 'coinflip' || cmd === 'coin') {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return `🪙 *${result}!*`;
    }
    
    if (cmd === 'joke') {
        try {
            const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
            const joke = response.data;
            return `😂 *${joke.setup}*\n\n${joke.punchline}`;
        } catch {
            return '😂 Why don\'t scientists trust atoms? Because they make up everything!';
        }
    }
    
    // ============ GROUP MANAGEMENT (Telegram only) ============
    if (platform === 'telegram') {
        // These only work on Telegram
        if (cmd === 'kick' || cmd === 'ban' || cmd === 'promote' || cmd === 'mute') {
            return '👥 *Group Management*\n\n' +
                   'To use this command on Telegram:\n' +
                   '1. Reply to a user\'s message\n' +
                   '2. Type the command\n' +
                   '3. Example: `/kick` (reply to user)';
        }
    }
    
    // ============ HELP FOR WHATSAPP ============
    if (platform === 'whatsapp' && cmd === 'start') {
        return `🎵 *${BOT_NAME} Bot*\n\n` +
               `Welcome to ${BOT_NAME}!\n` +
               `Type .help to see available commands.`;
    }
    
    // Unknown command
    return `❌ Unknown command: ${cmd}\n\nType ${BOT_PREFIX}help to see available commands.`;
}

// ============ HELP TEXT ============
function getHelpText(platform) {
    const prefix = BOT_PREFIX;
    
    let text = `🎵 *${BOT_NAME} Bot - Help*\n\n`;
    text += `*Music Commands*\n`;
    text += `${prefix}play <song> - Play a song\n`;
    text += `${prefix}p <song> - Short for play\n\n`;
    
    text += `*Game Commands*\n`;
    text += `${prefix}dice - Roll a dice\n`;
    text += `${prefix}coinflip - Flip a coin\n`;
    text += `${prefix}joke - Random joke\n\n`;
    
    text += `*Utility Commands*\n`;
    text += `${prefix}ping - Check bot status\n`;
    text += `${prefix}time - Current time\n`;
    text += `${prefix}info - Bot info\n`;
    text += `${prefix}menu - Show menu\n\n`;
    
    text += `*AI Commands*\n`;
    text += `${prefix}ai <question> - Ask AI\n`;
    
    if (platform === 'telegram') {
        text += `\n*Group Commands (Telegram only)*\n`;
        text += `/kick - Kick user (reply)\n`;
        text += `/ban - Ban user (reply)\n`;
        text += `/promote - Promote user (reply)\n`;
        text += `/mute - Mute user (reply)`;
    }
    
    return text;
}

function getMenuText(platform) {
    const prefix = BOT_PREFIX;
    
    let text = `🎵 *${BOT_NAME} Menu*\n\n`;
    text += `🎵 *Music*\n`;
    text += `${prefix}play <song>\n\n`;
    
    text += `🎮 *Games*\n`;
    text += `${prefix}dice · ${prefix}coinflip · ${prefix}joke\n\n`;
    
    text += `🛠️ *Utility*\n`;
    text += `${prefix}ping · ${prefix}time · ${prefix}info\n\n`;
    
    text += `🤖 *AI*\n`;
    text += `${prefix}ai <question>\n\n`;
    
    text += `📱 *Platform*\n`;
    text += `${platform}\n\n`;
    
    text += `Type ${prefix}help for all commands.`;
    
    return text;
}

// ============ TELEGRAM COMMANDS ============

// Telegram commands with proper handlers
telegramBot.command('start', (ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        `Welcome! I'm ${BOT_NAME}, your multi-platform bot.\n` +
        `I work on both Telegram and WhatsApp!\n\n` +
        `Send /menu to see available commands.`
    );
});

telegramBot.command('menu', (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎵 Music', 'menu_music')],
        [Markup.button.callback('🎮 Games', 'menu_games')],
        [Markup.button.callback('🛠️ Utility', 'menu_utility')],
        [Markup.button.callback('🤖 AI', 'menu_ai')],
        [Markup.button.callback('❓ Help', 'menu_help')]
    ]);
    
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Menu*\n\nSelect a category:`,
        keyboard
    );
});

// Menu callbacks
telegramBot.action('menu_music', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎵 *Music Commands*\n\n` +
        `.play <song> - Play a song\n` +
        `.p <song> - Short for play\n\n` +
        `Example: \`.play Despacito\``
    );
});

telegramBot.action('menu_games', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎮 *Game Commands*\n\n` +
        `.dice - Roll a dice\n` +
        `.coinflip - Flip a coin\n` +
        `.joke - Random joke`
    );
});

telegramBot.action('menu_utility', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🛠️ *Utility Commands*\n\n` +
        `.ping - Check bot status\n` +
        `.time - Current time\n` +
        `.info - Bot information`
    );
});

telegramBot.action('menu_ai', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🤖 *AI Commands*\n\n` +
        `.ai <question> - Ask AI\n\n` +
        `Example: \`.ai What is quantum computing?\``
    );
});

telegramBot.action('menu_help', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(getHelpText('telegram'));
});

telegramBot.command('help', (ctx) => {
    ctx.replyWithMarkdown(getHelpText('telegram'));
});

// Group management commands for Telegram
telegramBot.command('kick', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to kick!');
    }
    try {
        const userId = ctx.message.reply_to_message.from.id;
        await ctx.kickChatMember(userId);
        ctx.reply('✅ User kicked!');
    } catch (error) {
        ctx.reply('❌ Failed to kick. I need admin permissions!');
    }
});

telegramBot.command('ban', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to ban!');
    }
    try {
        const userId = ctx.message.reply_to_message.from.id;
        await ctx.banChatMember(userId);
        ctx.reply('✅ User banned!');
    } catch (error) {
        ctx.reply('❌ Failed to ban. I need admin permissions!');
    }
});

telegramBot.command('promote', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to promote!');
    }
    try {
        const userId = ctx.message.reply_to_message.from.id;
        await ctx.promoteChatMember(userId);
        ctx.reply('✅ User promoted to admin!');
    } catch (error) {
        ctx.reply('❌ Failed to promote. I need admin permissions!');
    }
});

telegramBot.command('mute', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to mute!');
    }
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const untilDate = Math.floor(Date.now() / 1000) + 300;
        await ctx.restrictChatMember(userId, {
            until_date: untilDate,
            can_send_messages: false
        });
        ctx.reply('🔇 User muted for 5 minutes!');
    } catch (error) {
        ctx.reply('❌ Failed to mute. I need admin permissions!');
    }
});

// ============ ERROR HANDLING ============
telegramBot.catch((err, ctx) => {
    console.error('❌ Telegram error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// ============ START BOT ============
async function startBot() {
    console.log(`🎵 ${BOT_NAME} Bot starting...`);
    console.log(`📋 Prefix: ${BOT_PREFIX}`);
    
    // Start Telegram bot
    try {
        await telegramBot.launch();
        console.log(`✅ Telegram bot started!`);
        console.log(`📱 Bot username: @${telegramBot.botInfo?.username || 'unknown'}`);
    } catch (error) {
        console.error('❌ Failed to start Telegram bot:', error);
    }
    
    // Start WhatsApp bot
    try {
        await connectWhatsApp();
    } catch (error) {
        console.error('❌ Failed to start WhatsApp bot:', error);
    }
    
    console.log(`🎵 ${BOT_NAME} is online!`);
}

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('🛑 Shutting down...');
    telegramBot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('🛑 Shutting down...');
    telegramBot.stop('SIGTERM');
    process.exit(0);
});

// Start the bot
startBot();

// ============ EXPORTS FOR RAILWAY ============
module.exports = { startBot };
