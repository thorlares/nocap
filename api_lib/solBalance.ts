import Moralis from 'moralis'
import { SolAddress, SolNative } from '@moralisweb3/common-sol-utils'

if (!Moralis.Core.isStarted) Moralis.start({ apiKey: process.env.MORALIS_API_KEY || '' })

export async function getSolBalances(address: string): Promise<{
  nativeBalance: SolNative
  tokens: Array<{
    associatedTokenAddress: SolAddress
    mint: SolAddress
    amount: SolNative
    name: string
    symbol: string
  }>
  type: string
} | null> {
  return Moralis.SolApi.account.getPortfolio({ network: 'mainnet', address }).then((response) => {
    if (!response.result) throw new Error('No response from Moralis API')
    return { ...response.result, type: 'moralis' }
  })
}
