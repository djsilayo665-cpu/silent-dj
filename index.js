// index.js - Silent DJ Bot (Music + Video + Pictures + AI)
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

// ============ GLOBAL VARIABLES ============
const userSessions = new Map();
const downloads = new Map();

// ============ MAIN MENU ============
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

// ============ MENU CALLBACKS ============
bot.action('menu_music', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎵 *Music Commands*\n\n` +
        `${BOT_PREFIX}play <song> - Play a song\n` +
        `${BOT_PREFIX}lyrics <song> - Get lyrics\n` +
        `${BOT_PREFIX}spotify <song> - Search Spotify\n` +
        `${BOT_PREFIX}pause - Pause\n` +
        `${BOT_PREFIX}resume - Resume\n` +
        `${BOT_PREFIX}stop - Stop\n` +
        `${BOT_PREFIX}skip - Skip\n` +
        `${BOT_PREFIX}queue - Show queue\n` +
        `${BOT_PREFIX}volume <0-100> - Volume`
    );
});

bot.action('menu_video', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎬 *Video Commands*\n\n` +
        `${BOT_PREFIX}video <song> - Download video\n` +
        `${BOT_PREFIX}yt <url> - Download YouTube\n` +
        `${BOT_PREFIX}tiktok <url> - Download TikTok\n` +
        `${BOT_PREFIX}instagram <url> - Download Instagram\n` +
        `${BOT_PREFIX}facebook <url> - Download Facebook`
    );
});

bot.action('menu_pictures', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🖼️ *Picture Commands*\n\n` +
        `${BOT_PREFIX}image <prompt> - Generate AI image\n` +
        `${BOT_PREFIX}art <prompt> - Art style image\n` +
        `${BOT_PREFIX}anime <prompt> - Anime style\n` +
        `${BOT_PREFIX}real <prompt> - Realistic image\n` +
        `${BOT_PREFIX}logo <text> - Generate logo`
    );
});

bot.action('menu_ai', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🤖 *AI Commands*\n\n` +
        `${BOT_PREFIX}ai <question> - Ask AI\n` +
        `${BOT_PREFIX}chat <message> - Chat with AI\n` +
        `${BOT_PREFIX}translate <text> - Translate to English\n` +
        `${BOT_PREFIX}summarize <text> - Summarize text\n` +
        `${BOT_PREFIX}analyze <text> - Analyze sentiment`
    );
});

bot.action('menu_games', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🎮 *Game Commands*\n\n` +
        `${BOT_PREFIX}dice - Roll a dice\n` +
        `${BOT_PREFIX}coinflip - Flip a coin\n` +
        `${BOT_PREFIX}joke - Random joke\n` +
        `${BOT_PREFIX}trivia - Random trivia\n` +
        `${BOT_PREFIX}rps <rock/paper/scissors> - Rock Paper Scissors`
    );
});

bot.action('menu_utility', (ctx) => {
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(
        `🛠️ *Utility Commands*\n\n` +
        `${BOT_PREFIX}ping - Check bot status\n` +
        `${BOT_PREFIX}time - Current time\n` +
        `${BOT_PREFIX}weather <city> - Weather forecast\n` +
        `${BOT_PREFIX}news - Latest news\n` +
        `${BOT_PREFIX}info - Bot info\n` +
        `${BOT_PREFIX}status - Your status`
    );
});

// ============ START COMMAND ============
bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎵 *${BOT_NAME} Bot*\n\n` +
        `Welcome to ${BOT_NAME}! I can help you with:\n\n` +
        `🎵 Music - Play songs from YouTube\n` +
        `🎬 Video - Download videos\n` +
        `🖼️ Pictures - Generate images\n` +
        `🤖 AI - Chat and get answers\n\n` +
        `Send /menu to see all commands.`
    );
});

// ============ MUSIC COMMANDS ============

