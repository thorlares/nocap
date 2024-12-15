import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { formatUnits } from '@ethersproject/units'
import style from '/src/base.css?inline'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import { getJson } from '../../../lib/fetch'
import { when } from 'lit/directives/when.js'
import '../meme-dialog.ts'
import { MemeDialog } from '../meme-dialog'
import { createRef, ref, Ref } from 'lit/directives/ref.js'

@customElement('token-card')
export class TokenCard extends LitElement {
  static styles = [unsafeCSS(style)]
  @property() ca?: string
  @property() amount?: any
  @state() meta?: any
  private memeDialog: Ref<MemeDialog> = createRef()

  connectedCallback(): void {
    super.connectedCallback()
    fetch(`/api/token?address=${this.ca}`)
      .then(getJson)
      .then((meta) => (this.meta = meta))
  }

  render() {
    return html`
      <div
        class="bg-gray-800 rounded-lg text-sm p-2 cursor-pointer hover:bg-gray-700 transition-colors flex flex-col gap-1"
        @click=${() => {
          this.memeDialog.value!.ca = this.ca
          this.memeDialog.value!.meta = { id: this.ca, ...this.meta }
          this.memeDialog.value!.show()
        }}
      >
        <div class="flex gap-2">
          ${when(
            this.meta,
            (meta) => html`
              <img
                alt=""
                loading="lazy"
                width="20"
                height="20"
                decoding="async"
                data-nimg="1"
                class="h-5 w-5 rounded-full flex-none"
                src="${meta.image}"
                style="color: transparent; display: block;"
              />
              <span class="flex-1 text-neutral-200">${meta.name} (${meta.symbol})</span>
            `,
            () => html`
              <div class="animate-pulse w-5 h-5 bg-slate-600 rounded-full"></div>
              <div class="animate-pulse flex-1 bg-slate-600 rounded"></div>
            `
          )}

          <span class="flex items-center text-blue-200">
            <sl-icon outline name="currency-bitcoin"></sl-icon>
            ${when(
              !this.amount,
              () => html`<sl-skeleton effect="pulse" class="w-16 inline-block [&::part(base)]:min-h-2"></sl-skeleton>`,
              () => html`${formatUnits(this.amount, 8)}`
            )}
          </span>
        </div>
        <span class="font-mono text-neutral-400">${this.ca}</span>
      </div>
      <meme-dialog ${ref(this.memeDialog)}></meme-dialog>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'token-card': TokenCard
  }
}
