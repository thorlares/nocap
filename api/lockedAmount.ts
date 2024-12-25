import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'

export function GET(request: Request) {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not configured', 'POSTGRES_URL', process.env.POSTGRES_URL)
    return new Response('Server is not properly configured', { status: 500 })
  }

  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  const lock_address = url.searchParams.get('lock_address')
  if (!address) return new Response('Coin address is required', { status: 400 })
  const network = url.searchParams.get('network') ?? 'livenet'

  return createKysely<DB>({ connectionString: process.env.POSTGRES_URL })
    .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
    .select(['ca', (eb) => eb.fn.sum('confirmed').as('confirmed'), (eb) => eb.fn.sum('unconfirmed').as('unconfirmed')])
    .where((eb) =>
      lock_address ? eb('ca', '=', address).and(eb('lock_address', '=', lock_address)) : eb('ca', '=', address)
    )
    .groupBy('ca')
    .executeTakeFirst()
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
