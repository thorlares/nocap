import { getLockCaAddress } from '../lib/lockAddress.js'
import { mempoolApiUrl } from '../lib/utils.js'
import { getJson } from '../lib/fetch.js'
import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'

export function POST(request: Request) {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not configured', 'POSTGRES_URL', process.env.POSTGRES_URL)
    return new Response('Server is not properly configured', { status: 500 })
  }
  return request
    .json()
    .then((params) => {
      const { publicKey, blocks, ca, network } = params
      const lockAddress = getLockCaAddress(publicKey, ca, blocks, network)
      return fetch(mempoolApiUrl(`/api/address/${lockAddress}`, network))
        .then(getJson)
        .then((result) => {
          const confirmed = result.chain_stats.funded_txo_sum - result.chain_stats.spent_txo_sum
          const unconfirmed = result.mempool_stats.funded_txo_sum - result.mempool_stats.spent_txo_sum

          return createKysely<DB>({ connectionString: process.env.POSTGRES_URL })
            .insertInto(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
            .values({
              ca,
              lock_address: lockAddress,
              confirmed,
              unconfirmed,
              last_update: new Date()
            })
            .onConflict((oc) => oc.column('ca').column('lock_address').doUpdateSet({ confirmed, unconfirmed }))
            .execute()
        })
    })
    .then(() => new Response())
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
