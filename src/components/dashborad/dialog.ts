import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/divider/divider.js'
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js'
import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import { consume } from '@lit/context'
import { walletContext, walletState } from '../../lib/walletState'
import style from '/src/base.css?inline'
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import { getJson } from '../../../lib/fetch'
import { toastImportantError } from '../toast'
import { when } from 'lit/directives/when.js'
import { map } from 'lit/directives/map.js'
import './token.js'
import { getLockCaAddress } from '../../../lib/lockAddress'

@customElement('dashboard-dialog')
export class DashboardDialog extends LitElement {
  static styles = [unsafeCSS(style)]

  private dialog = createRef<SlDialog>()
  @state()
  private coinsSupported?: { ca: string; amount: number }[]

  @consume({ context: walletContext.address, subscribe: true })
  @state()
  readonly address?: string
  @state() lockingBlocks = 10

  private fetching?: Promise<any>

  show() {
    this.dialog.value?.show()
    if (this.fetching) return
    this.coinsSupported = undefined
    this.fetching = Promise.all([
      walletState.getPublicKey(),
      walletState.getNetwork(),
      fetch(`/api/tokensSupported?address=${this.address}`).then(getJson)
    ])
      .then(([publicKey, network, tokens]) =>
        tokens.map((token: any) =>
          fetch(
            `/api/lockedAmount?address=${token}&lock_address=${getLockCaAddress(
              publicKey,
              token!,
              this.lockingBlocks,
              network
            )}&network=${network}`
          )
            .then(getJson)
            .then((lockedAmount) => {
              const amount = lockedAmount.confirmed + lockedAmount.unconfirmed
              if (amount > 0) this.coinsSupported = [...(this.coinsSupported ?? []), { ca: token, amount }]
            })
            .catch(console.warn)
        )
      )
      .then((promises) => Promise.all(promises))
      .then(() => {
        if (!this.coinsSupported) this.coinsSupported = []
      })
      .catch((e) => toastImportantError(e, 'Failed to get coins supported'))
      .finally(() => (this.fetching = undefined))
  }

  hide() {
    this.dialog.value?.hide()
  }

  render() {
    return html`
      <sl-dialog label="${this.address?.slice(0, 8) + '...' + this.address?.slice(-6)}" ${ref(this.dialog)}>
        <sl-tab-group class="-mt-8">
          <sl-tab slot="nav" panel="coins">Coins supported</sl-tab>
          <sl-tab-panel name="coins">
            <div class="grid gap-2">
              ${when(
                this.coinsSupported,
                (coinsSupported) =>
                  coinsSupported.length
                    ? map(coinsSupported, (coin) => html`<token-card ca=${coin.ca} amount=${coin.amount}></token-card>`)
                    : html`<div class="text-center">No coins supported yet</div>`,
                () => html`<sl-skeleton effect="pulse"></sl-skeleton>`
              )}
            </div>
          </sl-tab-panel>
        </sl-tab-group>
      </sl-dialog>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dashboard-dialog': DashboardDialog
  }
}
