import { VercelRequest, VercelResponse } from '@vercel/node'
import { Markup, Telegraf } from 'telegraf'
import d from 'debug'
import { SignJWT } from 'jose'

const debug = d('nc:tgbot')
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET!)

if (!process.env.TGBOT_TOKEN) throw new Error('TGBOT_TOKEN is not configured')

const bot = new Telegraf(process.env.TGBOT_TOKEN)

bot.command('start', async (ctx) => {
  if (ctx.payload) debug('invited by %o', ctx.payload)
  const token = await new SignJWT({ id: ctx.from.id, username: ctx.from.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secretKey)
  return ctx
    .reply(
      "NoCap.Tips is the first app that rewards you for your holdings without any additional requirements. Let's go big! No Cap! 🚀",
      Markup.inlineKeyboard([
        [Markup.button.webApp('💰 Check My Holdings', `${process.env.VITE_BASE_PATH}/airdrop/`)]
        // [Markup.button.callback('📈 My Profile', 'profile')],
        // [Markup.button.callback('📩 Get Invite Link', 'invite')]
      ])
    )
    .catch(console.error)
})

bot.action('profile', (ctx) => ctx.reply('https://nocap.tips'))

bot.action('invite', (ctx) =>
  ctx.reply(
    `💰 Join NoCap.Tips to earn rewards simply by holding your coins! There is nothing else to do.
🔥 Let's go big! No Cap!
https://t.me/NoCapTipsBot?start=${ctx.from.username}`,
    { link_preview_options: { is_disabled: true } }
  )
)

export default async (req: VercelRequest, res: VercelResponse) => {
  return bot.webhookCallback('/api/tgbot', { secretToken: process.env.TGBOT_WEBHOOK_TOKEN })(req, res)
}