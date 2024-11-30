import { customElement, state } from 'lit/decorators.js'
import { LitElement, html, unsafeCSS } from 'lit'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/themes/dark.css'
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'
import '/src/global.css'
import baseStyle from '/src/base.css?inline'
import '@shoelace-style/shoelace/dist/components/tab/tab.js'
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js'
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js'
import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/divider/divider.js'
import '@shoelace-style/shoelace/dist/components/input/input.js'
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js'
import '../../src/components/connect.ts'
import { toast, toastError, toastImportant } from '../../src/components/toast'
import { consume, ContextConsumer } from '@lit/context'
import { walletContext, walletState } from '../../src/lib/walletState'
import { getJson } from '../../lib/fetch.js'
import * as ordinals from 'micro-ordinals'
import * as btc from '@scure/btc-signer'
import { btcNetwork } from '../../lib/network.js'
import { toXOnlyU8 } from '../../lib/utils.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import { map } from 'lit/directives/map.js'
import { Brc20Balance } from '../../lib/types.js'
import { when } from 'lit/directives/when.js'
import SlButton from '@shoelace-style/shoelace/dist/components/button/button.js'
import { createRef, ref } from 'lit/directives/ref.js'
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js'

setBasePath(import.meta.env.MODE === 'development' ? '../node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('brc20-main')
export class AppMain extends LitElement {
  static styles = [unsafeCSS(baseStyle)]
  @consume({ context: walletContext.address, subscribe: true })
  @state()
  address?: string

  @state()
  balances?: Brc20Balance[]

  private contextConsumers: any[] = []
  private inputTick = createRef<SlInput>()

  connectedCallback(): void {
    super.connectedCallback()
    this.contextConsumers.push(
      ...[walletContext.address].map(
        (context) =>
          new ContextConsumer(this, {
            context,
            callback: (v) => (v ? this.updateBalances() : (this.balances = undefined)),
            subscribe: true
          })
      )
    )
  }

  private updateBalances() {
    if (!this.address) throw new Error('Wallet not connected')
    return fetch(`/api/brc20Balance?address=${this.address}`)
      .then(getJson)
      .then((data) => {
        console.debug('BRC20 Balance from server:', data)
        this.balances = data?.data?.detail
      })
      .catch((err) => {
        console.error(err)
        toastError(err, 'Failed to check balance')
      })
  }

  render() {
    return html`
      <nav class="flex flex-wrap justify-between w-full p-2 items-center">
        <div class="flex flex-col gap-0.4 items-end md:order-last">
          <connect-button></connect-button>
        </div>
        <div></div>
      </nav>
      <main class="flex flex-col gap-10 justify-center h-[calc(100vh-8rem)]">
        <div class="flex justify-center">
          <div>
            <sl-tab-group>
              <sl-tab slot="nav" panel="main">BRC20</sl-tab>
              <sl-tab-panel name="main" class="[&::part(base)]:grid [&::part(base)]:gap-2">
                <div class="w-full flex gap-2">
                  <sl-input type="text" ${ref(this.inputTick)} name="tick" placeholder="Tick" required></sl-input>
                  <sl-button
                    variant="primary"
                    @click=${() => {
                      if (!this.inputTick.value!.value) {
                        this.inputTick.value!.focus()
                        return toastError('Tick is required')
                      }
                      this.inscribe({
                        p: 'brc-20',
                        op: 'deploy',
                        tick: this.inputTick.value!.value,
                        max: '21000000',
                        lim: '1000'
                      })
                    }}
                    >Deploy</sl-button
                  >
                  <sl-button
                    variant="primary"
                    @click=${() => {
                      if (!this.inputTick.value!.value) {
                        this.inputTick.value!.focus()
                        return toastError('Tick is required')
                      }
                      this.inscribe({ p: 'brc-20', op: 'mint', tick: this.inputTick.value!.value, amt: '1000' })
                    }}
                    >Mint</sl-button
                  >
                </div>
                <div>
                  <sl-button variant="text" style="" @click=${() => (this.inputTick.value!.value = 'ordQ')}
                    >ordQ</sl-button
                  >
                  <sl-button variant="text" @click=${() => (this.inputTick.value!.value = 'satQ')}>satQ</sl-button>
                </div>
                <sl-divider></sl-divider>
                ${when(this.balances === undefined, () => html`<sl-skeleton effect="pulse"></sl-skeleton>`)}
                ${map(
                  this.balances ?? [],
                  (balance) => html`<form
                    class="text-neutral-400 flex items-center gap-2"
                    @submit=${(ev: Event) => {
                      ev.preventDefault()
                      const form = (ev.target as HTMLElement).closest('form') as HTMLFormElement
                      if (!form) throw new Error('No form found')
                      const inputAmount = form.querySelector('sl-input[name=amount]') as SlInput
                      if (!inputAmount.value) return
                      this.inscribe({ p: 'brc-20', op: 'transfer', tick: balance.ticker, amt: inputAmount.value })
                    }}
                  >
                    ${balance.ticker}: ${balance.overallBalance}
                    <sl-input type="number" name="amount" placeholder="amount" required></sl-input>
                    <sl-button variant="primary" type="submit">Lock</sl-button>
                  </form>`
                )}
                <sl-button
                  variant="primary"
                  @click=${(ev: Event) => {
                    const btn = ev.target as SlButton
                    btn.disabled = btn.loading = true
                    this.updateBalances().finally(() => (btn.disabled = btn.loading = false))
                  }}
                  >Check Balance</sl-button
                >
              </sl-tab-panel>
            </sl-tab-group>
          </div>
        </div>
      </main>
    `
  }

  /** inscribe `body` to `reciept`(wallet address bydefault). */
  inscribe(body: any, reciept?: string) {
    body = JSON.stringify(body)
    var { alert } = toastImportant(`Preparing inscribe <span style="white-space:pre-wrap">${body}</span>`)
    return Promise.all([walletState.getAddress(), walletState.getNetwork()])
      .then(([address, network]) => {
        var privateKey = new Uint8Array(32)
        crypto.getRandomValues(privateKey)
        const publicKey = btc.utils.pubSchnorr(privateKey)

        const inscription = {
          tags: { contentType: 'text/plain;charset=utf-8' },
          body: utf8ToBytes(body)
        }
        const customScripts = [ordinals.OutOrdinalReveal]
        const p2tr = btc.p2tr(
          undefined,
          ordinals.p2tr_ord_reveal(publicKey, [inscription]),
          btcNetwork(network),
          false,
          customScripts
        )
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
            alert = toastImportant(`Inscribing <span style="white-space:pre-wrap">${body}</span>`).alert
            return walletState.connector!.sendBitcoin(p2tr.address!, amountInscription + inscriptionFee)
          })
          .then(async (txid) => {
            toast(`Inscribe transaction sent, txid: ${txid}`)
            alert.hide()
            alert = toastImportant(`Waiting for inscription to be announced in mempool<sl-spinner></sl-spinner>`).alert
            while (true) {
              const res = await fetch(`https://mempool.space/testnet/api/tx/${txid}`)
              if (res.status == 200) break
              await new Promise((r) => setTimeout(r, 1000))
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
            tx.addOutputAddress(reciept ?? address, BigInt(amountInscription), btcNetwork(network))
            tx.sign(privateKey)
            tx.finalize()
            return walletState.connector!.pushPsbt(bytesToHex(tx.toPSBT()))
          })
          .then((txid) => {
            alert.hide()
            toast(`Reveal transaction sent, txid: ${txid}`)
          })
      })
      .catch((e) => toastError(e))
      .finally(() => alert.hide())
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'brc20-main': AppMain
  }
}
