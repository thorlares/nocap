import { Telegraf } from 'telegraf'

if (!process.env.TGBOT_TOKEN) throw new Error('TGBOT_TOKEN is not configured')
const bot = new Telegraf(process.env.TGBOT_TOKEN)

const webhookUrl = `${process.env.BASE_PATH}/api/tgbot`
const isSet = await bot.telegram.setWebhook(webhookUrl, { secret_token: process.env.TGBOT_WEBHOOK_TOKEN })
console.log(`Webhook set to ${webhookUrl}: ${isSet}`)
