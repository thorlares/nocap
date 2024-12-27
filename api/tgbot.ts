import { VercelRequest, VercelResponse } from '@vercel/node'
import { Markup, Telegraf } from 'telegraf'
import d from 'debug'
import { getAddresses } from './airdrop.js'
import { getEthBalances } from '../api_lib/ethBalance.js'
import { formatUnits } from 'viem'

const debug = d('nc:tgbot')

if (!process.env.TGBOT_TOKEN) throw new Error('TGBOT_TOKEN is not configured')

const bot = new Telegraf(process.env.TGBOT_TOKEN)

bot.command('start', async (ctx) => {
  if (ctx.payload) debug('invited by %o', ctx.payload)
  return ctx
    .reply(
      "NoCap.Tips is the first app that rewards you for your holdings without any additional requirements. Let's go big! No Cap! 🚀",
      Markup.inlineKeyboard([
        [Markup.button.callback('📈 My Profile', 'profile')],
        [Markup.button.webApp('💰 Connect address', `${process.env.VITE_BASE_PATH}/airdrop/`)]
        // [Markup.button.callback('📩 Get Invite Link', 'invite')]
      ])
    )
    .catch(console.error)
})

bot.action('profile', async (ctx) => {
  const thread = await ctx.reply('Loading')
  const addresses = (await getAddresses(ctx.from.id)).map((d: any) => d.address)
  if (addresses.length === 0) {
    ctx.deleteMessage(thread.message_id)
    return ctx.reply(
      'No addresses connected',
      Markup.inlineKeyboard([[Markup.button.webApp('💰 Connect address', `${process.env.VITE_BASE_PATH}/airdrop/`)]])
    )
  }
  const balances = await Promise.all(addresses.map(getEthBalances))
  debug('balances %o', balances)
  const formatBalances = (balances: any) => {
    if (!balances?.balance) return ''
    debug('balance %o', balances.balance)
    return balances.balance
      .map((b: any) => {
        debug(b.verifiedContract, b.verified_contract, b.symbol, formatUnits(b.balance, b.decimals))
        return b.verifiedContract || b.verified_contract
          ? `\n          \- ${b.symbol}: ${formatUnits(b.balance, b.decimals)}`
          : ''
      })
      .join('')
  }
  const addressWithBalances = addresses
    .map((d, i) => `\n       \- ${d.substring(0, 8)}...${d.substring(d.length - 6)}${formatBalances(balances[i])}`)
    .join('')
  ctx.deleteMessage(thread.message_id)
  ctx.reply(
    `👤 Username: ${ctx.from.username}\n📖 Connected addresses\
${addressWithBalances}\n\
💰 Accumulated rewards: 0\n\
📈 Est. reward today: 0`
  )
})

bot.action('invite', (ctx) =>
  ctx.reply(
    `💰 Join NoCap.Tips to earn rewards simply by holding your coins! There is nothing else to do.\n\
🔥 Let's go big! No Cap!\n\
https://t.me/NoCapTipsBot?start=${ctx.from.username}`,
    { link_preview_options: { is_disabled: true } }
  )
)

export default async (req: VercelRequest, res: VercelResponse) => {
  return bot.webhookCallback('/api/tgbot', { secretToken: process.env.TGBOT_WEBHOOK_TOKEN })(req, res)
}
