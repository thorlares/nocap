import * as ordinals from 'micro-ordinals'
import * as btc from '@scure/btc-signer'
import { btcNetwork } from '../../lib/network'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { toast, toastImportant, toastImportantError } from '../../src/components/toast'
import { walletState } from '../../src/lib/walletState'
import { Network } from '../../lib/types'
import { waitForTx } from './waitForTx'

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

/**
 * Inscribe `body` to `receipt`(wallet address by default) with `amount`(default to 650 sats).
 * @returns txid of inscription
 */
export function inscribe(body: any, receipt?: string, amount?: number): Promise<string> {
  if (!(body instanceof String)) body = JSON.stringify(body)
  var { alert } = toastImportant(`Preparing inscribe <pre>${body}</pre>`)
  return Promise.all([walletState.getAddress(), walletState.getNetwork()])
    .then(([address, network]) => {
      var privateKey = new Uint8Array(32)
      crypto.getRandomValues(privateKey)
      const publicKey = btc.utils.pubSchnorr(privateKey)

      const p2tr = p2trInscribe(body, publicKey, network)
      var inscriptionFee = 0
      const amountInscription = amount || 650
      return walletState.feeRates
        .then((feeRates) => {
          console.debug('feeRates', feeRates)
          inscriptionFee = 171 * Math.max(feeRates.minimumFee, feeRates.halfHourFee)
          alert.hide()
          alert = toastImportant(`Sending BTC to inscribe <pre>${body}</pre>`).alert
          return walletState.connector!.sendBitcoin(p2tr.address!, amountInscription + inscriptionFee, {
            feeRate: feeRates.halfHourFee
          })
        })
        .then((txid) => {
          toast(`Inscribe transaction sent, txid: ${txid}`)
          alert.hide()
          alert = toastImportant(
            `Waiting for inscribe transaction to be announced in mempool<sl-spinner></sl-spinner>`
          ).alert
          return waitForTx(txid)
        })
        .then((txid) => {
          alert.hide()
          alert = toastImportant(`Revealing <pre>${body}</pre>`).alert
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
          // TBD: post to mempool to speedup
          // fetch(walletState.mempoolApiUrl('/api/tx'), { method: 'POST', body: bytesToHex(tx.extract()) })
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
