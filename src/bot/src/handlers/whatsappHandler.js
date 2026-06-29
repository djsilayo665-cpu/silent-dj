// src/handlers/whatsappHandler.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs-extra');
const path = require('path');

async function initWhatsAppConnection(userId) {
  // Create a unique session folder for each user
  const sessionFolder = path.join(__dirname, `../../sessions/user_${userId}`);
  
  // Ensure the session folder exists
  await fs.ensureDir(sessionFolder);
  
  // Load or create auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  
  // Create WhatsApp socket
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll use pairing code instead
    browser: ['Silent DJ', 'Chrome', '120.0.0.0'],
  });

  // Save credentials when updated
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log(`QR Code generated for user ${userId}`);
      // You could send the QR code to the user via Telegram
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed for user ${userId}, reconnecting: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        // Reconnect
        initWhatsAppConnection(userId);
      }
    } else if (connection === 'open') {
      console.log(`✅ WhatsApp connected for user ${userId}`);
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && msg.message) {
      // Process the message
      const messageContent = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || 
                            '';
      
      // Send to your bot's command handler
      const userId = msg.key.remoteJid.split('@')[0]; // Extract phone number
      await handleIncomingWhatsAppMessage(messageContent, userId);
    }
  });

  return sock;
}

async function handleIncomingWhatsAppMessage(message, userId) {
  // This is where you process commands from WhatsApp
  console.log(`📩 WhatsApp message from ${userId}: ${message}`);
  
  // You can process music commands here too
  if (message.startsWith('!play')) {
    // Handle play command from WhatsApp
    const songName = message.replace('!play', '').trim();
    // Process the song request...
  }
}

module.exports = { initWhatsAppConnection, handleIncomingWhatsAppMessage };
