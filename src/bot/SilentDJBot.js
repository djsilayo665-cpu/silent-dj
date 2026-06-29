// src/bot/SilentDJBot.js
const { Telegraf } = require('telegraf');
const { initWhatsAppConnection } = require('../handlers/whatsappHandler');
const { processCommand } = require('../handlers/telegramHandler');

class SilentDJBot {
  constructor() {
    // Your Telegram bot
    this.telegramBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    
    // Store WhatsApp sessions for each user
    this.whatsappConnections = new Map(); // user_id -> WhatsApp session
    this.userSessions = new Map(); // user_id -> session data
    
    // Setup handlers
    this.setupTelegramHandlers();
    this.setupWhatsAppHandlers();
  }

  // When a user starts the bot
  async handleStart(telegramUserId) {
    // Generate WhatsApp pairing code for the user
    const whatsapp = await this.initWhatsApp(telegramUserId);
    const pairingCode = await whatsapp.getPairingCode();
    
    // Send pairing code to user on Telegram
    await this.telegramBot.telegram.sendMessage(
      telegramUserId,
      `🔑 Open WhatsApp → Linked Devices → Link a Device\n\n📱 Enter this code: *${pairingCode}*\n\nOr scan the QR code I'm generating...`
    );
    
    // Store session
    this.whatsappConnections.set(telegramUserId, whatsapp);
  }

  // Initialize WhatsApp connection for a user
  async initWhatsApp(userId) {
    // You'll need to implement this using @whiskeysockets/baileys
    // This connects to WhatsApp using the user's session
    return await initWhatsAppConnection(userId);
  }

  // When a WhatsApp message arrives
  async handleWhatsAppMessage(message, userId) {
    // Process it through your bot's logic
    const response = await processCommand(message);
    
    // Send back via WhatsApp
    await this.sendWhatsAppMessage(userId, response);
    return response;
  }

  // Send message to WhatsApp
  async sendWhatsAppMessage(userId, message) {
    const connection = this.whatsappConnections.get(userId);
    if (!connection) {
      throw new Error('WhatsApp not connected for this user');
    }
    
    // Send message using the WhatsApp connection
    await connection.sendMessage(userId, { text: message });
  }

  // Setup Telegram command handlers
  setupTelegramHandlers() {
    // Start command
    this.telegramBot.start(async (ctx) => {
      const userId = ctx.from.id;
      await this.handleStart(userId);
      await ctx.reply('🔄 Please link your WhatsApp to continue...');
    });

    // Help command
    this.telegramBot.command('help', async (ctx) => {
      await ctx.reply(
        '🤖 *Silent DJ Bot Commands*\n\n' +
        '/start - Connect your WhatsApp\n' +
        '/status - Check connection status\n' +
        '/disconnect - Disconnect WhatsApp\n' +
        '/play <song> - Play a song\n' +
        '/stop - Stop playback'
      );
    });

    // Status command
    this.telegramBot.command('status', async (ctx) => {
      const userId = ctx.from.id;
      const isConnected = this.whatsappConnections.has(userId);
      
      await ctx.reply(
        `📊 *Connection Status*\n\n` +
        `WhatsApp: ${isConnected ? '✅ Connected' : '❌ Not connected'}\n` +
        `Bot: ✅ Online`
      );
    });

    // Disconnect command
    this.telegramBot.command('disconnect', async (ctx) => {
      const userId = ctx.from.id;
      this.whatsappConnections.delete(userId);
      await ctx.reply('✅ WhatsApp disconnected successfully!');
    });

    // Play command (your music functionality)
    this.telegramBot.command('play', async (ctx) => {
      const userId = ctx.from.id;
      const songName = ctx.message.text.replace('/play', '').trim();
      
      if (!songName) {
        return await ctx.reply('🎵 Please specify a song name!\nExample: `/play Despacito`');
      }
      
      // Check if user has WhatsApp connected
      if (!this.whatsappConnections.has(userId)) {
        return await ctx.reply('❌ Please connect your WhatsApp first using `/start`');
      }
      
      await ctx.reply(`🔍 Searching for: "${songName}"...`);
      
      // Your music search logic here
      // const result = await this.searchSong(songName);
      // await ctx.reply(`🎵 Playing: ${result.title}`);
    });
  }

  // Setup WhatsApp message handlers
  setupWhatsAppHandlers() {
    // This will be triggered when a WhatsApp message arrives
    // The actual listener will be set up in the WhatsApp connection
    console.log('WhatsApp handlers ready');
  }

  // Start the bot
  start() {
    // Start Telegram bot
    this.telegramBot.launch();
    console.log('🤖 Silent DJ Bot is running!');
    console.log('📱 Waiting for users to connect...');
  }
}

module.exports = SilentDJBot;
// Add to the setupTelegramHandlers() method

// Session info command
this.telegramBot.command('session', async (ctx) => {
  const userId = ctx.from.id;
  const metadata = await sessionManager.getSessionMetadata(userId);
  const hasSession = sessionManager.userHasSession(userId);
  
  if (!hasSession) {
    return await ctx.reply('❌ No active session found. Use `/start` to create one.');
  }
  
  const message = `📱 *Session Info*\n\n` +
    `Status: ${metadata?.status || 'Unknown'}\n` +
    `Created: ${metadata?.createdAt ? new Date(metadata.createdAt).toLocaleString() : 'Unknown'}\n` +
    `Last Updated: ${metadata?.updatedAt ? new Date(metadata.updatedAt).toLocaleString() : 'Unknown'}\n` +
    `Session Path: ${sessionManager.getUserSessionPath(userId)}`;
  
  await ctx.reply(message);
});

// Clear session command (if session gets corrupted)
this.telegramBot.command('clearsession', async (ctx) => {
  const userId = ctx.from.id;
  
  // Check if user is admin (optional - add your admin ID)
  // const isAdmin = userId === parseInt(process.env.ADMIN_ID);
  // if (!isAdmin) return await ctx.reply('❌ Only admins can use this command.');
  
  const hasSession = sessionManager.userHasSession(userId);
  if (!hasSession) {
    return await ctx.reply('❌ No session found.');
  }
  
  await sessionManager.deleteUserSession(userId);
  this.whatsappConnections.delete(userId);
  this.userData.delete(userId);
  
  await ctx.reply('✅ Session cleared. Use `/start` to create a new one.');
});

// Admin: View all sessions
this.telegramBot.command('sessions', async (ctx) => {
  // Check if user is admin
  const isAdmin = userId === parseInt(process.env.ADMIN_ID);
  if (!isAdmin) return await ctx.reply('❌ Only admins can view all sessions.');
  
  const stats = sessionManager.getSessionStats();
  
  let message = `📊 *All Sessions*\n\n`;
  message += `Total: ${stats.totalUsers}\n`;
  message += `Connected: ${stats.connected}\n`;
  message += `Pending: ${stats.pending}\n`;
  message += `Disconnected: ${stats.disconnected}\n\n`;
  message += `Users: ${stats.users.join(', ') || 'None'}`;
  
  await ctx.reply(message);
});
