// index.js - Silent DJ Bot (Telegram + WhatsApp Multi-User)
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const axios = require('axios');
const moment = require('moment-timezone');
const ytSearch = require('yt-search');
const path = require('path');

// ============ CONFIGURATION ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const BOT_NAME = process.env.BOT_NAME || 'Silent DJ';
const BOT_PREFIX = process.env.BOT_PREFIX || '.';

// ============ TELEGRAM BOT ============
const telegramBot = new Telegraf(TELEGRAM_TOKEN);

// ============ GLOBAL VARIABLES ============
const whatsappSessions = new Map(); // userId -> socket
const userPairingCodes = new Map(); // userId -> pairing code

// ============ WHATSAPP CONNECTION ============
async function generatePairingCodeForUser(userId) {
    try {
        console.log(`🔑 Generating pairing code for user ${userId}...`);
        
        const sessionFolder = path.join('./sessions', `user_${userId}`);
        await fs.ensureDir(sessionFolder);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Silent DJ', 'Chrome', '120.0.0.0'],
            generatePairingCode: true,
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
        });

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (update.pairingCode) {
                const code = update.pairingCode;
                console.log(`🔑 User ${userId} PAIRING CODE: ${code}`);
                userPairingCodes.set(userId, code);
                
                // Send to Telegram DM
                try {
                    await telegramBot.telegram.sendMessage(
                        userId,
                        `🔑 *Your WhatsApp Pairing Code*\n\n` +
                        `\`\`\`${code}\`\`\`\n\n` +
                        `1. Open WhatsApp on your phone\n` +
                        `2. Settings → Linked Devices → Link a Device\n` +
                        `3. Enter: ${code}\n\n` +
                        `⏳ This code expires in 2 minutes.`
                    );
                } catch (e) {
                    console.log(`⚠️ Could not send DM to user ${userId}`);
                }
            }
            
            if (connection === 'open') {
                console.log(`✅ WhatsApp connected for user ${userId}`);
                whatsappSessions.set(userId, sock);
                userPairingCodes.delete(userId);
                
                try {
                    await telegramBot.telegram.sendMessage(
                        userId,
                        `✅ *WhatsApp Connected!*\n\n` +
                        `Your WhatsApp is now linked to ${BOT_NAME}!\n` +
                        `Send ${BOT_PREFIX}play to play music.`
                    );
                } catch (e) {}
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log(`🔄 Reconnecting for user ${userId}...`);
                    setTimeout(() => generatePairingCodeForUser(userId), 5000);
                } else {
                    console.log(`🚫 User ${userId} logged out`);
                    whatsappSessions.delete(userId);
                    userPairingCodes.delete(userId);
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.key.fromMe && msg.message) {
                await handleWhatsAppMessage(msg, sock, userId);
            }
        });

        return sock;
    } catch (error) {
        console.error(`❌ Error for user ${userId}:`, error);
        throw error;
    }
}

// ============ WHATSAPP MESSAGE HANDLER ============
async function handleWhatsAppMessage(msg, sock, userId) {
    try {
        let messageText = '';
        let sender = msg.key.remoteJid;
        
        if (msg.message.conversation) {
            messageText = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text;
        }
        
        if (!messageText) return;
        
        console.log(`📩 WhatsApp from user ${userId}: ${messageText}`);
        const response = await processCommand(messageText, 'whatsapp', userId);
        
        if (response) {
            await sock.sendMessage(sender, { text: response });
        }
    } catch (error) {
        console.error('❌ WhatsApp message error:', error);
    }
}

