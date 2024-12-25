import { LitElement, html, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'
import baseStyle from './base.css?inline'
import style from './main.css?inline'
import './global.css'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/themes/dark.css'
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'

setBasePath(import.meta.env.MODE === 'development' ? 'node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-index')
export class AppIndex extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]

  render() {
    return html`
      <main class="flex flex-col gap-10 justify-center h-dvh bg-[#333536]">
        <div class="flex flex-col items-center w-full">
          <img src="/favicon.svg" alt="NoCap.Tips" class="w-40 h-40" />
        </div>
      </main>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-index': AppIndex
  }
}
