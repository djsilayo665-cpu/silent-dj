// index.js - Silent DJ Bot (WhatsApp + Telegram) with Pairing Code
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const axios = require('axios');
const moment = require('moment-timezone');
const ytSearch = require('yt-search');

// ============ CONFIGURATION ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const BOT_NAME = process.env.BOT_NAME || 'Silent DJ';
const BOT_PREFIX = process.env.BOT_PREFIX || '.';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || ''; // Your phone number with country code

// ============ TELEGRAM BOT ============
const telegramBot = new Telegraf(TELEGRAM_TOKEN);

// ============ WHATSAPP CONNECTION ============
let whatsappSock = null;
let whatsappConnected = false;
let pairingCode = '';

async function connectWhatsApp() {
    console.log('📱 Connecting to WhatsApp...');
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./session');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // Disable QR code
            browser: ['Silent DJ', 'Chrome', '120.0.0.0'],
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            // Enable pairing code
            generatePairingCode: true,
        });

        sock.ev.on('creds.update', saveCreds);

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // If QR code is generated (fallback), show it
            if (qr) {
                console.log('📱 QR Code (fallback):', qr);
            }
            
            // Generate pairing code
            if (update.pairingCode) {
                pairingCode = update.pairingCode;
                console.log(`🔑 PAIRING CODE: ${pairingCode}`);
                console.log(`📱 Open WhatsApp → Settings → Linked Devices → Link a Device`);
                console.log(`📱 Enter this code: ${pairingCode}`);
                
                // Send pairing code to Telegram owner
                if (TELEGRAM_TOKEN && OWNER_ID) {
                    try {
                        await telegramBot.telegram.sendMessage(
                            OWNER_ID,
                            `🔑 *WhatsApp Pairing Code*\n\n` +
                            `Your pairing code is:\n\`\`\`${pairingCode}\`\`\`\n\n` +
                            `1. Open WhatsApp on your phone\n` +
                            `2. Go to Settings → Linked Devices → Link a Device\n` +
                            `3. Enter the code above\n` +
                            `4. Wait for connection...`
                        );
                    } catch (e) {
                        console.log('⚠️ Could not send pairing code to Telegram');
                    }
                }
            }
            
            if (connection === 'open') {
                whatsappConnected = true;
                console.log('✅ WhatsApp connected successfully!');
                console.log(`📱 Bot is ready on WhatsApp!`);
                
                // Notify owner on Telegram
                if (TELEGRAM_TOKEN && OWNER_ID) {
                    try {
                        await telegramBot.telegram.sendMessage(
                            OWNER_ID,
                            `✅ *WhatsApp Connected!*\n\n` +
                            `Your WhatsApp is now linked to ${BOT_NAME}!\n` +
                            `You can now use commands like ${BOT_PREFIX}play`
                        );
                    } catch (e) {}
                }
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

// ============ GENERATE PAIRING CODE MANUALLY ============
async function generatePairingCode(phoneNumber) {
    try {
        console.log(`🔑 Generating pairing code for ${phoneNumber}...`);
        
        const { state, saveCreds } = await useMultiFileAuthState('./session');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Silent DJ', 'Chrome', '120.0.0.0'],
            generatePairingCode: true,
        });

        // Wait for pairing code
        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            if (update.pairingCode) {
                const code = update.pairingCode;
                console.log(`\n🔑 PAIRING CODE: ${code}`);
                console.log(`📱 WhatsApp: Settings → Linked Devices → Link a Device`);
                console.log(`📱 Enter this code: ${code}\n`);
                
                // Send to Telegram owner
                if (TELEGRAM_TOKEN && OWNER_ID) {
                    try {
                        await telegramBot.telegram.sendMessage(
                            OWNER_ID,
                            `🔑 *WhatsApp Pairing Code*\n\n` +
                            `\`\`\`${code}\`\`\`\n\n` +
                            `1. Open WhatsApp → Settings → Linked Devices → Link a Device\n` +
                            `2. Enter code: ${code}`
                        );
                    } catch (e) {}
                }
            }
        });

        return sock;
    } catch (error) {
        console.error('❌ Error generating pairing code:', error);
    }
}

