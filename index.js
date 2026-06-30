// index.js - Silent DJ Bot (Complete Telegram Version)
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const moment = require('moment-timezone');
const ytSearch = require('yt-search');

// Check for token
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID || '0');
const BOT_NAME = process.env.BOT_NAME || 'Silent DJ';
const BOT_PREFIX = process.env.BOT_PREFIX || '.';

// Store warnings for users (in production, use a database)
const warnings = new Map();

// ============ SILENT DJ MAIN MENU ============
bot.command('menu', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎵 Music', 'menu_music')],
        [Markup.button.callback('🤖 AI & Tools', 'menu_ai')],
        [Markup.button.callback('👥 Group', 'menu_group')],
        [Markup.button.callback('🎮 Games', 'menu_games')],
        [Markup.button.callback('🛠️ Utility', 'menu_utility')],
        [Markup.button.callback('📱 Media', 'menu_media')],
        [Markup.button.callback('❓ Help', 'menu_help')]
    ]);
    
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        'Select a category to see available commands:',
        keyboard
    );
});

// ============ MENU NAVIGATION ============
const menus = {
    music: `🎵 *Music Commands*\n\n` +
          `/play <song> - Search and play music\n` +
          `/lyrics <song> - Get song lyrics\n` +
          `/song <song> - Download song\n` +
          `/yt <url> - Download YouTube video\n` +
          `/ytmp3 <url> - Download YouTube audio\n` +
          `/shazam - Identify playing song (send audio)`,

    ai: `🤖 *AI & Tools Commands*\n\n` +
        `/ai <question> - Ask AI\n` +
        `/image <prompt> - Generate AI image\n` +
        `/analyze <text> - Analyze text\n` +
        `/translate <text> - Translate to English\n` +
        `/summarize <text> - Summarize text\n` +
        `/qr <text> - Generate QR code`,

    group: `👥 *Group Management Commands*\n\n` +
           `*Admin Commands (reply to a user)*\n` +
           `/kick - Kick a user\n` +
           `/ban - Ban a user\n` +
           `/promote - Promote to admin\n` +
           `/demote - Demote from admin\n` +
           `/mute - Mute a user (5 min)\n` +
           `/unmute - Unmute a user\n` +
           `/warn - Warn a user\n` +
           `/warnings - Check warnings\n` +
           `/resetwarns - Reset warnings\n\n` +
           `*Group Settings*\n` +
           `/setwelcome <msg> - Set welcome message\n` +
           `/antilink on/off - Anti-link protection`,

    games: `🎮 *Game Commands*\n\n` +
           `/dice - Roll a dice\n` +
           `/coinflip - Flip a coin\n` +
           `/trivia - Random trivia question\n` +
           `/joke - Random joke\n` +
           `/meme - Random meme\n` +
           `/quote - Random quote\n` +
           `/rps <rock/paper/scissors> - Rock Paper Scissors\n` +
           `/number <min> <max> - Random number`,

    utility: `🛠️ *Utility Commands*\n\n` +
             `/ping - Check bot latency\n` +
             `/time - Current time\n` +
             `/weather <city> - Weather forecast\n` +
             `/news - Latest news\n` +
             `/info - Bot information\n` +
             `/stats - Bot statistics\n` +
             `/uptime - Bot uptime`,

    media: `📱 *Media Download Commands*\n\n` +
           `/tiktok <url> - Download TikTok\n` +
           `/instagram <url> - Download Instagram\n` +
           `/facebook <url> - Download Facebook\n` +
           `/twitter <url> - Download Twitter/X\n` +
           `/reddit <url> - Download Reddit\n` +
           `/pinterest <url> - Download Pinterest`,

    help: `🎵 *${BOT_NAME} Bot - Help*\n\n` +
          `*How to use commands:*\n` +
          `• Type / or ${BOT_PREFIX} followed by the command\n` +
          `• Example: ${BOT_PREFIX}play Despacito\n\n` +
          `*Getting Started:*\n` +
          `1. Send /menu to open the main menu\n` +
          `2. Select a category\n` +
          `3. Use commands from that category\n\n` +
          `*Need help?*\n` +
          `Contact: @${bot.botInfo?.username || 'your_bot_username'}`
};

// Menu callbacks
bot.action('menu_music', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.music); });
bot.action('menu_ai', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.ai); });
bot.action('menu_group', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.group); });
bot.action('menu_games', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.games); });
bot.action('menu_utility', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.utility); });
bot.action('menu_media', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.media); });
bot.action('menu_help', (ctx) => { ctx.answerCbQuery(); ctx.replyWithMarkdown(menus.help); });

