import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'

export function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured', 'DATABASE_URL', process.env.DATABASE_URL)
    return new Response('Server is not properly configured', { status: 500 })
  }

  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })
  const network = url.searchParams.get('network') ?? 'livenet'

  return createKysely<DB>({ connectionString: process.env.DATABASE_URL })
    .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
    .select(['ca', (eb) => eb.fn.sum('confirmed').as('confirmed'), (eb) => eb.fn.sum('unconfirmed').as('unconfirmed')])
    .where('ca', '=', address)
    .groupBy('ca')
    .executeTakeFirst()
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
