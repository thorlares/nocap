import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { map } from 'lit/directives/map.js'
import { when } from 'lit/directives/when.js'
import { inscribe } from '../../../src/lib/inscribe'
import { waitForTx } from '../../../src/lib/waitForTx.js'
import type { SlButton, SlDialog, SlInput } from '@shoelace-style/shoelace'
import { Psbt, networks, payments, script } from 'bitcoinjs-lib'
import { getLockAddress, getLockP2WSH } from '../lib/lockAddress'
import { witnessStackToScriptWitness } from '../../../src/lib/witnessStackToScriptWitness'
import { toast, toastImportant } from '../../../src/components/toast'
import { walletContext, walletState } from '../../../src/lib/walletState'
import baseStyle from '/src/base.css?inline'
import { consume, ContextConsumer } from '@lit/context'
import { createRef, ref } from 'lit/directives/ref.js'
import { Brc20Balance, Network } from '../../../lib/types'
import { getJson } from '../../../lib/fetch'
import { hexToBytes } from '@noble/hashes/utils'
import '@shoelace-style/shoelace/dist/components/tab/tab.js'
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js'
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js'
import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/divider/divider.js'
import '@shoelace-style/shoelace/dist/components/input/input.js'
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js'
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js'

@customElement('brc20-lock')
export class Brc20Lock extends LitElement {
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
  @state() lockedBalances: Record<string, Brc20Balance> = {}
  @state() lockedTransferables: Record<string, any[]> = {}

  @state() lockDialogStep = 0
  @state() lockDialogClosable = false
  @state() lockDialogError?: Error
  @state() lockResult?: { txid: string }

  private contextConsumers: any[] = []
  private lockDialog = createRef<SlDialog>()

  get lockAddress() {
    if (!this.publicKey || !this.network) return 'loading'
    return getLockAddress(this.publicKey, 10, this.network)
  }

  getLockAddress() {
    return Promise.all([walletState.getPublicKey(), walletState.getNetwork()]).then(([publicKey, network]) =>
      getLockAddress(publicKey, 10, network)
    )
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

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.contextConsumers.forEach((c) => this.removeController(c))
    this.contextConsumers = []
  }

  private lock(ticker: string, amount: number) {
    this.lockDialogStep = 1
    this.lockDialogClosable = false
    this.lockDialogError = undefined
    this.lockDialog.value?.show()

    const inscriptionAmount = 650
    var inscriptionWithFee = 650
    var { alert } = toastImportant(`Preparing lock ${amount} ${ticker}`)
    return inscribe({ p: 'brc-20', op: 'transfer', tick: ticker, amt: amount.toString() })
      .then((txid) => {
        alert.hide()
        alert = toastImportant(
          `Waiting for prepare transaction to be announced in mempool<sl-spinner></sl-spinner>`
        ).alert
        return waitForTx(txid)
      })
      .then((txid) => Promise.all([walletState.feeRates, txid]))
      .then(([feeRates, txid]) => {
        inscriptionWithFee = inscriptionAmount + 175 * Math.max(feeRates.minimumFee, feeRates.halfHourFee)
        alert.hide()
        alert = toastImportant(`Transfering <pre>${txid}i0</pre> to <pre>${this.lockAddress}</pre>`).alert
        return walletState.connector!.sendInscription(this.lockAddress, `${txid}i0`, {
          feeRate: feeRates.halfHourFee
        })
      })
      .then((txid) => {
        toast(`BRC20 sent, txid: ${txid}`)
        alert.hide()
        alert = toastImportant(
          `Waiting for transfer transaction to be announced in mempool<sl-spinner></sl-spinner>`
        ).alert
        return waitForTx(txid)
      })
      .then(() => {
        this.lockDialogStep = 2
        alert.hide()
        alert = toastImportant(`Inscribing transfer for <pre>${this.lockAddress}</pre>`).alert
        return inscribe(
          { p: 'brc-20', op: 'transfer', tick: ticker, amt: amount.toString() },
          this.lockAddress,
          inscriptionWithFee
        )
      })
      .then((txid) => {
        toast(`Transfer inscribed, txid: ${txid}`)
        alert.hide()
        alert = toastImportant(`Waiting for transaction to be announced in mempool<sl-spinner></sl-spinner>`).alert
        return waitForTx(txid)
      })
      .then(() => {
        alert.hide()
        toast('Successfully locked')
        this.lockDialog.value?.hide()
        this.updateBalances()
      })
      .catch((e) => {
        alert.hide()
        this.lockDialogError = e
        this.lockDialogClosable = true
      })
  }

