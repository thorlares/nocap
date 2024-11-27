import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/carousel/carousel.js'
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import '@shoelace-style/shoelace/dist/components/divider/divider.js'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import '@shoelace-style/shoelace/dist/components/input/input.js'
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js'
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js'
import '@shoelace-style/shoelace/dist/components/tab/tab.js'
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js'
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js'
import { consume, ContextConsumer } from '@lit/context'
import { customElement, property, state } from 'lit/decorators.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'
import { LitElement, html, unsafeCSS } from 'lit'
import { fetchMpcPubKey, mpcPubKey, walletContext } from '../lib/contexts'
import { createRef, ref } from 'lit/directives/ref.js'
import { map } from 'lit/directives/map.js'
import { when } from 'lit/directives/when.js'
import * as btc from '@scure/btc-signer'
import style from '/src/base.css?inline'
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import { walletState } from '../lib/walletState'
import { btcNetwork } from '../../lib/network'
import { toXOnlyU8 } from '../../lib/utils'
import { ensureSuccess, getJson } from '../../lib/fetch'
import { toast, toastImportant } from './toast'
import { getLockAddress, getLockAddressV0, getLockP2WSH, getLockP2WSHV0 } from '../../lib/lockAddress'
import { formatUnits } from '@ethersproject/units'
import { networks, payments, Psbt, script } from 'bitcoinjs-lib'
import { bytes } from '@scure/base'
import { witnessStackToScriptWitness } from '../lib/witnessStackToScriptWitness'

@customElement('meme-dialog')
export class MemeDialog extends LitElement {
  static styles = [unsafeCSS(style)]
  @property({ type: String }) ca?: string
  @state() meta: any
  @state() lockDialogStep = 0
  @state() lockDialogClosable = false
  @state() lockDialogHasInscription = false
  @state() lockDialogError?: Error
  @state() lockingBlocks = 10
  @state() supporters?: any[]
  @state() lockedAmount: any
  @state() lockedUtxos?: any[]
  @state() lockAddresses: Record<string, any> = {}

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
  @consume({ context: walletContext.network, subscribe: true })
  @state()
  readonly network?: string
  @consume({ context: walletContext.height, subscribe: true })
  @state()
  readonly height?: number

  private contextConsumers: any[] = []

