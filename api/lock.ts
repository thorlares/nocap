import { kv } from '@vercel/kv'
import { getJson } from '../lib/fetch.js'

export function POST(request: Request) {
  request
    .json()
    .then(({ address, publicKey, mpcPubKey, blocks, ca }) =>
      kv
        .multi()
        .sadd(`nc:lock:${address}:ca:${ca}`, `${publicKey}|${mpcPubKey}|${blocks}|${ca}`)
        .sadd(`nc:ca:${ca}:lockers`, `${address}`)
        .exec()
    )
    .then(() => {
      return new Response('update requested')
    })
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
