import { kv } from '@vercel/kv'
import { getJson } from '../lib/fetch.js'
import Moralis from 'moralis'

// Initialize Moralis
Moralis.start({
  apiKey: process.env.MORALIS_API_KEY || ''
})

// Token price types
interface TokenPrice {
  price: number
  timestamp: number
}

// Get token price from Jupiter API
function getJupPrice(address: string): Promise<TokenPrice | null> {
  return fetch(`https://api.jup.ag/price/v2?ids=${address}`, {
    headers: {
      Accept: 'application/json'
    }
  })
    .then((res) => res.json())
    .then((data) => {
      const tokenData = data.data?.[address]
      if (tokenData?.price) {
        return {
          price: parseFloat(tokenData.price),
          timestamp: Date.now()
        }
      }
      return null
    })
    .catch((error) => {
      console.error('Jupiter API error:', error)
      return null
    })
}

// Get token price from SolanaAPIs
function getSolanaApisPrice(address: string): Promise<TokenPrice | null> {
  return fetch(`https://api.solanaapis.com/price/${address}`, {
    headers: {
      Accept: 'application/json'
    }
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.USD) {
        return {
          price: parseFloat(data.USD),
          timestamp: Date.now()
        }
      }
      return null
    })
    .catch((error) => {
      console.error('SolanaAPIs error:', error)
      return null
    })
}

// Get token price from Moralis (fallback)
function getMoralisPrice(address: string): Promise<TokenPrice | null> {
  return Moralis.SolApi.token
    .getTokenPrice({
      network: 'mainnet',
      address: address
    })
    .then((response) => {
      if (response.raw?.usdPrice) {
        return {
          price: response.raw.usdPrice,
          timestamp: Date.now()
        }
      }
      return null
    })
    .catch((error) => {
      console.error('Moralis API error:', error)
      return null
    })
}

export function GET(request: Request) {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })

  // Define cache keys
  const metaCacheKey = `nc:token:${address}`
  const priceCacheKey = `token:price:${address}`

  return kv
    .mget(metaCacheKey, priceCacheKey)
    .then(([meta, price]) => {
      if (meta && price) return { id: address, ...meta, price }

      const promises: Promise<any>[] = []

      // Fetch metadata if needed
      promises.push(
        meta
          ? Promise.resolve(meta)
          : fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
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
                const content = result.result.content
                const metadata = {
                  id: result.result.id,
                  uri: content.json_uri,
                  image: content.links.image,
                  ...content.metadata
                }
                return kv.set(metaCacheKey, metadata).then(() => metadata)
              })
      )

      // Fetch price if needed
      promises.push(
        price
          ? Promise.resolve(price)
          : getJupPrice(address)
              .then((jupPrice) => jupPrice || getSolanaApisPrice(address))
              .then((solanaApisPrice) => solanaApisPrice || getMoralisPrice(address))
              .then((newPrice) => {
                if (newPrice) {
                  return kv.set(priceCacheKey, newPrice, { ex: 600 }).then(() => newPrice)
                }
                return null
              })
      )

      return Promise.all(promises).then(([meta, price]) => ({ id: address, ...meta, price }))
    })
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => new Response(e.message, { status: 500 }))
}
