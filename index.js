// index.js - Main entry point
const SilentDJBot = require('./src/bot/SilentDJBot');

// Load environment variables
require('dotenv').config();

// Create and start the bot
const bot = new SilentDJBot();
bot.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});