// PLAY MUSIC
bot.command('play', async (ctx) => {
    const query = ctx.message.text.replace('/play', '').trim();
    if (!query) {
        return ctx.reply('🎵 Please specify a song!\nExample: `/play Despacito`');
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
});

// LYRICS
bot.command('lyrics', async (ctx) => {
    const query = ctx.message.text.replace('/lyrics', '').trim();
    if (!query) {
        return ctx.reply('📝 Please specify a song!\nExample: `/lyrics Despacito`');
    }

    await ctx.reply('🔍 Searching for lyrics...');

    try {
        // Search for the song first
        const result = await ytSearch(query);
        if (!result || !result.videos || result.videos.length === 0) {
            return ctx.reply('❌ No results found.');
        }

        const video = result.videos[0];
        
        // Try to get lyrics from API
        try {
            const response = await axios.get(`https://api.lyrics.ovh/v1/${video.author.name}/${video.title}`);
            const lyrics = response.data.lyrics;
            
            // Truncate if too long
            const truncated = lyrics.length > 4096 ? lyrics.substring(0, 4000) + '\n... (truncated)' : lyrics;
            
            await ctx.replyWithMarkdown(
                `📝 *${video.title}*\n` +
                `👤 ${video.author.name}\n\n` +
                `\`\`\`\n${truncated}\n\`\`\``
            );
        } catch (apiError) {
            // If lyrics API fails, send fallback
            ctx.reply(`📝 *${video.title}*\n👤 ${video.author.name}\n\nLyrics not available. Try searching on Google.`);
        }
    } catch (error) {
        console.error('Lyrics error:', error);
        ctx.reply('❌ Error finding lyrics. Please try again.');
    }
});

// ============ VIDEO COMMANDS ============

// YOUTUBE VIDEO DOWNLOAD
bot.command('yt', async (ctx) => {
    const url = ctx.message.text.replace('/yt', '').trim();
    if (!url || !ytdl.validateURL(url)) {
        return ctx.reply('🎬 Please provide a valid YouTube URL!\nExample: `/yt https://youtube.com/watch?v=...`');
    }

    await ctx.reply('📥 Downloading... This may take a moment.');

    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        
        // Get the video URL
        const format = ytdl.chooseFormat(info.formats, { quality: 'lowestvideo' });
        
        await ctx.replyWithMarkdown(
            `🎬 *${title}*\n\n` +
            `📥 Download link:\n${format.url}\n\n` +
            `⏱️ Duration: ${info.videoDetails.lengthSeconds} seconds\n` +
            `👀 Views: ${info.videoDetails.viewCount}`
        );
    } catch (error) {
        console.error('YT error:', error);
        ctx.reply('❌ Error downloading video. Please try again.');
    }
});

