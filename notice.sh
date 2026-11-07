SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

eval "$(sed 's/\r$//' "${SCRIPT_DIR}/.env")"
# Discord Webhook or Bot API でメッセージ送信
curl -X POST "https://discord.com/api/v10/channels/${CHANNEL_ID}/messages" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$1\"}"