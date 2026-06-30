// src/handlers/whatsappHandler.js - Safe version
let whatsapp;

try {
    // Try to load WhatsApp
    whatsapp = require('@whiskeysockets/baileys');
    console.log('✅ WhatsApp loaded successfully');
} catch (error) {
    console.log('⚠️ WhatsApp not installed, features disabled');
    // Export dummy functions so the bot doesn't crash
    module.exports = {
        initWhatsAppConnection: async () => {
            console.log('⚠️ WhatsApp not available');
            return null;
        }
    };
    return;
}

// If we got here, WhatsApp is available
const { default: makeWASocket, useMultiFileAuthState } = whatsapp;

async function initWhatsAppConnection(userId, botInstance) {
    try {
        console.log(`📱 Initializing WhatsApp for user ${userId}`);
        // Your WhatsApp code here
        return null;
    } catch (error) {
        console.error('WhatsApp error:', error);
        return null;
    }
}

module.exports = { initWhatsAppConnection };
