import Moralis from 'moralis'
import { EvmErc20TokenBalanceWithPrice } from '@moralisweb3/common-evm-utils'

if (!Moralis.Core.isStarted) Moralis.start({ apiKey: process.env.MORALIS_API_KEY || '' })

export async function getEthBalances(address: string): Promise<{
  tokens: EvmErc20TokenBalanceWithPrice[]
  type: string
} | null> {
  return Moralis.EvmApi.wallets
    .getWalletTokenBalancesPrice({ chain: '0x1', address, excludeUnverifiedContracts: true })
    .then((response) => {
      if (!response.result) throw new Error('No response from Moralis API')
      return { tokens: response.result, type: 'moralis' }
    })
}
