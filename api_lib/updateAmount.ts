import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'
import { mempoolApiUrl } from '../lib/utils.js'
import { getJson } from '../lib/fetch.js'
import { Network } from '../lib/types.js'

export function updateAmount(address: string, ca: string, network: Network) {
  return fetch(mempoolApiUrl(`/api/address/${address}`, network))
    .then(getJson)
    .then((result) => {
      const confirmed = result.chain_stats.funded_txo_sum - result.chain_stats.spent_txo_sum
      const unconfirmed = result.mempool_stats.funded_txo_sum - result.mempool_stats.spent_txo_sum

      return createKysely<DB>({ connectionString: process.env.DATABASE_URL })
        .updateTable(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
        .set({ confirmed, unconfirmed, last_update: new Date() })
        .where('ca', '=', ca)
        .where('lock_address', '=', address)
        .execute()
    })
}