// ============ MESSAGE HANDLERS ============
async function handleWhatsAppMessage(msg, sock) {
    try {
        let messageText = '';
        let sender = msg.key.remoteJid;
        
        if (msg.message.conversation) {
            messageText = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text;
        }
        
        if (!messageText) return;
        
        console.log(`📩 WhatsApp: ${messageText}`);
        const response = await processCommand(messageText, 'whatsapp', sender);
        
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
    
    if (cmd === 'help' || cmd === 'h') {
        return getHelpText();
    }
    
    if (cmd === 'ping') {
        return '🏓 Pong! ✅';
    }
    
    if (cmd === 'time') {
        const now = moment();
        return `🕐 ${now.format('h:mm:ss A')}\n📅 ${now.format('MMMM D, YYYY')}`;
    }
    
    if (cmd === 'dice') {
        const result = Math.floor(Math.random() * 6) + 1;
        return `🎲 Rolled: *${result}*`;
    }
    
    if (cmd === 'coinflip' || cmd === 'coin') {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return `🪙 *${result}!*`;
    }
    
    if (cmd === 'info') {
        return `🎵 *${BOT_NAME}*\n📱 Platform: ${platform}\n✅ Status: Online\n📦 Version: 2.0.0`;
    }
    
    return `❌ Unknown command: ${cmd}\nType ${BOT_PREFIX}help for commands.`;
}

// ============ HELP TEXT ============
function getHelpText() {
    return `🎵 *${BOT_NAME} Commands*\n\n` +
           `${BOT_PREFIX}play <song> - Play music\n` +
           `${BOT_PREFIX}dice - Roll dice\n` +
           `${BOT_PREFIX}coinflip - Flip coin\n` +
           `${BOT_PREFIX}time - Current time\n` +
           `${BOT_PREFIX}ping - Check status\n` +
           `${BOT_PREFIX}info - Bot info`;
}

// ============ TELEGRAM COMMANDS ============
telegramBot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        `I work on both Telegram and WhatsApp!\n` +
        `Send /pair to get WhatsApp pairing code.`
    );
});

telegramBot.command('pair', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ This command is only for the bot owner.');
    }
    
    await ctx.reply('🔑 Generating WhatsApp pairing code...');
    
    try {
        await generatePairingCode(WHATSAPP_NUMBER || '');
        await ctx.reply(
            `🔑 *Pairing Code Generated!*\n\n` +
            `1. Open WhatsApp on your phone\n` +
            `2. Go to Settings → Linked Devices → Link a Device\n` +
            `3. Enter the code I'll send you\n\n` +
            `⏳ Check your logs or wait for the code...`
        );
    } catch (error) {
        ctx.reply('❌ Error generating pairing code. Check logs.');
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

// Menu callbacks
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
        `1. Type /pair (owner only)\n` +
        `2. Get pairing code\n` +
        `3. Open WhatsApp → Settings → Linked Devices\n` +
        `4. Enter the code\n\n` +
        `✅ Your WhatsApp will connect!`
    );
});

telegramBot.command('help', (ctx) => {
    ctx.replyWithMarkdown(getHelpText());
});

// ============ ERROR HANDLING ============
telegramBot.catch((err, ctx) => {
    console.error('❌ Telegram error:', err);
    ctx.reply('❌ An error occurred.');
});

// ============ START BOT ============
async function startBot() {
    console.log(`🎵 ${BOT_NAME} Bot starting...`);
    console.log(`📋 Prefix: ${BOT_PREFIX}`);
    console.log(`📱 WhatsApp Number: ${WHATSAPP_NUMBER || 'Not set'}`);
    
    // Start Telegram
    try {
        await telegramBot.launch();
        console.log(`✅ Telegram started!`);
        console.log(`📱 @${telegramBot.botInfo?.username || 'unknown'}`);
    } catch (error) {
        console.error('❌ Telegram error:', error);
    }
    
    // Start WhatsApp with pairing code
    try {
        if (WHATSAPP_NUMBER) {
            console.log(`🔑 Generating pairing code for ${WHATSAPP_NUMBER}...`);
            await generatePairingCode(WHATSAPP_NUMBER);
        } else {
            console.log(`📱 Starting WhatsApp (pairing mode)...`);
            await connectWhatsApp();
        }
    } catch (error) {
        console.error('❌ WhatsApp error:', error);
    }
    
    console.log(`\n🎵 ${BOT_NAME} is online!`);
    console.log(`📱 Telegram: @${telegramBot.botInfo?.username || 'unknown'}`);
    console.log(`📱 WhatsApp: Check logs for pairing code\n`);
}

process.once('SIGINT', () => { telegramBot.stop('SIGINT'); process.exit(0); });
process.once('SIGTERM', () => { telegramBot.stop('SIGTERM'); process.exit(0); });

startBot();