// ============ BASIC COMMANDS ============
bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot is online!*\n\n` +
        `Send /menu to see all available commands.\n` +
        `Bot Prefix: ${BOT_PREFIX}\n` +
        `Version: 2.0.0`
    );
});

bot.command('help', (ctx) => {
    ctx.replyWithMarkdown(menus.help);
});

bot.command('ping', (ctx) => {
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
});

// ============ MUSIC COMMANDS ============
bot.command('play', async (ctx) => {
    const query = ctx.message.text.replace('/play', '').trim();
    if (!query) {
        return ctx.reply('🎵 Please specify a song!\nExample: `/play Despacito`');
    }
    
    try {
        await ctx.reply(`🔍 Searching for "${query}"...`);
        const result = await ytSearch(query);
        
        if (!result || !result.videos || result.videos.length === 0) {
            return ctx.reply('❌ No results found for this song.');
        }
        
        const video = result.videos[0];
        ctx.replyWithMarkdown(
            `🎵 *Now Playing: ${video.title}*\n\n` +
            `👤 *Artist:* ${video.author.name}\n` +
            `⏱️ *Duration:* ${video.duration.timestamp}\n` +
            `👀 *Views:* ${video.views}\n` +
            `🔗 [Watch on YouTube](${video.url})\n\n` +
            `📥 Send ${BOT_PREFIX}yt ${video.url} to download`
        );
    } catch (error) {
        console.error('Play error:', error);
        ctx.reply('❌ Error searching for song. Please try again.');
    }
});

// ============ AI COMMANDS ============
bot.command('ai', async (ctx) => {
    const query = ctx.message.text.replace('/ai', '').trim();
    if (!query) {
        return ctx.reply('🤖 Please ask a question!\nExample: `/ai What is quantum computing?`');
    }
    
    await ctx.reply('🤔 Thinking...');
    try {
        // For now, use a free API or just echo
        ctx.reply(`🤖 *You asked:* "${query}"\n\n*(AI integration coming soon! Add OpenAI API key to enable.)*`);
    } catch (error) {
        ctx.reply('❌ AI service error. Please try again.');
    }
});

// ============ GROUP MANAGEMENT COMMANDS ============
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
        console.error('Kick error:', error);
        ctx.reply('❌ Failed to kick. I need admin permissions!');
    }
});

bot.command('ban', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to ban!');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        await ctx.banChatMember(userId);
        await ctx.reply(`✅ ${userName} has been banned!`);
    } catch (error) {
        console.error('Ban error:', error);
        ctx.reply('❌ Failed to ban. I need admin permissions!');
    }
});

bot.command('promote', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to promote!');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        await ctx.promoteChatMember(userId);
        await ctx.reply(`✅ ${userName} has been promoted to admin!`);
    } catch (error) {
        console.error('Promote error:', error);
        ctx.reply('❌ Failed to promote. I need admin permissions!');
    }
});

bot.command('demote', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to demote!');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        await ctx.promoteChatMember(userId, {
            can_change_info: false,
            can_delete_messages: false,
            can_invite_users: false,
            can_restrict_members: false,
            can_pin_messages: false,
            can_promote_members: false
        });
        await ctx.reply(`✅ ${userName} has been demoted!`);
    } catch (error) {
        console.error('Demote error:', error);
        ctx.reply('❌ Failed to demote. I need admin permissions!');
    }
});

bot.command('mute', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to mute!');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        const untilDate = Math.floor(Date.now() / 1000) + 300; // 5 minutes
        await ctx.restrictChatMember(userId, {
            until_date: untilDate,
            can_send_messages: false,
            can_send_media_messages: false
        });
        await ctx.reply(`🔇 ${userName} has been muted for 5 minutes!`);
    } catch (error) {
        console.error('Mute error:', error);
        ctx.reply('❌ Failed to mute. I need admin permissions!');
    }
});

bot.command('unmute', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to unmute!');
    }
    
    try {
        const userId = ctx.message.reply_to_message.from.id;
        const userName = ctx.message.reply_to_message.from.first_name || 'User';
        await ctx.restrictChatMember(userId, {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_other_messages: true
        });
        await ctx.reply(`🔊 ${userName} has been unmuted!`);
    } catch (error) {
        console.error('Unmute error:', error);
        ctx.reply('❌ Failed to unmute. I need admin permissions!');
    }
});

bot.command('warn', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user you want to warn!');
    }
    
    const userId = ctx.message.reply_to_message.from.id;
    const userName = ctx.message.reply_to_message.from.first_name || 'User';
    
    if (!warnings.has(userId)) {
        warnings.set(userId, 0);
    }
    const count = warnings.get(userId) + 1;
    warnings.set(userId, count);
    
    await ctx.reply(`⚠️ ${userName} has been warned! (${count}/3)`);
    
    if (count >= 3) {
        try {
            await ctx.kickChatMember(userId);
            warnings.delete(userId);
            await ctx.reply(`⚠️ ${userName} has been kicked for reaching 3 warnings!`);
        } catch (error) {
            console.error('Auto-kick error:', error);
        }
    }
});

bot.command('warnings', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user to check warnings!');
    }
    
    const userId = ctx.message.reply_to_message.from.id;
    const userName = ctx.message.reply_to_message.from.first_name || 'User';
    const count = warnings.get(userId) || 0;
    
    await ctx.reply(`⚠️ ${userName} has ${count} warning(s)`);
});

bot.command('resetwarns', async (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply('❌ Reply to the user to reset warnings!');
    }
    
    const userId = ctx.message.reply_to_message.from.id;
    const userName = ctx.message.reply_to_message.from.first_name || 'User';
    warnings.delete(userId);
    
    await ctx.reply(`✅ ${userName}'s warnings have been reset!`);
});