  private finishLock(detail: any) {
    return walletState.feeRates.then((feeRates) => {
      const inscriptionAmount = 650
      const inscriptionWithFee = inscriptionAmount + 175 * Math.max(feeRates.minimumFee, feeRates.halfHourFee)
      return inscribe(
        {
          p: 'brc-20',
          op: 'transfer',
          tick: detail.ticker,
          amt: (Number(detail.overallBalance) - Number(detail.transferableBalance)).toString()
        },
        this.lockAddress,
        inscriptionWithFee
      ).then(waitForTx)
    })
  }

  private unlock(detail: any) {
    const lockBlocks = 10
    const p2wsh = getLockP2WSH(this.publicKey!, lockBlocks, this.network!)

    // fetch recommended fees
    const network =
      walletState.network == 'livenet'
        ? networks.bitcoin
        : walletState.network == 'devnet'
        ? networks.regtest
        : networks.testnet

    // build transaction
    const psbt = new Psbt({ network })
    psbt.addInput({
      hash: detail.inscriptionId.split('i')[0],
      index: Number(detail.inscriptionId.split('i')[1]),
      sequence: lockBlocks,
      witnessUtxo: {
        script: p2wsh.script,
        value: BigInt(detail.satoshi)
      },
      witnessScript: p2wsh.witnessScript
    })
    psbt.addOutput({
      address: walletState.address!,
      value: BigInt(650)
    })

    // we need to finalize the input manually due to custom p2wsh script
    const finalizeInput = (_inputIndex: number, input: any) => {
      const redeemPayment = payments.p2wsh({
        redeem: {
          input: script.compile([input.partialSig[0].signature]),
          output: input.witnessScript
        }
      })

      const finalScriptWitness = witnessStackToScriptWitness(redeemPayment.witness ?? [])

      return {
        finalScriptSig: hexToBytes(''),
        finalScriptWitness
      }
    }

    var { alert } = toastImportant(
      `Unlocking <pre>${detail.data.amt} ${detail.data.tick}</pre> to <pre>${walletState.address}</pre>`
    )
    return walletState
      .connector!.signPsbt(psbt.toHex(), {
        autoFinalized: false, // we need to finalize the input manually later
        toSignInputs: [{ index: 0, publicKey: this.publicKey, disableTweakSigner: true }]
      })
      .then((psbtHex) => Psbt.fromHex(psbtHex, { network }).finalizeInput(0, finalizeInput).toHex())
      .then((txHex) => walletState.connector!.pushPsbt(txHex))
      .then((txid) => {
        toast(`Unlock transaction broadcasted, txid: <pre>${txid}</pre>`)
        alert.hide()
        alert = toastImportant(`Waiting for transaction to be announced in mempool<sl-spinner></sl-spinner>`).alert
        return waitForTx(txid).then(() => this.updateLocked(detail.data.tick))
      })
      .then(() => {
        alert.hide()
        toastImportant(
          `Successfully unlocked ${detail.data.amt} ${detail.data.tick} to <pre>${walletState.address}</pre>`
        )
      })
      .catch((e) => {
        alert.hide()
        if (e?.message.includes('non-BIP68-final')) toast(new Error(`${e.message}, timelock not passed`))
        else toast(e)
      })
  }

  private updateTransferable(ticker: string) {
    if (!this.address) throw new Error('Wallet not connected')
    return fetch(`/api/brc20Transferable?address=${this.address}&ticker=${ticker}`)
      .then(getJson)
      .then((data) => {
        console.debug('BRC20 Transferable from server:', this.address, ticker, data?.data ?? data)
        this.transferables = { ...this.transferables, [ticker]: data?.data?.detail ?? [] }
      })
      .catch((err) => {
        console.error(err)
        throw err
      })
  }

  private updateLocked(ticker: string) {
    return this.getLockAddress()
      .then((lockAddress) => fetch(`/api/brc20Transferable?address=${lockAddress}&ticker=${ticker}`))
      .then(getJson)
      .then((data) => {
        console.debug('Locked Transferables from server:', this.address, ticker, data?.data ?? data)
        this.lockedTransferables = { ...this.lockedTransferables, [ticker]: data?.data?.detail ?? [] }
      })
      .catch((err) => {
        console.error(err)
        throw err
      })
  }

