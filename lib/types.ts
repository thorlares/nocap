export type Balance = {
  confirmed: number
  unconfirmed: number
  total: number
}

export type Brc20Balance = {
  ticker: string
  decimals: number
  availableBalance: string
  transferableBalance: string
  overallBalance: string
}

export const Networks = ['testnet', 'livenet', 'signet', 'devnet', 'testnet4'] as const
export type Network = (typeof Networks)[number]
