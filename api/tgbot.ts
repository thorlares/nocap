import { VercelRequest, VercelResponse } from '@vercel/node'
import { Markup, Telegraf } from 'telegraf'
import d from 'debug'
import { sql } from 'kysely'
import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'
import { formatUnits } from 'viem'

const debug = d('nc:tgbot')

if (!process.env.TGBOT_TOKEN) throw new Error('TGBOT_TOKEN is not configured')

const bot = new Telegraf(process.env.TGBOT_TOKEN)

export async function tgSendMessage(tgid: any, message: string, options?: any): Promise<any> {
  return bot.telegram.sendMessage(tgid, message, options)
}

bot.command('start', async (ctx) => {
  if (ctx.payload) debug('invited by %o', ctx.payload)
  return ctx
    .reply(
      "NoCap.Tips is the first app that rewards you for your holdings without any additional requirements. Let's go big! No Cap! 🚀",
      Markup.inlineKeyboard([
        [Markup.button.callback('📈 My Profile', 'profile')],
        [Markup.button.callback('🎁 Ongoing Airdrops', 'airdrop')],
        [Markup.button.webApp('💰 Connect address', `${process.env.VITE_BASE_PATH}/airdrop/`)],
        [Markup.button.url('Add me to Group/Channel', `t.me/NoCapTipsBot?startgroup=botstart`)]
        // [Markup.button.callback('📩 Get Invite Link', 'invite')]
      ])
    )
    .catch(console.error)
})

export async function getEthAddressesWithLastBalance(tgid: any) {
  const db = createKysely<DB>({ connectionString: process.env.POSTGRES_URL })
  return await db
    .selectFrom('eth_address')
    .leftJoin('user', 'user.id', 'eth_address.uid')
    .leftJoin(
      db
        .selectFrom('eth_balance')
        .select([
          'eth_id',
          'balance',
          'created_at',
          sql<number>`ROW_NUMBER() OVER (PARTITION BY eth_id ORDER BY created_at DESC)`.as('rn')
        ])
        .as('latest_balance'),
      'latest_balance.eth_id',
      'eth_address.id'
    )
    .select(['eth_address.address', 'latest_balance.balance', 'latest_balance.created_at'])
    .where('latest_balance.rn', '=', 1)
    .where('user.tgid', '=', tgid)
    .execute()
}

export async function getSolAddressesWithLastBalance(tgid: any) {
  const db = createKysely<DB>({ connectionString: process.env.POSTGRES_URL })
  return await db
    .selectFrom('sol_address')
    .leftJoin('user', 'user.id', 'sol_address.uid')
    .leftJoin(
      db
        .selectFrom('sol_balance')
        .select([
          'sol_id',
          'balance',
          'created_at',
          sql<number>`ROW_NUMBER() OVER (PARTITION BY sol_id ORDER BY created_at DESC)`.as('rn')
        ])
        .as('latest_balance'),
      'latest_balance.sol_id',
      'sol_address.id'
    )
    .select(['sol_address.address', 'latest_balance.balance', 'latest_balance.created_at'])
    .where('latest_balance.rn', '=', 1)
    .where('user.tgid', '=', tgid)
    .execute()
}

bot.action('profile', async (ctx) => {
  const thread = await ctx.reply('Loading')
  const addressesEth = await getEthAddressesWithLastBalance(ctx.from.id).catch((e) => {
    debug('error %o', e)
    return []
  })
  const addressesSol = await getSolAddressesWithLastBalance(ctx.from.id).catch((e) => {
    debug('error %o', e)
    return []
  })
  if (addressesEth.length === 0 && addressesSol.length === 0) {
    ctx.deleteMessage(thread.message_id)
    return ctx.reply(
      'No addresses connected',
      Markup.inlineKeyboard([[Markup.button.webApp('💰 Connect address', `${process.env.VITE_BASE_PATH}/airdrop/`)]])
    )
  }
  debug('balances %o', addressesEth)
  const formatBalancesEth = (balance: any, created_at: any) => {
    try {
      debug('balance %o', balance)
      if (!balance?.tokens) return '\n          - (No data yet)'
      return (
        balance.tokens
          .map((b: any) => {
            return b.verifiedContract || b.verified_contract
              ? `\n          \- ${b.symbol}: ${formatUnits(b.balance, b.decimals)}`
              : ''
          })
          .join('') + `\n            (${new Date(created_at).toLocaleDateString()})`
      )
    } catch (e) {
      debug('error %o', e)
      return ''
    }
  }
  const addressWithBalancesEth = addressesEth
    .map(
      ({ address, balance, created_at }) =>
        `\n       \- ${address.substring(0, 8)}...${address.substring(address.length - 6)}${formatBalancesEth(
          balance,
          created_at
        )}`
    )
    .join('')
  const formatBalancesSol = (balance: any, created_at: any) => {
    try {
      debug('balance %o', balance)
      if (!balance?.tokens) return '\n          - (No data yet)'
      return (
        `\n          \- SOL: ${balance.nativeBalance}` +
        balance.tokens
          .map((b: any) => {
            return `\n          \- ${b.symbol}: ${formatUnits(b.amount, b.decimals)}`
          })
          .join('') +
        `\n            (${new Date(created_at).toLocaleDateString()})`
      )
    } catch (e) {
      debug('error %o', e)
      return ''
    }
  }
  const addressWithBalancesSol = addressesSol
    .map(
      ({ address, balance, created_at }) =>
        `\n       \- ${address.substring(0, 8)}...${address.substring(address.length - 6)}${formatBalancesSol(
          balance,
          created_at
        )}`
    )
    .join('')
  ctx.deleteMessage(thread.message_id)
  ctx.reply(
    `👤 Username: ${ctx.from.username}\n📖 Connected addresses\
${addressWithBalancesEth}${addressWithBalancesSol}\n\
💰 Accumulated rewards: 0\n\
📈 Est. reward today: 0`
  )
})

bot.action('airdrop', (ctx) =>
  ctx.reply(
    "🔜 Airdrops coming soon...\n👉 Connect your address to prepare in advance. Let's go big! No cap!🔥",
    Markup.inlineKeyboard([[Markup.button.webApp('💰 Connect address', `${process.env.VITE_BASE_PATH}/airdrop/`)]])
  )
)

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
