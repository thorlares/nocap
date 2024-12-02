import { customElement } from 'lit/decorators.js'
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
import '../../src/components/connect.ts'
import { toastError } from '../../src/components/toast'
import { SlInput, SlButton } from '@shoelace-style/shoelace'
import { createRef, ref } from 'lit/directives/ref.js'
import { inscribe } from '../../src/lib/inscribe.js'
import { waitForTx } from '../../src/lib/waitForTx.js'
import './components/brc20-lock'
import { Brc20Lock } from './components/brc20-lock'

setBasePath(import.meta.env.MODE === 'development' ? '../node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('brc20-main')
export class AppMain extends LitElement {
  static styles = [unsafeCSS(baseStyle)]
  private inputTick = createRef<SlInput>()
  private brc20Lock = createRef<Brc20Lock>()

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
                    @click=${(ev: Event) => {
                      if (!this.inputTick.value!.value) {
                        this.inputTick.value!.focus()
                        return toastError('Tick is required')
                      }
                      const button = ev.target as SlButton
                      button.disabled = button.loading = true
                      inscribe({ p: 'brc-20', op: 'mint', tick: this.inputTick.value!.value, amt: '1000' })
                        .then(waitForTx)
                        .then(() => this.brc20Lock.value?.updateBalances())
                        .finally(() => (button.disabled = button.loading = false))
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
                <brc20-lock ${ref(this.brc20Lock)}></brc20-lock>
              </sl-tab-panel>
            </sl-tab-group>
          </div>
        </div>
      </main>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'brc20-main': AppMain
  }
}
