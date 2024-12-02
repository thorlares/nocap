import { walletState } from './walletState'

export async function waitForTx(txid: string) {
  await new Promise((r) => setTimeout(r, 1000))
  while (true) {
    const res = await fetch(walletState.mempoolApiUrl(`/api/tx/${txid}`))
    if (res.status == 200) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  return txid
}
