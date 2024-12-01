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
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js'
import '../../src/components/connect.ts'
import { toast, toastError, toastImportant } from '../../src/components/toast'
import { consume, ContextConsumer } from '@lit/context'
import { walletContext, walletState } from '../../src/lib/walletState'
import { getJson } from '../../lib/fetch.js'
import { map } from 'lit/directives/map.js'
import { Brc20Balance, Network } from '../../lib/types.js'
import { when } from 'lit/directives/when.js'
import SlButton from '@shoelace-style/shoelace/dist/components/button/button.js'
import { createRef, ref } from 'lit/directives/ref.js'
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js'
import SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import { inscribe } from '../../src/lib/inscribe.js'
import { getLockAddress } from './lib/lockAddress.js'

setBasePath(import.meta.env.MODE === 'development' ? '../node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('brc20-main')
export class AppMain extends LitElement {
  static styles = [unsafeCSS(baseStyle)]
  @consume({ context: walletContext.address, subscribe: true })
  @state()
  address?: string
  @consume({ context: walletContext.publicKey, subscribe: true })
  @state()
  publicKey?: string
  @consume({ context: walletContext.network, subscribe: true })
  @state()
  network?: Network

  @state() balances?: Brc20Balance[]
  @state() transferables: Record<string, any[]> = {}
  @state() locked: Record<string, any[]> = {}

  @state() lockDialogStep = 0
  @state() lockDialogClosable = false
  @state() lockDialogError?: Error
  @state() lockResult?: { txid: string }

  private contextConsumers: any[] = []
  private inputTick = createRef<SlInput>()
  private lockDialog = createRef<SlDialog>()

  get lockAddress() {
    if (!walletState.publicKey || !walletState.network) return 'loading'
    return getLockAddress(walletState.publicKey, 10, walletState.network)
  }

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

  private updateTransferableAndLocked(ticker: string) {
    if (!this.address) throw new Error('Wallet not connected')
    return Promise.all([
      fetch(`/api/brc20Transferable?address=${this.address}&ticker=${ticker}`)
        .then(getJson)
        .then((data) => {
          console.debug('BRC20 Transferable from server:', data)
          this.transferables = { ...this.transferables, [ticker]: data?.data?.detail ?? [] }
        })
        .catch((err) => {
          console.error(err)
        }),
      walletState.getPublicKey().then((publicKey) => {
        if (!publicKey) return Promise.resolve()
        return fetch(`/api/brc20Transferable?address=${this.lockAddress}&ticker=${ticker}`)
          .then(getJson)
          .then((data) => {
            console.debug('BRC20 Transferable from server:', data)
            this.locked = { ...this.locked, [ticker]: data?.data?.detail ?? [] }
          })
          .catch((err) => {
            console.error(err)
          })
      })
    ])
  }

  private updateBalances() {
    if (!this.address) throw new Error('Wallet not connected')
    return fetch(`/api/brc20Balance?address=${this.address}`)
      .then(getJson)
      .then((data) => {
        console.debug('BRC20 Balance from server:', data)
        this.balances = data?.data?.detail
        this.balances?.forEach((b) => {
          this.updateTransferableAndLocked(b.ticker)
        })
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
                      inscribe({
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
                      inscribe({ p: 'brc-20', op: 'mint', tick: this.inputTick.value!.value, amt: '1000' })
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
                  (balance) => html`<div class="flex px-1">
                    <span>${balance.ticker}</span>
                    <sl-divider vertical></sl-divider>
                    <div class="flex flex-col gap-1">
                      <span
                        >Balance: ${balance.overallBalance} (${balance.transferableBalance ?? 'no'} transferable for
                        locking)</span
                      >
                      <form
                        class="flex items-center gap-2"
                        @submit=${(ev: Event) => {
                          ev.preventDefault()
                          const form = (ev.target as HTMLElement).closest('form') as HTMLFormElement
                          if (!form) throw new Error('No form found')
                          const inputAmount = form.querySelector('sl-input[name=amount]') as SlInput
                          if (!inputAmount.valueAsNumber) return
                          inscribe({
                            p: 'brc-20',
                            op: 'transfer',
                            tick: balance.ticker,
                            amt: inputAmount.value
                          }).then(() => this.updateTransferableAndLocked(balance.ticker))
                        }}
                      >
                        <sl-input type="number" name="amount" placeholder="amount" size="small" required></sl-input>
                        <sl-button variant="primary" type="submit" size="small">inscribe transfer</sl-button>
                      </form>
                      ${when(
                        this.transferables[balance.ticker] === undefined,
                        () => html`<sl-skeleton effect="pulse"></sl-skeleton>`,
                        () => html` <span>Transferables:</span>
                          <ul class="list-disc list-inside">
                            ${map(
                              this.transferables[balance.ticker],
                              (detail) => html`<li>
                                <span class="align-middle">${detail.data.amt}</span>
                                <sl-button variant="text" size="small" @click=${() => this.lock(balance.ticker, detail)}
                                  >lock</sl-button
                                >
                              </li>`
                            )}
                          </ul>`
                      )}
                      ${when(
                        this.locked[balance.ticker] === undefined,
                        () => html`<sl-skeleton effect="pulse"></sl-skeleton>`,
                        () => html` <span>Locked:</span>
                          <ul class="list-disc list-inside">
                            ${map(
                              this.locked[balance.ticker],
                              (detail) => html`<li>
                                <span class="align-middle">${detail.data.amt}</span>
                                <sl-button variant="text" size="small" @click=${() => this.lock(balance.ticker, detail)}
                                  >lock</sl-button
                                >
                              </li>`
                            )}
                          </ul>`
                      )}
                    </div>
                  </div>`
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
      <sl-dialog
        label="2 Steps to Lock BRC20 Token"
        ${ref(this.lockDialog)}
        @sl-request-close=${(event: CustomEvent) => {
          if (!this.lockDialogClosable) event.preventDefault()
        }}
      >
        ${when(
          this.lockDialogError,
          () => html`
            <div slot="label" class="text-red-500 flex items-center gap-2">
              <sl-icon name="exclamation-circle" class="flex-none mt-0.5"></sl-icon>
              <p>${this.lockDialogError!.message}</p>
            </div>
          `
        )}
        <div class="flex flex-col gap-1">
          <div class="flex gap-2 ${when(this.lockDialogStep != 1, () => 'text-neutral-500 text-sm')}">
            <sl-icon
              name="1-circle"
              class="flex-none mt-1 ${when(this.lockDialogStep == 1, () => 'animate-pulse text-sky-500')}"
            ></sl-icon>
            <div class="flex-1">
              <p>Transfer BRC20 to Self-Custody address</p>
            </div>
          </div>

          <div class="flex gap-2 ${when(this.lockDialogStep != 2, () => 'text-neutral-500 text-sm')}">
            <sl-icon
              name="2-circle"
              class="flex-none mt-1 ${when(this.lockDialogStep == 2, () => 'animate-pulse text-sky-500')}"
            ></sl-icon>
            <div class="flex-1">
              <p>Inscribing transfer for Self-Custody address</p>
            </div>
          </div>

          <sl-divider></sl-divider>

          <p class="flex text-sm text-sl-neutral-600 gap-1">
            <span class="flex-none">Self-Custody Address:</span>
            <span class="font-mono break-all text-[var(--sl-color-neutral-700)]">${this.lockAddress}</span>
          </p>
          ${when(
            this.publicKey,
            () => html` <p class="text-sm text-sl-neutral-600">Self-Custody Script:</p>
              <pre
                class="p-1 px-2 w-full overflow-x-scroll text-xs text-[var(--sl-color-neutral-700)] border rounded border-[var(--sl-color-neutral-200)]"
              >
# Number of blocks to lock
10
# Fail if not after designated blocks
OP_CHECKSEQUENCEVERIFY
OP_DROP
# Check signature against your own public key
${this.publicKey}
OP_CHECKSIG
</pre>`
          )}
        </div>
      </sl-dialog>
    `
  }

  lock(ticker: string, detail: any) {
    this.lockDialogStep = 1
    this.lockDialogClosable = false
    this.lockDialogError = undefined
    this.lockDialog.value?.show()
    var { alert } = toastImportant(`Transfering <pre>${detail.inscriptionId}</pre> to <pre>${this.lockAddress}</pre>`)
    Promise.all([walletState.getPublicKey(), walletState.getNetwork()])
      .then(() => walletState.connector?.sendInscription(this.lockAddress, detail.inscriptionId))
      .then(async (txid) => {
        toast(`BRC20 sent, txid: ${txid}`)
        alert.hide()
        alert = toastImportant(`Waiting for transaction to be announced in mempool<sl-spinner></sl-spinner>`).alert
        await new Promise((r) => setTimeout(r, 1000))
        while (true) {
          const res = await fetch(`https://mempool.space/testnet/api/tx/${txid}`)
          if (res.status == 200) break
          await new Promise((r) => setTimeout(r, 3000))
        }
        return txid
      })
      .then(() => {
        this.lockDialogStep = 2
        alert.hide()
        alert = toastImportant(`Inscribing transfer for <pre>${this.lockAddress}</pre>`).alert
        return inscribe({ p: 'brc-20', op: 'transfer', tick: ticker, amt: detail.data.amt }, this.lockAddress)
      })
      .then(() => {
        alert.hide()
        toast('Successfully locked')
        this.lockDialog.value?.hide()
        this.updateTransferableAndLocked(ticker)
      })
      .catch((e) => {
        alert.hide()
        this.lockDialogError = e
        this.lockDialogClosable = true
      })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'brc20-main': AppMain
  }
}
