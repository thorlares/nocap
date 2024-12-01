import * as ordinals from 'micro-ordinals'
import * as btc from '@scure/btc-signer'
import { btcNetwork } from '../../lib/network'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { toast, toastError, toastImportant, toastImportantError } from '../../src/components/toast'
import { walletState } from '../../src/lib/walletState'
import { getJson } from '../../lib/fetch'
import { Network } from '../../lib/types'

export function p2trInscribe(body: string, publicKey: Uint8Array, network?: Network) {
  const inscription = {
    tags: { contentType: 'text/plain;charset=utf-8' },
    body: utf8ToBytes(body)
  }
  const customScripts = [ordinals.OutOrdinalReveal]
  return btc.p2tr(
    undefined,
    ordinals.p2tr_ord_reveal(publicKey, [inscription]),
    btcNetwork(network),
    false,
    customScripts
  )
}

/** inscribe `body` to `receipt`(wallet address bydefault). */
export function inscribe(body: any, receipt?: string) {
  if (!(body instanceof String)) body = JSON.stringify(body)
  var { alert } = toastImportant(`Preparing inscribe <span style="white-space:pre-wrap">${body}</span>`)
  return Promise.all([walletState.getAddress(), walletState.getNetwork()])
    .then(([address, network]) => {
      var privateKey = new Uint8Array(32)
      crypto.getRandomValues(privateKey)
      const publicKey = btc.utils.pubSchnorr(privateKey)

      const p2tr = p2trInscribe(body, publicKey, network)
      var inscriptionFee = 0
      const amountInscription = 650
      const fetchFeeRates =
        network == 'devnet'
          ? Promise.resolve({ minimumFee: 1, economyFee: 1, hourFee: 1 })
          : fetch(walletState.mempoolApiUrl('/api/v1/fees/recommended'))
              .then(getJson)
              .catch((e) => {
                toastError(e, 'Failed to get recommanded fees from mempool')
                throw e
              })
      return fetchFeeRates
        .then((feeRates) => {
          console.debug('feeRates', feeRates)
          inscriptionFee = Math.max(171 * feeRates.minimumFee, 86 * (feeRates.hourFee + feeRates.economyFee))
        })
        .then(() => {
          alert.hide()
          alert = toastImportant(`Sending BTC to inscribe <span style="white-space:pre-wrap">${body}</span>`).alert
          return walletState.connector!.sendBitcoin(p2tr.address!, amountInscription + inscriptionFee)
        })
        .then(async (txid) => {
          toast(`Inscribe transaction sent, txid: ${txid}`)
          alert.hide()
          alert = toastImportant(`Waiting for inscription to be announced in mempool<sl-spinner></sl-spinner>`).alert
          await new Promise((r) => setTimeout(r, 1000))
          while (true) {
            const res = await fetch(`https://mempool.space/testnet/api/tx/${txid}`)
            if (res.status == 200) break
            await new Promise((r) => setTimeout(r, 3000))
          }
          return txid
        })
        .then((txid) => {
          alert.hide()
          alert = toastImportant(`Revealing <span style="white-space:pre-wrap">${body}</span>`).alert
          const tx = new btc.Transaction({ customScripts: [ordinals.OutOrdinalReveal] })
          tx.addInput({
            ...p2tr,
            txid,
            index: 0,
            witnessUtxo: { script: p2tr.script, amount: BigInt(amountInscription + inscriptionFee) }
          })
          tx.addOutputAddress(receipt ?? address, BigInt(amountInscription), btcNetwork(network))
          tx.sign(privateKey)
          tx.finalize()
          return walletState.connector!.pushPsbt(bytesToHex(tx.toPSBT()))
        })
        .then((txid) => {
          alert.hide()
          toast(`Inscription finished, txid: ${txid}`)
          return txid
        })
    })
    .catch((e) => {
      alert.hide()
      toastImportantError(e, 'Failed to inscribe')
      throw e
    })
}
