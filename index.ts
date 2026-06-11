import { 
  Client,
  GatewayIntentBits, 
  Events, 
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import { db } from './src/db.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { DateTime } from 'luxon';
// .env ファイルから環境変数を読み込み
dotenv.config();

const slashCommand = new SlashCommandBuilder()
  .setName('menu')
  .setDescription('メニューを表示します');

const selectMenu = new StringSelectMenuBuilder()
  .setCustomId('menu')
  .setPlaceholder('メニューを選択してください')
  .addOptions([
    {
      label: '映画',
      value: 'movie',
    },
    {
      label: 'サーバー確認',
      value: 'svr',
    },
  ]);

const row = new ActionRowBuilder<StringSelectMenuBuilder>()
  .addComponents(selectMenu);

// Botのクライアントを作成
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 起動時の処理
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`${readyClient.user.tag} としてログインしました`);

  // 環境変数からチャンネルIDを取得して起動メッセージを送信
  const channelId = process.env.CHANNEL_ID;
  if (channelId) {
    try {
      const channel = await readyClient.channels.fetch(channelId);
      if (channel && 'send' in channel) {
        channel.send({ content: 'Botが起動しました 🤖', components: [row] });
      }
    } catch (error) {
      console.error('起動メッセージの送信に失敗しました:', error);
    }
  } else {
    console.warn('CHANNEL_ID が設定されていないため、起動メッセージは送信されませんでした。');
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId === 'menu') {
    const selectedValue = interaction.values[0];
    let content = '';
    if (selectedValue === 'movie') {
      const movieData = await db.selectFrom('moviedata').selectAll().orderBy('date', 'desc').limit(5).execute();
      content = `【映画】最後に見た5つは\n${movieData.map((movie) => movie.title).join('\n')}`;
    }else if(selectedValue === 'svr'){
      const logPath = process.env.BATCH_LOG_DIR;
      const certLog = logPath + "/cert.log";
      const mydnsLog = logPath + "/notice_mydns.jp";
      const datePattern = '/([A-Za-z]{3} \s*\d{1,2} \s*\d{2}:\d{2}:\d{2} \s*[APM]{2} \s*[A-Z]{3} \s*\d{4})/';
      let latestDate = null;
      if(fs.existsSync(certLog)){
        
        const logStr = fs.readFileSync(certLog, 'utf8');
        const matches = logStr.match(datePattern);
        if(matches){
          const dateTime = DateTime.fromFormat(
            matches[0],
            'yyyy/MM/dd HH:mm:ss ZZZ'
          );
          latestDate = dateTime.toFormat('Y/m/d');
        }
      }
      if(fs.existsSync(mydnsLog)){
        const logStr = fs.readFileSync(mydnsLog, 'utf8');
        const matches = logStr.match(datePattern);
        if(matches){
          const dateTime = DateTime.fromFormat(
            matches[0],
            'yyyy/MM/dd HH:mm:ss ZZZ'
          );
          latestDate = dateTime.toFormat('Y/m/d');
        }
      }
      content = `【サーバー確認】certbot最新：${latestDate}\nmydns最新：${latestDate}`;
    }else{
      content = '選択された値: ' + selectedValue;
    }
    await interaction.reply({ 
      content: content,
      components: [row],
    });
  }
});

// メッセージを受け取った時の処理
client.on(Events.MessageCreate, async (message) => {
  // Bot自身の発言は無視する
  if (message.author.bot) return;

  // 「こんにちは」と来たら「こんにちは！」と返す
  if (message.content === 'こんにちは') {
    await message.channel.send('こんにちは！');
  }
});

// 環境変数からトークンを取得してログイン
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('エラー: 環境変数 BOT_TOKEN が設定されていません。.env ファイルを確認してください。');
  process.exit(1);
}

client.login(token);
