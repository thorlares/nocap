import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'
import { sql } from 'kysely'
import { mempoolApiUrl } from '../lib/utils.js'
import { Network } from '../lib/types.js'
import { getJson } from '../lib/fetch.js'

export function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured', 'DATABASE_URL', process.env.DATABASE_URL)
    return new Response('Server is not properly configured', { status: 500 })
  }

  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })
  const network = (url.searchParams.get('network') ?? 'livenet') as Network

  const db = createKysely<DB>({ connectionString: process.env.DATABASE_URL })
  return (
    // update top 20 addresses with unconfirmed utxo
    db
      .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
      .selectAll()
      .where('unconfirmed', '>', 0)
      // @todo fix this
      // .where('last_update', '<', new Date(Date.now() - 1000 * 60))
      .orderBy('unconfirmed', 'desc')
      .limit(20)
      .execute()
      .then((result) =>
        Promise.all(
          result.map((row) =>
            fetch(mempoolApiUrl(`/api/address/${row.lock_address}`, network))
              .then(getJson)
              .then((result) => {
                const confirmed = result.chain_stats.funded_txo_sum - result.chain_stats.spent_txo_sum
                const unconfirmed = result.mempool_stats.funded_txo_sum - result.mempool_stats.spent_txo_sum

                return createKysely<DB>({ connectionString: process.env.DATABASE_URL })
                  .updateTable(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
                  .set({ confirmed, unconfirmed, last_update: new Date() })
                  .where('ca', '=', row.ca)
                  .where('lock_address', '=', row.lock_address)
                  .execute()
              })
          )
        )
      )
      .then(() =>
        // fetch top 10 addresses
        db
          .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
          .selectAll()
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
