import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import '@shoelace-style/shoelace/dist/components/input/input'
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js'
import { consume } from '@lit/context'
import { customElement, property, state } from 'lit/decorators.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import { LitElement, html, unsafeCSS } from 'lit'
import { mpcPubKey, publicKey } from '../lib/contexts'
import { Ref, createRef, ref } from 'lit/directives/ref.js'
import { scriptLock } from '../../lib/scripts'
import { until } from 'lit/directives/until.js'
import { when } from 'lit/directives/when.js'
import * as btc from '@scure/btc-signer'
import style from '/src/base.css?inline'
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import { walletState } from '../lib/walletState'
import { btcNetwork } from '../../lib/network'
import { toXOnlyU8 } from '../../lib/utils'

@customElement('meme-dialog')
export class MemeDialog extends LitElement {
  static styles = [unsafeCSS(style)]
  @property({ type: Object }) meme: any = null
  private dialog: Ref<SlDialog> = createRef()
  @consume({ context: publicKey, subscribe: true })
  @state()
  readonly publicKey?: string
  @consume({ context: mpcPubKey, subscribe: true })
  @state()
  readonly mpcPubKey?: string

  show() {
    this.dialog.value?.show()
  }

  hide() {
    this.dialog.value?.hide()
  }

  get lockAddress() {
    if (!this.mpcPubKey || !this.publicKey) return 'loading'
    return btc.p2wsh(
      {
        type: 'wsh',
        script: scriptLock(hexToBytes(this.mpcPubKey), hexToBytes(this.publicKey), this.meme.id)
      },
      btcNetwork(walletState.network)
    ).address
  }

  get inscribeP2TR() {
    if (!this.mpcPubKey || !this.publicKey) return undefined
    return btc.p2tr(
      undefined,
      {
        script: btc.Script.encode([
          toXOnlyU8(hexToBytes(this.publicKey)),
          'CHECKSIG',
          'OP_0',
          'IF',
          utf8ToBytes('ord'),
          hexToBytes('01'),
          utf8ToBytes('text/plain;charset=utf-8'),
          'OP_0',
          utf8ToBytes(`${this.publicKey}|${this.mpcPubKey}|10|${this.meme.id}`),
          'ENDIF'
        ])
      },
      btcNetwork(walletState.network),
      true
    )
  }

  render() {
    return html`
      <sl-dialog label="Meme Details" class="dialog-overview" ${ref(this.dialog)}>
        ${when(
          this.meme,
          () => html`
            <p slot="label">${this.meme.name}</p>
            <div class="max-h-[300px] overflow-hidden h-fit p-2 flex gap-2 w-full text-gray-400">
              <div class="min-w-32 relative self-start">
                ${until(
                  this.meme.meta.then(
                    (meta: any) =>
                      html`<img width="128" height="128" src="${meta.image}" alt="Meme" class="rounded-lg" />`
                  ),
                  html`<sl-spinner></sl-spinner>`
                )}
              </div>
              <div class="gap-2 grid h-fit">
                <p class="text-sm w-full" style="overflow-wrap: break-word; word-break: break-all;">
                  <span class="font-bold"> Ticker: ${this.meme.symbol} </span>
                </p>
                <div class="text-xs text-blue-200 flex flex-wrap items-center gap-1">
                  <div class="flex items-center gap-1"><label for="copy-ca text-xs">ca:</label></div>
                  <span class="w-full md:w-auto">${this.meme.id}</span>
                </div>
                <p class="text-sm w-full" style="overflow-wrap: break-word; word-break: break-all;">
                  ${until(
                    this.meme.meta.then((result: any) => result.description),
                    html`<sl-spinner></sl-spinner>`
                  )}
                </p>
              </div>
            </div>
            <form
              class="w-full flex flex-col gap-2"
              @submit=${(e: Event) => {
                e.preventDefault()
                const data = new FormData(e.target as HTMLFormElement)
                const amount = Number(data.get('amount'))
                const address = this.lockAddress
                if (!address) throw new Error('lock address not ready')
                const p2tr = this.inscribeP2TR
                if (!p2tr) throw new Error('p2tr not ready')
                walletState
                  .connector!.sendBitcoin(p2tr.address!, 20000)
                  .then((txid) => {
                    const tx = new btc.Transaction()
                    tx.addInput({
                      ...p2tr,
                      txid,
                      index: 0,
                      witnessUtxo: { script: p2tr.script, amount: BigInt(20000) }
                    })
                    tx.addOutputAddress(walletState.address!, BigInt(1000), btcNetwork(walletState.network))
                    return walletState
                      .connector!.signPsbt(bytesToHex(tx.toPSBT()), {
                        toSignInputs: [{ index: 0, publicKey: this.publicKey, disableTweakSigner: true }]
                      })
                      .then((psbt) => walletState.connector!.pushPsbt(psbt))
                      .then(console.log)
                  })
                  .then(() => walletState.connector!.sendBitcoin(address, amount * 1e8))
              }}
            >
              <sl-input
                name="amount"
                label="Support with"
                class="w-full"
                placeholder="Enter an amount of bitcoin"
                ?disabled=${!this.publicKey}
              ></sl-input>
              ${when(
                this.publicKey,
                () =>
                  html`
                    <button type="submit" class="w-full p-2 bg-blue-500 text-white hover:bg-blue-700">Lock</button>
                  `,
                () => html`<connect-button variant="primary" class="w-full"></connect-button>`
              )}
            </form>

            <p class="text-sm mt-4 text-sl-neutral-600">
              Self-Custody Address:
              <span class="font-mono break-words text-[var(--sl-color-neutral-700)]">${this.lockAddress}</span>
            </p>
            <p class="text-sm text-sl-neutral-600">
              Self-Custody Script: <a class="text-green-600 underline hover:no-underline cursor-pointer">verify</a>
            </p>
            <pre
              class="mt-2 p-1 px-2 w-full overflow-x-scroll text-xs text-[var(--sl-color-neutral-700)] border rounded"
              style="border-color:var(--sl-color-neutral-200)"
            >
OP_DEPTH
OP_1SUB
# Check if more than one signature
OP_IF
  # Unlock with MPC, check MPC signature with MPC public key
  ${this.mpcPubKey}
  OP_CHECKSIGVERIFY
OP_ELSE
  # Unlock without MPC, check if after designated blocks
  # Here is the number of blocks to check
  10
  # Fail if not after designated blocks
  OP_CHECKSEQUENCEVERIFY
  OP_DROP
OP_ENDIF

# Each case, a signature verified with your own public key is examined
${this.publicKey}
OP_CHECKSIG

# The following IF is always false, only for embedding coin address
OP_FALSE
OP_IF
# Coin address
${this.meme.id}
OP_ENDIF
</pre>

            <div slot="footer" class="flex justify-end gap-2">
              <sl-button @click=${this.hide}>Close</sl-button>
              <sl-button
                variant="success"
                @click=${() => window.open(`https://pump.fun/coin/${this.meme.id}`, '_blank')}
              >
                View on Pump.fun
              </sl-button>
              <sl-button
                variant="success"
                @click=${() => window.open(`https://solscan.io/token/${this.meme.id}`, '_blank')}
              >
                View on Solscan
              </sl-button>
            </div>
          `
        )}
      </sl-dialog>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'meme-dialog': MemeDialog
  }
}