// ============ COMMAND PROCESSOR ============
async function processCommand(text, platform, userId) {
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
                return '❌ No results found.';
            }
            const video = result.videos[0];
            return `🎵 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.duration.timestamp}\n🔗 ${video.url}`;
        } catch (error) {
            return '❌ Error searching. Please try again.';
        }
    }
    
    // ============ HELP ============
    if (cmd === 'help' || cmd === 'h') {
        return `🎵 *${BOT_NAME} Commands*\n\n` +
               `*Music*\n${BOT_PREFIX}play <song> - Play music\n\n` +
               `*Games*\n${BOT_PREFIX}dice - Roll dice\n${BOT_PREFIX}coinflip - Flip coin\n\n` +
               `*Utility*\n${BOT_PREFIX}ping - Check status\n${BOT_PREFIX}time - Current time\n${BOT_PREFIX}info - Bot info\n\n` +
               `*WhatsApp*\n${BOT_PREFIX}status - Check connection\n${BOT_PREFIX}disconnect - Disconnect WhatsApp`;
    }
    
    // ============ UTILITY ============
    if (cmd === 'ping') {
        return '🏓 Pong! ✅';
    }
    
    if (cmd === 'time') {
        const now = moment();
        return `🕐 ${now.format('h:mm:ss A')}\n📅 ${now.format('MMMM D, YYYY')}`;
    }
    
    if (cmd === 'info') {
        return `🎵 *${BOT_NAME}*\n📱 Platform: ${platform}\n✅ Status: Online\n📦 Version: 2.0.0`;
    }
    
    // ============ GAMES ============
    if (cmd === 'dice') {
        const result = Math.floor(Math.random() * 6) + 1;
        return `🎲 Rolled: *${result}*`;
    }
    
    if (cmd === 'coinflip' || cmd === 'coin') {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return `🪙 *${result}!*`;
    }
    
    // ============ WHATSAPP CONTROLS ============
    if (cmd === 'status') {
        const isConnected = whatsappSessions.has(userId);
        return `📊 *Your Status*\n\nWhatsApp: ${isConnected ? '✅ Connected' : '❌ Not connected'}\n` +
               `To connect: Send /pair to the bot on Telegram`;
    }
    
    if (cmd === 'disconnect') {
        if (whatsappSessions.has(userId)) {
            try {
                const sock = whatsappSessions.get(userId);
                await sock.logout();
                whatsappSessions.delete(userId);
                
                const sessionFolder = path.join('./sessions', `user_${userId}`);
                if (await fs.pathExists(sessionFolder)) {
                    await fs.remove(sessionFolder);
                }
                
                return '✅ WhatsApp disconnected successfully!';
            } catch (error) {
                return '❌ Error disconnecting. Please try again.';
            }
        }
        return '❌ You are not connected to WhatsApp.';
    }
    
    return `❌ Unknown command: ${cmd}\nType ${BOT_PREFIX}help for commands.`;
}

// ============ TELEGRAM COMMANDS ============

telegramBot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        `Welcome! I work on both Telegram and WhatsApp!\n\n` +
        `📱 To connect your WhatsApp, send:\n` +
        `/pair\n\n` +
        `Send /menu for all commands.`
    );
});

telegramBot.command('pair', async (ctx) => {
    const userId = ctx.from.id;
    
    if (whatsappSessions.has(userId)) {
        return ctx.reply('✅ You already have WhatsApp connected!\nSend `.status` to check.');
    }
    
    await ctx.reply('🔑 *Generating WhatsApp pairing code...*\n\n⏳ Please wait...');
    
    try {
        await generatePairingCodeForUser(userId);
        
        // Show code in chat too (in case DM fails)
        setTimeout(async () => {
            const code = userPairingCodes.get(userId);
            if (code) {
                await ctx.reply(
                    `🔑 *Your WhatsApp Pairing Code*\n\n` +
                    `\`\`\`${code}\`\`\`\n\n` +
                    `1. Open WhatsApp on your phone\n` +
                    `2. Settings → Linked Devices → Link a Device\n` +
                    `3. Enter the code above\n\n` +
                    `📱 I also sent this code to your DM.`
                );
            } else {
                await ctx.reply('⏳ Waiting for code... Check your DM!');
            }
        }, 3000);
        
    } catch (error) {
        console.error('Pair error:', error);
        ctx.reply('❌ Error generating pairing code. Please try again.');
    }
});

