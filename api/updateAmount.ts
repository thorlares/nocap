import { kv } from '@vercel/kv'
import { getLockAddress } from '../lib/lockAddress.js'
import { mempoolApiUrl } from '../lib/utils.js'
import { getJson } from '../lib/fetch.js'

export function POST(request: Request) {
  return request
    .json()
    .then((params) => {
      const { publicKey, mpcPubKey, blocks, ca, network } = params
      const lockAddress = getLockAddress(publicKey, mpcPubKey, ca, blocks, network)
      return fetch(mempoolApiUrl(`/api/address/${lockAddress}`, network))
        .then(getJson)
        .then((result) => {
          const confirmed = result.chain_stats.funded_txo_sum - result.chain_stats.spent_txo_sum
          const unconfirmed = result.mempool_stats.funded_txo_sum - result.mempool_stats.spent_txo_sum
          return (
            kv
              .multi()
              // update cache that stores confirmed amount by coin address and lock address, sorted by amount
              .zadd(network == 'livenet' ? `nc:ca:${ca}:confirmed` : `nc:ca:${ca}:confirmed:testnet`, {
                score: confirmed,
                member: lockAddress
              })
              // update cache that stores unconfirmed amount by coin address and lock address
              .zadd(network == 'livenet' ? `nc:ca:${ca}:unconfirmed` : `nc:ca:${ca}:unconfirmed:testnet`, {
                score: unconfirmed,
                member: lockAddress
              })
              .exec()
          )
        })
    })
    .then(() => new Response())
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
