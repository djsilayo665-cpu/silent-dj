// index.js - Test Music Command
require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ===== MUSIC COMMAND =====
bot.command('play', async (ctx) => {
    const query = ctx.message.text.replace('/play', '').trim();
    if (!query) {
        return ctx.reply('🎵 Please specify a song!\nExample: `/play Despacito`');
    }

    try {
        const ytSearch = await import('yt-search');
        const result = await ytSearch.default(query);

        if (!result?.videos?.length) {
            return ctx.reply('❌ No results found.');
        }

        const video = result.videos[0];
        await ctx.replyWithMarkdown(
            `🎵 *${video.title}*\n` +
            `👤 ${video.author.name}\n` +
            `⏱️ ${video.duration.timestamp}\n` +
            `🔗 [Watch](${video.url})`
        );
    } catch (error) {
        console.error('Play error:', error);
        ctx.reply('❌ Error searching. Please try again.');
    }
});

// ===== START =====
bot.start((ctx) => {
    ctx.reply('🎵 Silent DJ Bot is online!\nSend /play <song>');
});

bot.launch();
console.log('✅ Bot running! Test /play');
