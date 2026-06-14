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
import axios from 'axios';
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
    {
      label: 'TODO',
      value: 'todo'
    },
    {
      label: '旅行',
      value: 'travel'
    }
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
        channel.send({ components: [row] });
      }
    } catch (error) {
      console.error('起動メッセージの送信に失敗しました:', error);
    }
  } else {
    console.warn('CHANNEL_ID が設定されていないため、起動メッセージは送信されませんでした。');
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  let delayFlg = false;
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId === 'menu') {
    const selectedValue = interaction.values[0];
    let content = '';
    if (selectedValue === 'movie') {
      const movieData = await db.selectFrom('moviedata').selectAll().orderBy('date', 'desc').limit(5).execute();
      content = `【映画】最後に見た5つは\n${movieData.map((movie) => movie.title).join('\n')}`;
    } else if (selectedValue === 'svr') {
      const logPath = process.env.BATCH_LOG_DIR;
      const certLog = logPath + "/cert.log";
      const mydnsLog = logPath + "/notice_mydns.jp";

      let latestCert = null;
      let latestNotice = null;        
      const certStr = fs.readFileSync(certLog, 'utf8');
      const certMatches = certStr.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+\w+\s+\d+\s+\d+:\d+:\d+\s+(AM|PM)\s+\w+\s+\d{4}$/gm);
      const lastDate = certMatches?.at(-1);
      if(certMatches){
        const dateTime = DateTime.fromFormat(
          (lastDate ?? ''),
          'ccc LLL  d hh:mm:ss a z yyyy',
          { locale: 'en', zone: 'Asia/Tokyo' }
        );
        latestCert = dateTime.toFormat('yyyy/MM/dd');
      }

      const mydnsStr = fs.readFileSync(mydnsLog, 'utf8');
      const mydnsMatches = mydnsStr.match(/(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} UTC)/);
      if(mydnsMatches){
        const dateTime = DateTime.fromFormat(
          mydnsMatches[0],
          'yyyy/MM/dd HH:mm:ss z'
        );
        latestNotice = dateTime.toFormat('yyyy/MM/dd') ?? mydnsMatches[0];
      }
      content = `【サーバー確認】\ncertbot最新：${latestCert}\nmydns最新：${latestNotice}`;
    } else if(selectedValue === 'todo') {
      delayFlg = true;
      await interaction.deferReply();
      const res = await axios.get('http://localhost:3001/api/ai/todo');
      if (res.status == 200) {
        const high = res.data.todo.filter((item: any) => item.priority === 3).map((item: any) => `「${item.title}」\n${item?.reason}`).join('\n');
        const mid = res.data.todo.filter((item: any) => item.priority === 2).map((item: any) => `「${item.title}」\n${item?.reason}`).join('\n');
        const row = res.data.todo.filter((item: any) => item.priority === 1).map((item: any) => `「${item.title}」\n${item?.reason}`).join('\n');

        content = `
        ${res.data?.summary}
        *高*
        ${high}

        *中*
        ${mid}

        *低*
        ${row}
        `
      } else {
        content = `TODO生成失敗:${res.status}`;
      }
    } else if (selectedValue === 'travel') {
      const travelData = await db.selectFrom('travel_todo')
        .selectAll()
        .where('is_done', '=', 0)
        .where('is_deleted', '=', 0)
        .execute();
      content = `*行き先*\n\n${travelData.map((item: any) => item.destination).join('\n')}`;
    } else {
      content = '選択された値: ' + selectedValue;
    }
    if (!delayFlg) {
      await interaction.reply({ 
        content: content,
        components: [row],
      });
    } else {
      // 重いときはeditReply
      await interaction.editReply({
        content: content,
        components: [row]
      });
    }
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
