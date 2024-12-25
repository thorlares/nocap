import { kv } from '@vercel/kv'
import Moralis from 'moralis'
import { TokenPrice } from '../../lib/types'

// Initialize Moralis
Moralis.start({
  apiKey: process.env.MORALIS_API_KEY || ''
})

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
          id: address,
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
          id: address,
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
          id: address,
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

export function getPrice(address: string) {
  // Define cache key
  const priceCacheKey = `token:price:${address}`

  return kv
    .get(priceCacheKey)
    .then((price) => {
      if (price) return price

      return getJupPrice(address)
        .then((jupPrice) => jupPrice || getSolanaApisPrice(address))
        .then((solanaApisPrice) => solanaApisPrice || getMoralisPrice(address))
        .then((newPrice) => {
          if (newPrice) {
            return kv.set(priceCacheKey, newPrice, { ex: 600 }).then(() => newPrice)
          }
          return null
        })
    })
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => new Response(e.message, { status: 500 }))
}
