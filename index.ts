import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';

// .env ファイルから環境変数を読み込み
dotenv.config();

// Botのクライアントを作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

// 起動時の処理
client.once('ready', async (readyClient) => {
    console.log(`${readyClient.user.tag} としてログインしました`);

    // 環境変数からチャンネルIDを取得して起動メッセージを送信
    const channelId = process.env.CHANNEL_ID;
    if (channelId) {
        try {
            const channel = await readyClient.channels.fetch(channelId);
            if (channel && 'send' in channel) {
                await channel.send('Botが起動しました 🤖');
            }
        } catch (error) {
            console.error('起動メッセージの送信に失敗しました:', error);
        }
    } else {
        console.warn('CHANNEL_ID が設定されていないため、起動メッセージは送信されませんでした。');
    }
});

// メッセージを受け取った時の処理
client.on('messageCreate', (message) => {
    // Bot自身の発言は無視する
    if (message.author.bot) return;

    // 「こんにちは」と来たら「こんにちは！」と返す
    if (message.content === 'こんにちは') {
        message.channel.send('こんにちは！');
    }
});

// 環境変数からトークンを取得してログイン
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('エラー: 環境変数 BOT_TOKEN が設定されていません。.env ファイルを確認してください。');
    process.exit(1);
}

client.login(token);