  connectedCallback(): void {
    super.connectedCallback()
    // @todo: unsubscribe when changed
    this.contextConsumers.push(
      new ContextConsumer(this, {
        context: walletContext.network,
        callback: () => this.updateLockDetails(),
        subscribe: true
      }),
      ...[walletContext.address, walletContext.publicKey, mpcPubKey].map(
        (context) =>
          new ContextConsumer(this, {
            context,
            callback: () => this.updateLockUtxos(),
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

  show() {
    this.dialog.value?.show()
    if (!this.publicKey) walletState.getPublicKey()
    if (this.meta?.id != this.ca) {
      this.meta = undefined
      // update meta
      fetch(`/api/token?address=${this.ca}`)
        .then(getJson)
        .then((meta) => {
          if (meta.id == this.ca) this.meta = meta
        })
        .catch(toastImportant)
      this.updateLockDetails()
    }
  }

  hide() {
    this.dialog.value?.hide()
  }

  private updateLockUtxos() {
    try {
      if (!this.dialog.value?.open) return
      if (!this.network) {
        walletState.getNetwork()
        return
      }
      if (!this.mpcPubKey) {
        fetchMpcPubKey()
        return
      }
      if (!this.publicKey) {
        walletState.getPublicKey()
        return
      }
      walletState.updateHeight()
      const ca = this.ca!

      this.lockedUtxos = undefined
      // update my locked utxos
      ;[
        getLockAddressV0(this.mpcPubKey, this.publicKey, ca, this.lockingBlocks, walletState.network!),
        getLockAddress(this.publicKey, ca, this.lockingBlocks, walletState.network!)
      ].forEach((lockAddress) => {
        if (!this.lockAddresses[lockAddress])
          fetch(`/api/lockAddress?address=${lockAddress}`)
            .then(getJson)
            .then((result) => {
              if (ca == this.ca) this.lockAddresses = { ...this.lockAddresses, [lockAddress]: result }
            })
        fetch(walletState.mempoolApiUrl(`/api/address/${lockAddress}/utxo`))
          .then(getJson)
          .then((lockedUtxos) => {
            if (ca == this.ca)
              this.lockedUtxos = [
                ...(this.lockedUtxos ?? []),
                ...lockedUtxos.map((value: any) => ({ ...value, address: lockAddress }))
              ]
          })
          .catch(console.warn)
      })
    } catch (e) {
      console.warn(e)
    }
  }

  private async updateLockDetails() {
    try {
      if (!this.dialog.value?.open) return
      this.supporters = this.lockedAmount = this.lockedUtxos = undefined
      if (!this.network) {
        walletState.getNetwork()
        return
      }
      const ca = this.ca

      // update my locking amount if needed
      if (this.address && this.publicKey && walletState.network)
        await fetch('/api/updateAmount', {
          method: 'POST',
          body: JSON.stringify({
            address: this.address,
            publicKey: this.publicKey,
            blocks: this.lockingBlocks,
            ca,
            network: walletState.network
          })
        })
          .then(ensureSuccess)
          .catch(console.warn)

      fetch(`/api/supporters?address=${ca}&network=${this.network}`)
        .then(getJson)
        .then((supporters) => {
          if (ca == this.ca) this.supporters = supporters
        })
        .catch(console.warn)
      fetch(`/api/lockedAmount?address=${ca}&network=${this.network}`)
        .then(getJson)
        .then((lockedAmount) => {
          if (ca == this.ca) this.lockedAmount = lockedAmount
        })
        .catch(console.warn)
      this.updateLockUtxos()
    } catch (e) {
      console.warn(e)
    }
  }

  get getLockAddress() {
    if (!this.publicKey) return 'loading'
    return getLockAddress(this.publicKey, this.ca!, this.lockingBlocks, walletState.network!)
  }

  get p2trInscription() {
    if (!this.publicKey) return undefined
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
          utf8ToBytes(`v1|${this.publicKey}|${this.lockingBlocks}|${this.ca}`),
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
                <div class="text-xs text-green-400 text-center">
                  <a target="_blank" href="https://pump.fun/coin/${this.ca}" class="underline hover:no-underline"
                    >[pump.fun]</a
                  >
                  <a target="_blank" href="https://solscan.io/token/${this.ca}" class="underline hover:no-underline"
                    >[solscan]</a
                  >
                </div>
              </div>
              <div class="gap-2 grid h-fit">
                <p class="text-sm w-full" style="overflow-wrap: break-word; word-break: break-all;">
                  <span class="font-bold"> Ticker: ${this.meta.symbol} </span>
                </p>
                <p class="text-xs text-blue-200 gap-1 break-all">
                  <span>ca:</span>
                  <span class="text-mono">${this.ca}</span>
                </p>
                <p class="text-sm w-full break-all max-h-28 overflow-y-scroll">${this.meta.description}</p>
                <p class="flex items-center text-sm text-blue-200">
                  Locked <sl-icon outline name="currency-bitcoin"></sl-icon> ${when(
                    this.lockedAmount,
                    () => formatUnits(this.lockedAmount.confirmed + this.lockedAmount.unconfirmed, 8),
                    () => html`<sl-skeleton
                      effect="pulse"
                      class="w-16 [&::part(base)]:min-h-2 opacity-45"
                      style="--color: var(--sl-color-blue-800);"
                    ></sl-skeleton>`
                  )}
                </p>
              </div>
            </div>
            <sl-tab-group>
              <sl-tab slot="nav" panel="support">Top Supporters</sl-tab>
              <sl-tab-panel name="support" class="text-gray-400 text-xs">
                ${when(!this.supporters, () => html`<sl-skeleton effect="pulse"></sl-skeleton>`)}
                ${map(
                  this.supporters,
                  (supporter) => html`<p class="font-mono">
                    <a
                      target="_blank"
                      href="${walletState.mempoolUrl}/address/${supporter.lock_address}"
                      class="underline hover:no-underline"
                      >${supporter.lock_address.slice(0, 8) + '...' + supporter.lock_address.slice(-6)}</a
                    >: ${formatUnits(supporter.confirmed + supporter.unconfirmed, 8)}
                    ${supporter.unconfirmed ? '(' + formatUnits(supporter.unconfirmed, 8) + ' unconfirmed)' : ''}
                  </p>`
                )}
              </sl-tab-panel>
            </sl-tab-group>
            <sl-tab-group>
              <sl-tab slot="nav" panel="support">Support</sl-tab>
              <sl-tab slot="nav" panel="unlock" ?disabled=${!this.lockedUtxos?.length}>Unlock</sl-tab>

              <sl-tab-panel name="support">
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
                    class="w-full"
                    placeholder="Enter an amount of bitcoin"
                    tabindex="1"
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
                      <span class="font-mono text-xs break-words text-[var(--sl-color-neutral-700)]"
                        >${this.getLockAddress}</span
                      >
                    </p>
                    <p class="text-sm mt-2 text-sl-neutral-600">
                      Self-Custody Script:
                      <!-- <a class="text-green-600 underline hover:no-underline cursor-pointer">verify</a> -->
                    </p>
                    <pre
                      class="mt-2 p-1 px-2 w-full overflow-x-scroll text-xs text-[var(--sl-color-neutral-700)] border rounded border-[var(--sl-color-neutral-200)]"
                    >
# Number of blocks to lock
OP_${this.lockingBlocks}
# Fail if not after designated blocks
OP_CHECKSEQUENCEVERIFY
OP_DROP

# Check signature against your own public key
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
              </sl-tab-panel>
              <sl-tab-panel name="unlock" class="text-gray-400 text-xs">
                ${when(!this.lockedUtxos, () => html`<sl-skeleton effect="pulse"></sl-skeleton>`)}
                ${map(
                  this.lockedUtxos,
                  (utxo) => html`<p class="flex items-center gap-1">
                    <span class="font-mono"
                      ><a
                        target="_blank"
                        href="${walletState.mempoolUrl}/tx/${utxo.txid}"
                        class="underline hover:no-underline"
                        >${utxo.txid.slice(0, 5) + '...' + utxo.txid.slice(-5)}</a
                      >: ${formatUnits(utxo.value, 8)}</span
                    >
                    ${when(
                      utxo.status.confirmed,
                      () =>
                        when(
                          this.height && this.lockAddresses[utxo.address],
                          () =>
                            when(
                              utxo.status.block_height + this.lockAddresses[utxo.address].blocks > this.height!,
                              () =>
                                html`<sl-icon name="clock-history"></sl-icon>
                                  <span
                                    >${utxo.status.block_height +
                                    this.lockAddresses[utxo.address].blocks -
                                    this.height!}
                                    blocks remaining</span
                                  >`
                            ),
                          () => html`<sl-spinner></sl-spinner>`
                        ),
                      () => '(unconfirmed)'
                    )}
                    <sl-button
                      @click=${() => this.unlock(utxo)}
                      ?disabled=${!utxo.status.confirmed ||
                      !(this.height && this.lockAddresses[utxo.address]) ||
                      this.lockAddresses[utxo.address].blocks + utxo.status.block_height > this.height}
                      variant="text"
                      size="small"
                      >[unlock]</sl-button
                    >
                  </p>`
                )}
              </sl-tab-panel>
            </sl-tab-group>
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
          ?closable=${this.lockDialogClosable}
          open
          class="[&::part(close-button)]:items-start [&::part(close-button)]:mt-3"
          @sl-hide=${() => this.dialogStep.value?.hide()}
        >
          ${when(
            this.lockDialogError,
            (err) =>
              html`
                <div class="flex gap-2">
                  <sl-icon
                    name="exclamation-circle"
                    class="flex-none mt-0.5 text-rose-500"
                    style="font-size: 1.1rem;"
                  ></sl-icon>
                  <p class="text-[var(--sl-color-neutral-800)]">${err.message}</p>
                </div>
              `,
            () => html`<p>3 Steps to go</p>`
          )}
          <sl-divider></sl-divider>
          <div class="flex gap-2 ${when(this.lockDialogStep != 1, () => 'text-neutral-500')}">
            <sl-icon
              .name=${this.lockDialogStep == 1 ? 'circle' : this.lockDialogHasInscription ? 'check-circle' : 'x-circle'}
              class="flex-none mt-1 ${when(this.lockDialogStep == 1, () => 'animate-pulse text-sky-500')}"
              style="font-size: 1.1qrem;"
            ></sl-icon>
            <div class="flex-1">
              <p>
                Has inscription? ${when(this.lockDialogStep != 1, () => (this.lockDialogHasInscription ? 'Yes' : 'No'))}
              </p>
            </div>
          </div>
          <sl-divider></sl-divider>
          <div class="flex gap-2 ${when(this.lockDialogStep != 2, () => 'text-neutral-500')}">
            <sl-icon
              name="1-circle"
              class="flex-none mt-1 ${when(this.lockDialogStep == 2, () => 'animate-pulse text-sky-500')}"
              style="font-size: 1.1qrem;"
            ></sl-icon>
            <div class="flex-1">
              <p>
                Creating an inscription to store information in locking
                script.${when(
                  this.lockDialogStep == 2,
                  () => html`<br />Data stored:
                    <span class="font-mono break-all text-xs bg-[var(--sl-color-neutral-200)]">
                      v1&lt;version&gt;|${this.publicKey}&lt;YourPublicKey&gt;|${this
                        .lockingBlocks}&lt;Blocks&gt;|${this.ca}&lt;CoinAddress&gt;</span
                    ><br />Inscription address:
                    <span class="font-mono text-xs break-all bg-[var(--sl-color-neutral-200)]"
                      >${this.p2trInscription?.address}</span
                    >`
                )}
              </p>
            </div>
          </div>
          <sl-divider></sl-divider>
          <div class="flex gap-2 ${when(this.lockDialogStep != 3, () => 'text-neutral-500')}">
            <sl-icon
              name="2-circle"
              class="flex-none mt-1 ${when(this.lockDialogStep == 3, () => 'animate-pulse text-sky-500')}"
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
          <div class="flex gap-2 ${when(this.lockDialogStep != 4, () => 'text-neutral-500')}">
            <sl-icon
              name="3-circle"
              class="flex-none mt-1 ${when(this.lockDialogStep == 4, () => 'animate-pulse text-sky-500')}"
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
    this.lockDialogStep = 1
    this.lockDialogClosable = false
    this.lockDialogError = undefined
    this.dialogStep.value?.show()

    var inscriptionFee = 0
    const amountInscription = 650
    walletState
      .updateNetwork()
      .then((network) =>
        // Step 1: check if the inscription is already created
        fetch(walletState.mempoolApiUrl(`/api/address/${p2tr.address}`))
          .then(getJson)
          .then((result) => {
            this.lockDialogHasInscription = result.chain_stats.funded_txo_sum || result.mempool_stats.spent_txo_sum
            if (!this.lockDialogHasInscription) {
              return (
                // get recommended fees and post lock info to server
                Promise.all([
                  network == 'devnet'
                    ? Promise.resolve({ minimumFee: 1, economyFee: 1, hourFee: 1 })
                    : fetch(walletState.mempoolApiUrl('/api/v1/fees/recommended')).then(getJson),
                  fetch('/api/lock', {
                    method: 'POST',
                    body: JSON.stringify({
                      address: this.address,
                      publicKey: this.publicKey,
                      blocks: this.lockingBlocks,
                      ca: this.ca,
                      network
                    })
                  }).then(ensureSuccess)
                ])
                  // calculate inscription fee
                  .then(([feeRates]) => {
                    inscriptionFee = Math.max(171 * feeRates.minimumFee, 86 * (feeRates.hourFee + feeRates.economyFee))
                  })
                  // Step 2: create inscription
                  .then(() => {
                    this.lockDialogStep = 2
                    return walletState.connector!.sendBitcoin(p2tr.address!, amountInscription + inscriptionFee)
                  })
                  // Step 3: reveal inscription
                  .then((txid) => {
                    console.log('inscribe transaction:', txid)
                    this.lockDialogStep = 3
                    const tx = new btc.Transaction()
                    tx.addInput({
                      ...p2tr,
                      txid,
                      index: 0,
                      witnessUtxo: { script: p2tr.script, amount: BigInt(amountInscription + inscriptionFee) }
                    })
                    tx.addOutputAddress(
                      walletState.address!,
                      BigInt(amountInscription),
                      btcNetwork(walletState.network)
                    )
                    return walletState
                      .connector!.signPsbt(bytesToHex(tx.toPSBT()), {
                        toSignInputs: [{ index: 0, publicKey: this.publicKey, disableTweakSigner: true }]
                      })
                      .then((psbt) => walletState.connector!.pushPsbt(psbt))
                      .then((txid) => console.log('reveal transaction:', txid))
                  })
              )
            } else return Promise.resolve()
          })
      )
      // Step 4: lock bitcoin
      .then(() => {
        this.lockDialogStep = 4
        return walletState.connector!.sendBitcoin(lockAddress, amount * 1e8)
      })
      .then((txid) => {
        console.log('lock transaction:', txid)
        // update locked amount on server
        this.updateLockDetails()
        toastImportant(`Successfully locked ${amount} BTC to <span class="font-mono break-all">${lockAddress}</span>`)
        this.dialogStep.value?.hide()
      })
      .catch((e) => {
        this.lockDialogError = e
        this.lockDialogClosable = true
        console.info(e)
      })
  }

  private async unlock(utxo: any) {
    const addressParams = this.lockAddresses[utxo.address]

    // try recover p2wsh
    var p2wsh = getLockP2WSH(addressParams.publicKey, addressParams.ca, addressParams.blocks, walletState.network!)
    if (p2wsh.address != utxo.address) {
      if (addressParams.mpcPubKey) {
        const p2wshV0 = getLockP2WSHV0(
          addressParams.mpcPubKey,
          addressParams.publicKey,
          addressParams.ca,
          addressParams.blocks,
          walletState.network!
        )
        if (p2wshV0.address != utxo.address) {
          toast(
            new Error(`lock addresses mismatch got ${p2wsh.address} and ${p2wshV0.address} should be ${utxo.address}`)
          )
          return
        }
        p2wsh = p2wshV0
      } else {
        toast(new Error(`lock address mismatch got ${p2wsh.address} should be ${utxo.address}`))
        return
      }
    }
    // fetch recommended fees
    ;(walletState.network == 'devnet'
      ? Promise.resolve({ minimumFee: 1, economyFee: 1, hourFee: 1 })
      : fetch(walletState.mempoolApiUrl('/api/v1/fees/recommended')).then(getJson)
    ).then((feeRates) => {
      const fee = Math.max(175 * feeRates.minimumFee, 60 * (feeRates.hourFee + feeRates.economyFee))
      const network =
        walletState.network == 'livenet'
          ? networks.bitcoin
          : walletState.network == 'devnet'
          ? networks.regtest
          : networks.testnet

      // build transaction
      const psbt = new Psbt({ network })
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: addressParams.blocks,
        witnessUtxo: {
          script: p2wsh.script,
          value: BigInt(utxo.value)
        },
        witnessScript: p2wsh.witnessScript
      })
      psbt.addOutput({
        address: walletState.address!,
        value: BigInt(utxo.value - fee)
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
          finalScriptSig: bytes('utf8', ''),
          finalScriptWitness
        }
      }

      return walletState
        .connector!.signPsbt(psbt.toHex(), {
          autoFinalized: false, // we need to finalize the input manually later
          toSignInputs: [{ index: 0, publicKey: this.publicKey, disableTweakSigner: true }]
        })
        .then((psbtHex) => Psbt.fromHex(psbtHex, { network }).finalizeInput(0, finalizeInput).toHex())
        .then((txHex) => (console.log(txHex), txHex))
        .then((txHex) => walletState.connector!.pushPsbt(txHex))
        .then((txid) => {
          console.log('unlock transaction:', txid)
          //  update locked amount on server
          fetch('/api/updateAmount', {
            method: 'POST',
            body: JSON.stringify({
              address: this.address,
              publicKey: this.publicKey,
              blocks: this.lockingBlocks,
              ca: this.ca,
              network: walletState.network
            })
          })
            .then(ensureSuccess)
            .catch(console.warn)
          this.updateLockDetails()
          toastImportant(
            `Successfully unlocked ${utxo.value} BTC to <span class="font-mono break-all">${walletState.address}</span>`
          )
        })
        .catch((e) => {
          if (e?.message.includes('non-BIP68-final')) toast(new Error(`${e.message}, timelock not passed`))
          else toast(e)
        })
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'meme-dialog': MemeDialog
  }
}
