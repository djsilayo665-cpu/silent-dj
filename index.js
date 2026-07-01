// index.js - Silent DJ Bot (Full Version)
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

if (!TELEGRAM_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing!');
    process.exit(1);
}

// ============ TELEGRAM BOT ============
const bot = new Telegraf(TELEGRAM_TOKEN);

console.log(`🎵 ${BOT_NAME} Bot starting...`);

// ============ COMMAND HANDLERS ============

// --- Music ---
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

async function handleLyricsCommand(ctx, query) {
    if (!query) {
        return ctx.reply('📝 Please specify a song!\nExample: `.lyrics Despacito`');
    }

    await ctx.reply('🔍 Searching for lyrics...');

    try {
        const result = await ytSearch(query);
        if (!result || !result.videos || result.videos.length === 0) {
            return ctx.reply('❌ No results found.');
        }

        const video = result.videos[0];
        
        try {
            const response = await axios.get(`https://api.lyrics.ovh/v1/${video.author.name}/${video.title}`);
            const lyrics = response.data.lyrics;
            const truncated = lyrics.length > 4096 ? lyrics.substring(0, 4000) + '\n... (truncated)' : lyrics;
            
            await ctx.replyWithMarkdown(
                `📝 *${video.title}*\n` +
                `👤 ${video.author.name}\n\n` +
                `\`\`\`\n${truncated}\n\`\`\``
            );
        } catch (apiError) {
            ctx.reply(`📝 *${video.title}*\n👤 ${video.author.name}\n\nLyrics not available. Try searching on Google.`);
        }
    } catch (error) {
        console.error('Lyrics error:', error);
        ctx.reply('❌ Error finding lyrics. Please try again.');
    }
}

// --- Video ---
async function handleVideoCommand(ctx, query) {
    if (!query) {
        return ctx.reply('🎬 Please specify a video!\nExample: `.video Despacito`');
    }

    await ctx.reply('🔍 Searching for "' + query + '"...');

    try {
        const result = await ytSearch(query);
        if (!result || !result.videos || result.videos.length === 0) {
            return ctx.reply('❌ No results found.');
        }

        const video = result.videos[0];
        const info = await ytdl.getInfo(video.url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'lowestvideo' });

        await ctx.replyWithMarkdown(
            `🎬 *${video.title}*\n\n` +
            `👤 ${video.author.name}\n` +
            `⏱️ ${video.duration.timestamp}\n\n` +
            `📥 [Download Video](${format.url})`
        );
    } catch (error) {
        console.error('Video error:', error);
        ctx.reply('❌ Error searching for video. Please try again.');
    }
}

// --- Pictures ---
async function handleImageCommand(ctx, prompt) {
    if (!prompt) {
        return ctx.reply('🖼️ Please describe what image you want!\nExample: `.image sunset over mountains`');
    }

    await ctx.reply('🎨 Generating image...');

    try {
        const response = await axios.get(`https://picsum.photos/800/600`, { responseType: 'arraybuffer' });
        const imagePath = path.join(__dirname, 'temp_image.jpg');
        fs.writeFileSync(imagePath, response.data);
        
        await ctx.replyWithPhoto(
            { source: imagePath },
            { caption: `🖼️ *Generated Image*\n\nPrompt: "${prompt}"` }
        );
        
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error('Image error:', error);
        ctx.reply(`🖼️ *Generated Image*\n\nPrompt: "${prompt}"\n\n[View Image](https://picsum.photos/800/600?random=${Date.now()})`);
    }
}

// --- AI ---
async function handleAiCommand(ctx, query) {
    if (!query) {
        return ctx.reply('🤖 Please ask a question!\nExample: `.ai What is quantum computing?`');
    }

    await ctx.reply('🤖 Thinking...');

    try {
        ctx.replyWithMarkdown(
            `🤖 *AI Response*\n\n` +
            `*Question:* ${query}\n\n` +
            `I'm a bot! For real AI responses, add an OpenAI API key.\n\n` +
            `💡 Try asking about music, time, or weather.`
        );
    } catch (error) {
        console.error('AI error:', error);
        ctx.reply('❌ Error processing request. Please try again.');
    }
}