  public updateBalances() {
    if (!this.address) throw new Error('Wallet not connected')
    return Promise.all([
      fetch(`/api/brc20Balance?address=${this.address}`)
        .then(getJson)
        .then((data) => {
          console.debug('BRC20 Balance from server:', this.address, data?.data ?? data)
          this.balances = data?.data?.detail
          this.balances?.forEach((b) => {
            if (Number(b.transferableBalance)) this.updateTransferable(b.ticker)
            else this.transferables[b.ticker] = []
          })
        })
        .catch((err) => {
          console.error(err)
          throw err
        }),
      this.getLockAddress()
        .then((lockAddress) => fetch(`/api/brc20Balance?address=${lockAddress}`))
        .then(getJson)
        .then((data) => {
          console.debug('Locked Balance from server:', this.lockAddress, data?.data ?? data)
          data?.data?.detail?.forEach((b: Brc20Balance) => {
            this.lockedBalances[b.ticker] = b
            if (Number(b.transferableBalance)) this.updateLocked(b.ticker)
            else this.lockedTransferables[b.ticker] = []
          })
        })
        .catch((err) => {
          console.error(err)
          throw err
        })
    ])
  }

  render() {
    return html`
      <div class="flex flex-col gap-2">
        ${when(
          this.balances === undefined,
          () => html`<sl-skeleton effect="pulse"></sl-skeleton>`,
          () =>
            map(
              this.balances,
              (balance) => html`<div class="flex px-1">
                <span class="font-mono border-r border-neutral-700 pr-2 mr-2">${balance.ticker}</span>
                <div class="flex flex-col gap-1">
                  <span>Balance: ${balance.overallBalance} (${balance.availableBalance} available for locking)</span>
                  <form
                    class="flex items-center gap-2"
                    @submit=${(ev: SubmitEvent) => {
                      ev.preventDefault()
                      const form = ev.target as HTMLFormElement
                      const inputAmount = form.querySelector('sl-input[name=amount]') as SlInput
                      if (!inputAmount.valueAsNumber) return
                      const button = form.querySelector('sl-button[type=submit]') as SlButton
                      button.disabled = button.loading = true
                      this.lock(balance.ticker, inputAmount.valueAsNumber).finally(
                        () => (button.disabled = button.loading = false)
                      )
                    }}
                  >
                    <sl-input type="number" name="amount" placeholder="amount" size="small" required></sl-input>
                    <sl-button variant="primary" type="submit" size="small">lock</sl-button>
                  </form>
                  ${when(
                    this.lockedBalances?.[balance.ticker],
                    (detail) => html`
                      <span>Locked: ${detail.overallBalance} </span>
                      ${when(
                        this.lockedTransferables[balance.ticker] === undefined,
                        () => html`<sl-skeleton effect="pulse"></sl-skeleton>`,
                        () =>
                          this.lockedTransferables[balance.ticker].length
                            ? html`<ul class="list-disc list-inside">
                                ${map(
                                  this.lockedTransferables[balance.ticker],
                                  (detail) => html`<li>
                                    <span class="align-middle">${detail.data.amt}</span>
                                    <sl-button
                                      variant="text"
                                      size="small"
                                      ?disabled=${detail.confirmations < 10}
                                      @click=${() => this.unlock(detail)}
                                      >unlock</sl-button
                                    >
                                    <span class="text-xs text-neutral-400 align-middle">
                                      ${when(
                                        detail.confirmations,
                                        () =>
                                          when(
                                            detail.confirmations < 10,
                                            () =>
                                              html`<sl-icon name="clock-history" class="align-middle"></sl-icon
                                                ><span class="align-middle ml-1"
                                                  >${10 - detail.confirmations} blocks remaining</span
                                                >`,
                                            () => `(${detail.confirmations - 10} blocks passed)`
                                          ),
                                        () => '(unconfirmed)'
                                      )}
                                    </span>
                                  </li>`
                                )}
                                ${when(
                                  detail.transferableBalance != detail.overallBalance,
                                  () =>
                                    html`<li>
                                      <span class="align-middle"
                                        >${Number(detail.overallBalance) - Number(detail.transferableBalance)}
                                        (incomplete lock)</span
                                      >
                                      <sl-button
                                        variant="text"
                                        size="small"
                                        @click=${(ev: Event) => {
                                          const button = ev.target as SlButton
                                          button.disabled = button.loading = true
                                          this.finishLock(detail)
                                            .then(() => this.updateLocked(detail.ticker))
                                            .finally(() => (button.disabled = button.loading = false))
                                        }}
                                        >finish locking</sl-button
                                      >
                                    </li>`
                                )}
                              </ul>`
                            : ''
                      )}
                    `
                  )}
                </div>
              </div>`
            )
        )}
      </div>
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
}
