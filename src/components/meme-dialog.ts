import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import '@shoelace-style/shoelace/dist/components/divider/divider.js'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import '@shoelace-style/shoelace/dist/components/input/input.js'
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js'
import { consume } from '@lit/context'
import { customElement, property, state } from 'lit/decorators.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import { LitElement, html, unsafeCSS } from 'lit'
import { mpcPubKey, walletContext } from '../lib/contexts'
import { createRef, ref } from 'lit/directives/ref.js'
import { when } from 'lit/directives/when.js'
import * as btc from '@scure/btc-signer'
import style from '/src/base.css?inline'
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import { walletState } from '../lib/walletState'
import { btcNetwork } from '../../lib/network'
import { toXOnlyU8 } from '../../lib/utils'
import { ensureSuccess, getJson } from '../../lib/fetch'
import { toast, toastImportant } from './toast'
import { getLockAddress } from '../../lib/lockAddress'

@customElement('meme-dialog')
export class MemeDialog extends LitElement {
  static styles = [unsafeCSS(style)]
  @property({ type: String }) ca?: string
  @state() meta: any
  @state() step = 0
  @state() stepClosable = false
  @state() stepError?: Error
  @state() lockingBlocks = 10

  private dialog = createRef<SlDialog>()
  private dialogStep = createRef<SlDialog>()

  @consume({ context: walletContext.publicKey, subscribe: true })
  @state()
  readonly publicKey?: string
  @consume({ context: mpcPubKey, subscribe: true })
  @state()
  readonly mpcPubKey?: string
  @consume({ context: walletContext.address, subscribe: true })
  @state()
  readonly address?: string

  show() {
    if (!this.publicKey) walletState.getPublicKey()
    fetch(`/api/token?address=${this.ca}`)
      .then(getJson)
      .then((meta) => (this.meta = meta))
      .catch(toastImportant)
    this.dialog.value?.show()
  }

  hide() {
    this.dialog.value?.hide()
  }

  get getLockAddress() {
    if (!this.mpcPubKey || !this.publicKey) return 'loading'
    return getLockAddress(this.mpcPubKey, this.publicKey, this.ca!, this.lockingBlocks, walletState.network)
  }