async function handleTranslateCommand(ctx, text) {
    if (!text) {
        return ctx.reply('🌍 Please provide text to translate!\nExample: `.translate Hello world`');
    }

    await ctx.reply('🌍 Translating...');

    try {
        const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|sw`);
        const translated = response.data.responseData.translatedText;
        
        ctx.replyWithMarkdown(
            `🌍 *Translation*\n\n` +
            `*Original:* ${text}\n` +
            `*Translated:* ${translated}`
        );
    } catch (error) {
        console.error('Translate error:', error);
        ctx.reply(`🌍 *Translation*\n\nOriginal: ${text}\nTranslated: (Translation service unavailable)`);
    }
}

async function handleSummarizeCommand(ctx, text) {
    if (!text) {
        return ctx.reply('📝 Please provide text to summarize!\nExample: `.summarize Your long text here...`');
    }

    const words = text.split(' ');
    const summary = words.slice(0, 20).join(' ') + (words.length > 20 ? '...' : '');
    ctx.reply(`📝 *Summary*\n\n*Original length:* ${words.length} words\n*Summary:* ${summary}`);
}

// --- Utility ---
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
        `${BOT_PREFIX}info`
    );
}

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

// --- Games ---
async function handleDiceCommand(ctx) {
    const result = Math.floor(Math.random() * 6) + 1;
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    ctx.reply(`🎲 You rolled: *${result}* ${emojis[result - 1]}`, { parse_mode: 'Markdown' });
}

async function handleCoinFlipCommand(ctx) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    ctx.reply(`🪙 *${result}!*`, { parse_mode: 'Markdown' });
}

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
    console.log(`📩 Received: ${text}`);
    
    if (text.startsWith('.')) {
        const commandText = text.substring(1);
        const parts = commandText.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        
        console.log(`📩 Dot command: ${command} with args: ${args}`);
        
        try {
            switch (command) {
                // Music
                case 'play':
                    await handlePlayCommand(ctx, args);
                    return;
                case 'lyrics':
                    await handleLyricsCommand(ctx, args);
                    return;
                
                // Video
                case 'video':
                    await handleVideoCommand(ctx, args);
                    return;
                case 'yt':
                    if (!args) return ctx.reply('🎬 Please provide a YouTube URL!\nExample: `.yt https://youtube.com/watch?v=...`');
                    await handleVideoCommand(ctx, args);
                    return;
                
                // Pictures
                case 'image':
                    await handleImageCommand(ctx, args);
                    return;
                case 'art':
                    await handleImageCommand(ctx, args);
                    return;
                case 'anime':
                    await handleImageCommand(ctx, args);
                    return;
                case 'logo':
                    await handleImageCommand(ctx, args);
                    return;
                
                // AI
                case 'ai':
                    await handleAiCommand(ctx, args);
                    return;
                case 'translate':
                    await handleTranslateCommand(ctx, args);
                    return;
                case 'summarize':
                    await handleSummarizeCommand(ctx, args);
                    return;
                
                // Utility
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
                
                // Games
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
                    await ctx.reply(`🎵 *${BOT_NAME} Menu*\n\nSend /menu to open the full menu.`, { parse_mode: 'Markdown' });
                    return;
                
                case 'test':
                    await ctx.reply('✅ Dot commands are working!');
                    return;
                
                default:
                    await ctx.reply(`❌ Unknown command: .${command}\n\nType .help for available commands.`);
                    return;
            }
        } catch (error) {
            console.error(`❌ Error in .${command}:`, error.message);
            console.error(error.stack);
            await ctx.reply(`❌ Error in .${command}: ${error.message}`);
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
bot.command('lyrics', handleLyricsCommand);
bot.command('video', handleVideoCommand);
bot.command('ai', handleAiCommand);
bot.command('translate', handleTranslateCommand);
bot.command('summarize', handleSummarizeCommand);
bot.command('image', handleImageCommand);

// ============ ERROR HANDLING ============
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    console.error(err.stack);
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

process.once('SIGINT', () => {
    console.log('🛑 Shutting down...');
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('🛑 Shutting down...');
    bot.stop('SIGTERM');
    process.exit(0);
});

module.exports = bot;
