import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'
import { updateAmount } from '../api_lib/updateAmount.js'
import { sql } from 'kysely'
import { Network } from '../lib/types.js'

export function GET(request: Request) {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not configured', 'POSTGRES_URL', process.env.POSTGRES_URL)
    return new Response('Server is not properly configured', { status: 500 })
  }

  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })
  const network = (url.searchParams.get('network') ?? 'livenet') as Network

  const db = createKysely<DB>({ connectionString: process.env.POSTGRES_URL })
  return (
    // update top 12 outdated addresses
    db
      .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
      .selectAll()
      .where('last_update', '<', new Date(Date.now() - 1000 * 60))
      .orderBy(sql<string>`(confirmed + unconfirmed) desc`)
      .limit(12)
      .execute()
      .then((result) => Promise.all(result.map((row) => updateAmount(row.lock_address, row.ca, network))))
      .then(() =>
        // fetch top 10 addresses
        db
          .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
          .selectAll()
          .where((eb) => eb('confirmed', '<>', 0).or(eb('unconfirmed', '<>', 0)))
          .where('ca', '=', address)
          .orderBy(sql<string>`(confirmed + unconfirmed) desc`)
          .limit(10)
          .execute()
          .then((result) => new Response(JSON.stringify(result)))
      )
      .catch((e) => {
        console.error(e)
        return new Response(`Failed to update: ${e.message}`, { status: 500 })
      })
  )
}
