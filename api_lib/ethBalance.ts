import { kv } from '@vercel/kv'
import Moralis from 'moralis'

Moralis.start({ apiKey: process.env.MORALIS_API_KEY || '' })

async function getMoralisPrice(address: string) {
  return Moralis.EvmApi.wallets
    .getWalletTokenBalancesPrice({ chain: '0x1', address, excludeUnverifiedContracts: true })
    .then((response) => {
      if (response.result) {
        return {
          id: address,
          balance: response.result,
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

export async function getEthBalances(address: string) {
  const balanceCacheKey = `nc:eth:balance:${address}`

  const price = await kv.get(balanceCacheKey)
  if (price) return price

  const newPrice = await getMoralisPrice(address)
  await kv.set(balanceCacheKey, newPrice, { ex: 600 })
  return newPrice
}