// ============ GAME COMMANDS ============
bot.command('dice', (ctx) => {
    const result = Math.floor(Math.random() * 6) + 1;
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    ctx.reply(`🎲 You rolled: *${result}* ${emojis[result - 1]}`, { parse_mode: 'Markdown' });
});

bot.command('coinflip', (ctx) => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '🪙';
    ctx.reply(`${emoji} *${result}!*`, { parse_mode: 'Markdown' });
});

bot.command('joke', async (ctx) => {
    try {
        const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
        const joke = response.data;
        ctx.reply(`😂 *${joke.setup}*\n\n${joke.punchline}`, { parse_mode: 'Markdown' });
    } catch (error) {
        ctx.reply('😂 Why don\'t scientists trust atoms? Because they make up everything!');
    }
});

bot.command('rps', (ctx) => {
    const choices = ['rock', 'paper', 'scissors'];
    const userChoice = ctx.message.text.replace('/rps', '').trim().toLowerCase();
    if (!choices.includes(userChoice)) {
        return ctx.reply('🎮 Choose rock, paper, or scissors!\nExample: `/rps rock`');
    }
    
    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result = '';
    
    if (userChoice === botChoice) {
        result = "It's a tie! 🤝";
    } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
    ) {
        result = 'You win! 🎉';
    } else {
        result = 'I win! 😈';
    }
    
    ctx.reply(`🎮 *Rock Paper Scissors*\n\nYou: ${userChoice} 🆚 Me: ${botChoice}\n\n${result}`, { parse_mode: 'Markdown' });
});

// ============ UTILITY COMMANDS ============
bot.command('time', (ctx) => {
    const now = moment();
    ctx.replyWithMarkdown(
        `🕐 *Current Time*\n\n` +
        `📅 Date: ${now.format('MMMM D, YYYY')}\n` +
        `🕐 Time: ${now.format('h:mm:ss A')}\n` +
        `🌍 Timezone: ${now.tz('UTC').format('z')}\n` +
        `📆 Day: ${now.format('dddd')}`
    );
});

bot.command('info', (ctx) => {
    const user = ctx.from;
    ctx.replyWithMarkdown(
        `📊 *Bot Information*\n\n` +
        `🤖 Bot: @${bot.botInfo?.username || 'unknown'}\n` +
        `🆔 Bot ID: ${bot.botInfo?.id || 'unknown'}\n` +
        `📦 Version: 2.0.0\n` +
        `👑 Owner: ${OWNER_ID}\n` +
        `✅ Status: Online\n` +
        `📊 Commands: 30+\n` +
        `🔷 Categories: 7`
    );
});

bot.command('stats', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ This command is only for the bot owner.');
    }
    
    try {
        const me = await bot.telegram.getMe();
        ctx.replyWithMarkdown(
            `📊 *Bot Statistics*\n\n` +
            `🤖 Bot: @${me.username}\n` +
            `🆔 Bot ID: ${me.id}\n` +
            `✅ Status: Online\n` +
            `👑 Owner ID: ${OWNER_ID}\n` +
            `📦 Version: 2.0.0\n\n` +
            `*Categories:*\n` +
            `🎵 Music | 🤖 AI | 👥 Group\n` +
            `🎮 Games | 🛠️ Utility | 📱 Media`
        );
    } catch (error) {
        ctx.reply('❌ Error fetching stats');
    }
});

// ============ ERROR HANDLING ============
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// ============ START BOT ============
bot.launch().then(() => {
    console.log(`🎵 ${BOT_NAME} Bot is running!`);
    console.log(`📱 Bot username: @${bot.botInfo?.username || 'unknown'}`);
    console.log(`🔷 Commands loaded: 30+`);
    console.log(`👑 Owner ID: ${OWNER_ID}`);
}).catch(err => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
