import { kv } from '@vercel/kv'
import { getLockCaAddress } from '../lib/lockAddress.js'

export function POST(request: Request) {
  return request
    .json()
    .then((params) => {
      const { address, publicKey, blocks, ca, network } = params
      const lockAddress = getLockCaAddress(publicKey, ca, blocks, network)
      return (
        kv
          .multi()
          // store params for a lock address
          .hsetnx(`nc:lock:addresses`, lockAddress, { version: 1, ...params })
          // store addresses that locks for a coin
          .sadd(network == 'livenet' ? `nc:ca:${ca}:lockers` : `nc:ca:${ca}:lockers:testnet`, `${address}`)
          // store coins that an address locks
          .sadd(`nc:address:${address}:ca:${ca}:locks`, lockAddress)
          .exec()
      )
    })
    .then(() => new Response())
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