telegramBot.command('getcode', async (ctx) => {
    const userId = ctx.from.id;
    const code = userPairingCodes.get(userId);
    
    if (!code) {
        return ctx.reply('❌ No active pairing code found.\nSend /pair to generate one.');
    }
    
    ctx.reply(
        `🔑 *Your Pairing Code*\n\n` +
        `\`\`\`${code}\`\`\`\n\n` +
        `Enter this in WhatsApp:\n` +
        `Settings → Linked Devices → Link a Device`
    );
});

telegramBot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const isConnected = whatsappSessions.has(userId);
    
    ctx.replyWithMarkdown(
        `📊 *Your Status*\n\n` +
        `WhatsApp: ${isConnected ? '✅ Connected' : '❌ Not connected'}\n` +
        `Telegram: ✅ Online\n\n` +
        `To connect WhatsApp: /pair\n` +
        `To disconnect: .disconnect`
    );
});

telegramBot.command('disconnect', async (ctx) => {
    const userId = ctx.from.id;
    
    if (!whatsappSessions.has(userId)) {
        return ctx.reply('❌ You are not connected to WhatsApp.');
    }
    
    try {
        const sock = whatsappSessions.get(userId);
        await sock.logout();
        whatsappSessions.delete(userId);
        
        const sessionFolder = path.join('./sessions', `user_${userId}`);
        if (await fs.pathExists(sessionFolder)) {
            await fs.remove(sessionFolder);
        }
        
        ctx.reply('✅ WhatsApp disconnected successfully!');
    } catch (error) {
        ctx.reply('❌ Error disconnecting. Please try again.');
    }
});

telegramBot.command('menu', (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎵 Music', 'menu_music')],
        [Markup.button.callback('🎮 Games', 'menu_games')],
        [Markup.button.callback('🛠️ Utility', 'menu_utility')],
        [Markup.button.callback('📱 WhatsApp', 'menu_whatsapp')]
    ]);
    
    ctx.replyWithMarkdown(`🎵 *${BOT_NAME} Menu*`, keyboard);
});

telegramBot.action('menu_music', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`🎵 *.play <song>* - Play music\n*.p <song>* - Short for play`);
});

telegramBot.action('menu_games', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`🎮 *.dice* - Roll dice\n*.coinflip* - Flip coin`);
});

telegramBot.action('menu_utility', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`🛠️ *.ping* - Check status\n*.time* - Current time\n*.info* - Bot info`);
});

telegramBot.action('menu_whatsapp', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `📱 *WhatsApp Setup*\n\n` +
        `1. Send /pair\n` +
        `2. Get 8-digit code\n` +
        `3. Open WhatsApp → Settings → Linked Devices\n` +
        `4. Enter the code\n\n` +
        `✅ Your WhatsApp will connect!`
    );
});

telegramBot.command('help', (ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Commands*\n\n` +
        `*Music*\n.play <song> - Play music\n\n` +
        `*Games*\n.dice - Roll dice\n.coinflip - Flip coin\n\n` +
        `*Utility*\n.ping - Check status\n.time - Current time\n.info - Bot info\n\n` +
        `*WhatsApp*\n/pair - Connect WhatsApp\n.status - Check connection\n.disconnect - Disconnect\n.getcode - Show code again`
    );
});

// ============ OWNER COMMANDS ============
telegramBot.command('stats', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ This command is only for the bot owner.');
    }
    
    const sessions = whatsappSessions.size;
    const users = Array.from(whatsappSessions.keys());
    
    ctx.replyWithMarkdown(
        `📊 *Bot Statistics*\n\n` +
        `Connected Users: ${sessions}\n` +
        `Users: ${users.join(', ') || 'None'}\n\n` +
        `Bot: ✅ Online\n` +
        `Platform: Telegram + WhatsApp`
    );
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
    console.log(`📱 Any user can connect their WhatsApp with /pair`);
    
    try {
        await telegramBot.launch();
        console.log(`✅ Telegram started!`);
        console.log(`📱 @${telegramBot.botInfo?.username || 'unknown'}`);
    } catch (error) {
        console.error('❌ Telegram error:', error);
    }
    
    console.log(`\n🎵 ${BOT_NAME} is online!`);
    console.log(`📱 Users: Send /pair to connect WhatsApp\n`);
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

startBot();
