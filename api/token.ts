import { kv } from '@vercel/kv'
import { getJson } from '../lib/fetch.js'

export function GET(request: Request) {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })

  // Try to get from cache first
  const cacheKey = `nc:token:${address}`
  return kv
    .get(cacheKey)
    .then((cached: any) => {
      if (cached) return new Response(JSON.stringify(cached))
      return fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: address,
          method: 'getAsset',
          params: { id: address }
        })
      })
        .then(getJson)
        .then((result: any) => {
          if (result?.error) {
            return new Response(result.error.message, { status: 400 })
          }
          const content = result.result.content
          const meta = {
            uri: content.json_uri,
            image: content.links.image,
            ...content.metadata
          }
          // Cache the result
          return kv.set(cacheKey, meta).then(() => new Response(JSON.stringify(meta)))
        })
    })
    .catch((e) => new Response(e.message, { status: 500 }))
}