  get p2trInscription() {
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
          utf8ToBytes(`${this.publicKey}|${this.mpcPubKey}|${this.lockingBlocks}|${this.ca}`),
          'ENDIF'
        ])
      },
      btcNetwork(walletState.network),
      true
    )
  }

  render() {
    return html`
      <sl-dialog label="Fetching Coin Details" ${ref(this.dialog)}>
        ${when(
          this.meta,
          () => html`
            <p slot="label">${this.meta.name}</p>
            <div class="max-h-[300px] overflow-hidden h-fit p-2 flex gap-2 w-full text-gray-400">
              <div class="min-w-32 relative self-start">
                <img width="128" height="128" src="${this.meta.image}" alt="Meme" class="rounded-lg" />
              </div>
              <div class="gap-2 grid h-fit">
                <p class="text-sm w-full" style="overflow-wrap: break-word; word-break: break-all;">
                  <span class="font-bold"> Ticker: ${this.meta.symbol} </span>
                </p>
                <div class="text-xs text-blue-200 flex flex-wrap items-center gap-1">
                  <div class="flex items-center gap-1"><label for="copy-ca text-xs">ca:</label></div>
                  <span class="w-full md:w-auto">${this.ca}</span>
                </div>
                <p class="text-sm w-full" style="overflow-wrap: break-word; word-break: break-all;">
                  ${this.meta.description}
                </p>
                <div class="text-xs text-green-400">
                  <a target="_blank" href="https://pump.fun/coin/${this.ca}" class="underline hover:no-underline"
                    >pump.fun</a
                  >
                  <a target="_blank" href="https://solscan.io/token/${this.ca}" class="underline hover:no-underline"
                    >solscan</a
                  >
                </div>
              </div>
            </div>
            <form
              class="w-full flex flex-col gap-2"
              @submit=${(e: Event) => {
                e.preventDefault()
                const data = new FormData(e.target as HTMLFormElement)
                const amount = Number(data.get('amount'))
                this.lockBTC(amount)
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

            ${when(
              this.publicKey,
              () => html`
                <p class="text-sm mt-4 text-sl-neutral-600">
                  Self-Custody Address:
                  <span class="font-mono break-words text-[var(--sl-color-neutral-700)]">${this.getLockAddress}</span>
                </p>
                <p class="text-sm text-sl-neutral-600">
                  Self-Custody Script:
                  <!-- <a class="text-green-600 underline hover:no-underline cursor-pointer">verify</a> -->
                </p>
                <pre
                  class="mt-2 p-1 px-2 w-full overflow-x-scroll text-xs text-[var(--sl-color-neutral-700)] border rounded border-[var(--sl-color-neutral-200)]"
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
  ${this.lockingBlocks}
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
${this.ca}
OP_ENDIF
</pre>
              `
            )}
          `,
          () => html`
            <div class="animate-pulse flex space-x-4">
              <div class="rounded-full bg-slate-600 h-10 w-10"></div>
              <div class="flex-1 space-y-6 py-1">
                <div class="h-2 bg-slate-600 rounded"></div>
                <div class="space-y-3">
                  <div class="grid grid-cols-3 gap-4">
                    <div class="h-2 bg-slate-600 rounded col-span-2"></div>
                    <div class="h-2 bg-slate-600 rounded col-span-1"></div>
                  </div>
                  <div class="h-2 bg-slate-600 rounded"></div>
                </div>
              </div>
            </div>
          `
        )}
      </sl-dialog>
      <sl-dialog
        no-header
        class="[&::part(body)]:p-0 [&::part(overlay)]:bg-[rgba(0,0,0,0.8)]"
        ${ref(this.dialogStep)}
        @sl-request-close=${(event: CustomEvent) => {
          if (event.detail.source === 'overlay') event.preventDefault()
        }}
      >
        <sl-alert
          ?closable=${this.stepClosable}
          open
          class="[&::part(close-button)]:items-start [&::part(close-button)]:mt-3"
          @sl-hide=${() => this.dialogStep.value?.hide()}
        >
          ${when(
            this.stepError,
            () =>
              html`
                <div class="flex gap-2">
                  <sl-icon
                    name="exclamation-circle"
                    class="flex-none mt-0.5 text-rose-500"
                    style="font-size: 1.1rem;"
                  ></sl-icon>
                  <p class="text-[var(--sl-color-neutral-800)]">${this.stepError?.message}</p>
                </div>
              `,
            () => html`<p>3 Steps to go</p>`
          )}
          <sl-divider></sl-divider>
          <div class="flex gap-2 ${when(this.step != 1, () => 'text-neutral-500')}">
            <sl-icon
              name="1-circle"
              class="flex-none mt-1 ${when(this.step == 1, () => 'animate-pulse text-sky-500')}"
              style="font-size: 1.1qrem;"
            ></sl-icon>
            <div class="flex-1">
              <p>
                Creating an inscription to store information in locking script. Data stored:
                <span class="font-mono break-all text-xs bg-[var(--sl-color-neutral-200)]">
                  ${this.publicKey}&lt;YourPublicKey&gt;|${this.mpcPubKey}&lt;MPCPublicKey&gt;|${this
                    .lockingBlocks}&lt;Blocks&gt;|${this.ca}&lt;CoinAddress&gt;</span
                >
              </p>
            </div>
          </div>
          <sl-divider></sl-divider>
          <div class="flex gap-2 ${when(this.step != 2, () => 'text-neutral-500')}">
            <sl-icon
              name="2-circle"
              class="flex-none mt-1 ${when(this.step == 2, () => 'animate-pulse text-sky-500')}"
              style="font-size: 1.1qrem;"
            ></sl-icon>
            <div class="flex-1">
              <p class="break-all">
                Revealing the inscription to your address:
                <span class="font-mono text-xs bg-[var(--sl-color-neutral-200)]">${this.address}</span>
              </p>
            </div>
          </div>
          <sl-divider></sl-divider>
          <div class="flex gap-2 ${when(this.step != 3, () => 'text-neutral-500')}">
            <sl-icon
              name="3-circle"
              class="flex-none mt-1 ${when(this.step == 3, () => 'animate-pulse text-sky-500')}"
              style="font-size: 1.1qrem;"
            ></sl-icon>
            <div class="flex-1">
              <p class="break-all">
                Locking bitcoin to self-custody address:
                <span class="font-mono text-xs bg-[var(--sl-color-neutral-200)]">${this.getLockAddress}</span>
              </p>
            </div>
          </div>
        </sl-alert>
      </sl-dialog>
    `
  }

  private lockBTC(amount: number) {
    const lockAddress = this.getLockAddress
    const p2tr = this.p2trInscription
    try {
      if (!amount) throw new Error('amount is required')
      if (!lockAddress) throw new Error('lock address not ready')
      if (!p2tr) throw new Error('p2tr not ready')
    } catch (e) {
      toast(e)
      return
    }
    this.step = 1
    this.stepClosable = false
    this.dialogStep.value?.show()

    var inscriptionFee = 0
    const amountInscription = 650
    walletState
      .updateNetwork()
      .then((network) =>
        Promise.all([
          network == 'devnet'
            ? Promise.resolve({ minimumFee: 1, economyFee: 1, hourFee: 1 })
            : fetch(walletState.mempoolApiUrl('/api/v1/fees/recommended')).then(getJson),
          fetch('/api/lock', {
            method: 'POST',
            body: JSON.stringify({
              address: this.address,
              publicKey: this.publicKey,
              mpcPubKey: this.mpcPubKey,
              blocks: this.lockingBlocks,
              ca: this.ca,
              network
            })
          }).then(ensureSuccess)
        ])
      )
      // calculate inscription fee
      .then(([feeRates]) => {
        inscriptionFee = Math.max(171 * feeRates.minimumFee, 86 * (feeRates.hourFee + feeRates.economyFee))
      })
      // create inscription, TBD: check if the inscription is already created
      .then(() => walletState.connector!.sendBitcoin(p2tr.address!, amountInscription + inscriptionFee))
      // reveal inscription
      .then((txid) => {
        console.log('inscribe transaction:', txid)
        this.step = 2
        const tx = new btc.Transaction()
        tx.addInput({
          ...p2tr,
          txid,
          index: 0,
          witnessUtxo: { script: p2tr.script, amount: BigInt(amountInscription + inscriptionFee) }
        })
        tx.addOutputAddress(walletState.address!, BigInt(amountInscription), btcNetwork(walletState.network))
        return walletState
          .connector!.signPsbt(bytesToHex(tx.toPSBT()), {
            toSignInputs: [{ index: 0, publicKey: this.publicKey, disableTweakSigner: true }]
          })
          .then((psbt) => walletState.connector!.pushPsbt(psbt))
      })
      // lock bitcoin
      .then((txid) => {
        this.step = 3
        console.log('reveal transaction:', txid)
        return walletState.connector!.sendBitcoin(lockAddress, amount * 1e8)
      })
      .then((txid) => {
        console.log('lock transaction:', txid)
        fetch('/api/updateAmount', {
          method: 'POST',
          body: JSON.stringify({
            address: this.address,
            publicKey: this.publicKey,
            mpcPubKey: this.mpcPubKey,
            blocks: this.lockingBlocks,
            ca: this.ca,
            network: walletState.network
          })
        })
          .then(ensureSuccess)
          .catch(console.warn)
        toastImportant(`Successfully locked ${amount} BTC to <span class="font-mono break-all">${lockAddress}</span>`)
        this.dialogStep.value?.hide()
      })
      .catch((e) => {
        this.stepError = e
        this.stepClosable = true
      })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'meme-dialog': MemeDialog
  }
}
