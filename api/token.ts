import { kv } from '@vercel/kv'
import { getJson } from '../lib/fetch.js'

export function GET(request: Request) {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })

  // Define cache key
  const metaCacheKey = `nc:token:${address}`

  return kv
    .get(metaCacheKey)
    .then((meta) => {
      if (meta) return { id: address, ...meta }

      // Fetch metadata if needed
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
            throw new Error(result.error.message)
          }
          if (result.result.id !== address) {
            throw new Error('Token ID mismatch')
          }
          const content = result.result.content
          const metadata = {
            id: address,
            uri: content.json_uri,
            image: content.links.image,
            ...content.metadata
          }
          return kv.set(metaCacheKey, metadata).then(() => metadata)
        })
    })
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => new Response(e.message, { status: 500 }))
}
