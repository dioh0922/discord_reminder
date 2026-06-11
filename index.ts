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
        //await channel.send('Botが起動しました 🤖');
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
    if (selectedValue === 'movie') {
      const movieData = await db.selectFrom('moviedata').selectAll().orderBy('date', 'desc').limit(5).execute();
      console.log(movieData);
      await interaction.reply({
        content: `【映画】最後に見た5つは\n${movieData.map((movie) => movie.title).join('\n')}`
      });
    }else{
      await interaction.reply({ content: '選択された値: ' + selectedValue, components: [row] });
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