// VIDEO SEARCH AND DOWNLOAD
bot.command('video', async (ctx) => {
    const query = ctx.message.text.replace('/video', '').trim();
    if (!query) {
        return ctx.reply('🎬 Please specify a video!\nExample: `/video Despacito`');
    }

    await ctx.reply('🔍 Searching for "' + query + '"...');

    try {
        const result = await ytSearch(query);
        if (!result || !result.videos || result.videos.length === 0) {
            return ctx.reply('❌ No results found.');
        }

        const video = result.videos[0];
        
        // Get download link
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
});

// ============ PICTURE COMMANDS ============

// IMAGE GENERATION (Mock - Uses placeholder image API)
bot.command('image', async (ctx) => {
    const prompt = ctx.message.text.replace('/image', '').trim();
    if (!prompt) {
        return ctx.reply('🖼️ Please describe what image you want!\nExample: `/image sunset over mountains`');
    }

    await ctx.reply('🎨 Generating image... Please wait.');

    try {
        // Using a free placeholder image API
        const response = await axios.get(`https://picsum.photos/800/600`, { responseType: 'arraybuffer' });
        
        // Save the image temporarily
        const imagePath = path.join(__dirname, 'temp_image.jpg');
        fs.writeFileSync(imagePath, response.data);
        
        // Send the image
        await ctx.replyWithPhoto(
            { source: imagePath },
            { caption: `🖼️ *Generated Image*\n\nPrompt: "${prompt}"` }
        );
        
        // Clean up
        fs.unlinkSync(imagePath);
        
    } catch (error) {
        console.error('Image error:', error);
        ctx.reply('❌ Error generating image. Using fallback...');
        
        // Fallback: Send a random image URL
        ctx.reply(
            `🖼️ *Generated Image*\n\nPrompt: "${prompt}"\n\n` +
            `📷 [View Image](https://picsum.photos/800/600?random=${Date.now()})`
        );
    }
});

// ART STYLE
bot.command('art', async (ctx) => {
    const prompt = ctx.message.text.replace('/art', '').trim();
    if (!prompt) {
        return ctx.reply('🎨 Please describe what art you want!\nExample: `/art portrait in oil painting style`');
    }

    await ctx.reply('🎨 Creating art...');

    try {
        const response = await axios.get(`https://picsum.photos/800/600`, { responseType: 'arraybuffer' });
        const imagePath = path.join(__dirname, 'temp_art.jpg');
        fs.writeFileSync(imagePath, response.data);
        
        await ctx.replyWithPhoto(
            { source: imagePath },
            { caption: `🎨 *Art Generation*\n\nPrompt: "${prompt}"\nStyle: Art` }
        );
        
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error('Art error:', error);
        ctx.reply(`🎨 *Art Generation*\n\nPrompt: "${prompt}"\n\n[View Art](https://picsum.photos/800/600?random=${Date.now()})`);
    }
});

// ANIME STYLE
bot.command('anime', async (ctx) => {
    const prompt = ctx.message.text.replace('/anime', '').trim();
    if (!prompt) {
        return ctx.reply('🎌 Please describe what anime image you want!\nExample: `/anime magical girl`');
    }

    await ctx.reply('🎌 Generating anime image...');

    try {
        const response = await axios.get(`https://picsum.photos/800/600`, { responseType: 'arraybuffer' });
        const imagePath = path.join(__dirname, 'temp_anime.jpg');
        fs.writeFileSync(imagePath, response.data);
        
        await ctx.replyWithPhoto(
            { source: imagePath },
            { caption: `🎌 *Anime Style*\n\nPrompt: "${prompt}"` }
        );
        
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error('Anime error:', error);
        ctx.reply(`🎌 *Anime Style*\n\nPrompt: "${prompt}"\n\n[View Image](https://picsum.photos/800/600?random=${Date.now()})`);
    }
});

// LOGO GENERATOR
bot.command('logo', async (ctx) => {
    const text = ctx.message.text.replace('/logo', '').trim();
    if (!text) {
        return ctx.reply('🎨 Please specify text for the logo!\nExample: `/logo Silent DJ`');
    }

    await ctx.reply('🎨 Generating logo...');

    try {
        // Using a free logo API
        const url = `https://api.adorable.io/avatars/400/${text.replace(/ /g, '')}.png`;
        
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const imagePath = path.join(__dirname, 'temp_logo.png');
        fs.writeFileSync(imagePath, response.data);
        
        await ctx.replyWithPhoto(
            { source: imagePath },
            { caption: `🎨 *Logo Generated*\n\nText: "${text}"` }
        );
        
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error('Logo error:', error);
        ctx.reply(`🎨 *Logo Generated*\n\nText: "${text}"\n\n[View Logo](https://api.adorable.io/avatars/400/${text.replace(/ /g, '')}.png)`);
    }
});

// ============ AI COMMANDS ============

// AI CHAT
bot.command('ai', async (ctx) => {
    const query = ctx.message.text.replace('/ai', '').trim();
    if (!query) {
        return ctx.reply('🤖 Please ask a question!\nExample: `/ai What is quantum computing?`');
    }

    await ctx.reply('🤖 Thinking...');

    try {
        // Using a free AI API (mock - replace with actual AI API)
        const response = await axios.get(`https://api.agify.io/?name=AI`);
        
        // Since we don't have a real AI API key, we'll provide a mock response
        ctx.replyWithMarkdown(
            `🤖 *AI Response*\n\n` +
            `*Question:* ${query}\n\n` +
            `*Answer:* I'm a bot! For real AI responses, please add an OpenAI API key.\n\n` +
            `💡 *Quick Tip:* You can ask me about:\n` +
            `• Weather\n` +
            `• Time\n` +
            `• Music\n` +
            `• And more!`
        );
        
        // If you have OpenAI API key, uncomment this:
        /*
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: query }]
        });
        ctx.reply(completion.choices[0].message.content);
        */
        
    } catch (error) {
        console.error('AI error:', error);
        ctx.reply('❌ Error processing request. Please try again.');
    }
});

// TRANSLATE
bot.command('translate', async (ctx) => {
    const text = ctx.message.text.replace('/translate', '').trim();
    if (!text) {
        return ctx.reply('🌍 Please provide text to translate!\nExample: `/translate Hello world`');
    }

    await ctx.reply('🌍 Translating...');

    try {
        // Using a free translation API
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
});

// SUMMARIZE
bot.command('summarize', async (ctx) => {
    const text = ctx.message.text.replace('/summarize', '').trim();
    if (!text) {
        return ctx.reply('📝 Please provide text to summarize!\nExample: `/summarize [long text here]`');
    }

    await ctx.reply('📝 Summarizing...');

    try {
        // Simple summarization (mock)
        const words = text.split(' ');
        const summary = words.slice(0, 20).join(' ') + (words.length > 20 ? '...' : '');
        
        ctx.replyWithMarkdown(
            `📝 *Summary*\n\n` +
            `*Original length:* ${words.length} words\n` +
            `*Summary:* ${summary}\n\n` +
            `💡 For better summarization, add an AI API key.`
        );
    } catch (error) {
        console.error('Summarize error:', error);
        ctx.reply('❌ Error summarizing text. Please try again.');
    }
});

// ============ GAME COMMANDS ============

bot.command('dice', (ctx) => {
    const result = Math.floor(Math.random() * 6) + 1;
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    ctx.reply(`🎲 You rolled: *${result}* ${emojis[result - 1]}`, { parse_mode: 'Markdown' });
});

bot.command('coinflip', (ctx) => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    ctx.reply(`🪙 *${result}!*`, { parse_mode: 'Markdown' });
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

// ============ UTILITY COMMANDS ============

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

bot.command('time', (ctx) => {
    const now = moment();
    ctx.replyWithMarkdown(
        `🕐 *Current Time*\n\n` +
        `📅 Date: ${now.format('MMMM D, YYYY')}\n` +
        `🕐 Time: ${now.format('h:mm:ss A')}\n` +
        `📆 Day: ${now.format('dddd')}\n` +
        `🌍 Timezone: UTC`
    );
});

bot.command('info', (ctx) => {
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
});

bot.command('stats', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ This command is only for the bot owner.');
    }
    
    ctx.replyWithMarkdown(
        `📊 *${BOT_NAME} Statistics*\n\n` +
        `Bot: ✅ Online\n` +
        `Features: Music, Video, Pictures, AI\n` +
        `Commands: 30+\n` +
        `Platform: Telegram\n` +
        `Version: 2.0.0`
    );
});

// ============ GROUP MANAGEMENT ============

bot.command('kick', async (ctx) => {
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

bot.command('ban', async (ctx) => {
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

// ============ HELP ============
bot.command('help', (ctx) => {
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
});

// ============ ERROR HANDLING ============
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
});

// ============ START BOT ============
bot.launch().then(() => {
    console.log(`🎵 ${BOT_NAME} Bot is running!`);
    console.log(`📱 @${bot.botInfo?.username || 'unknown'}`);
    console.log(`📋 Prefix: ${BOT_PREFIX}`);
    console.log(`📊 Features: Music, Video, Pictures, AI`);
}).catch(err => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
