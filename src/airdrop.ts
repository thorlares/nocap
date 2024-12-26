import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import baseStyle from './base.css?inline'
import style from './airdrop.css?inline'
import './global.css'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/themes/dark.css'
import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js'
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'
import { when } from 'lit/directives/when.js'
import { getJson } from '../lib/fetch'
import { createAppKit } from '@reown/appkit'
import { mainnet, solana } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createSIWE } from './lib/siweUtils'
import { getAddressFromMessage, getChainIdFromMessage, verifySignature } from '@reown/appkit-siwe'
import { map } from 'lit/directives/map.js'
import { OKXUniversalConnectUI } from '@okxconnect/ui'

setBasePath(import.meta.env.MODE === 'development' ? '/node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-airdrop')
export class AppAirdrop extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]
  @state() private auth: any
  @state() private addresses: any

  private universalUi: any

  connectedCallback(): void {
    super.connectedCallback()
    this.loadAuth()
    this.initWalletConnect()
  }

  private initWalletConnect() {
    OKXUniversalConnectUI.init({
      dappMetaData: { name: 'NoCap.Tips', icon: `${import.meta.env.VITE_BASE_PATH}/apple-touch-icon.png` }
    }).then((ui) => (this.universalUi = ui))

    const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

    const networks = [mainnet, solana]

    const wagmiAdapter = new WagmiAdapter({
      projectId,
      networks
    })
    console.log(import.meta.env.VITE_BASE_PATH)
    const metadata = {
      name: 'NoCap.Tips',
      description: 'nocap.tips',
      url: import.meta.env.VITE_BASE_PATH, // origin must match your domain & subdomain
      icons: ['https://nocap.tips/favicon.svg']
    }

    const siweConfig = createSIWE(
      async () => ({
        domain: 'nocap.tips',
        uri: window.location.origin,
        statement: `And connect with X account @${this.auth.screenName}`,
        chains: [1]
      }),
      async ({ message, signature }) => {
        const address = getAddressFromMessage(message)
        let chainId = getChainIdFromMessage(message)

        const isValid = await verifySignature({
          address,
          message,
          signature,
          chainId,
          projectId
        })

        if (!isValid) return false
        this.addresses = [...this.addresses, address]
        return true
      }
    )

    createAppKit({
      adapters: [wagmiAdapter],
      networks: [mainnet, solana],
      metadata,
      projectId,
      enableWalletGuide: false,
      features: { email: false, socials: false },
      siweConfig
    })
  }

  private loadAuth() {
    const tg = (globalThis as any).Telegram?.WebApp?.initData
    fetch('/api/airdrop?action=auth', tg ? { method: 'POST', body: tg } : undefined)
      .then(getJson)
      .then((data) => {
        this.auth = data
        if (this.auth.userId && this.auth.screenName) this.loadAddresses()
      })
      .catch((error) => {
        console.error(error)
        this.auth = { error }
      })
  }

  private loadAddresses() {}

  render() {
    return html`
      <main class="flex flex-col justify-center h-dvh bg-[#333536]">
        <div class="flex flex-col gap-4 self-center max-w-96 px-2">
          <img src="/favicon.svg" alt="NoCap.Tips" class="w-40 h-40 self-center" />
          <div class="flex gap-2">
            <span class="text-2xl min-w-6">💰</span>
            Get your reward by holding your coins! Let's go big! No Cap!
          </div>
          <div class="flex gap-2 items-center">
            <sl-icon name="telegram" class="pt-0"></sl-icon>
            ${when(
              this.auth,
              (auth) => {
                if (auth.error) return html`<span class="text-red-400">Failed to request user info.</span>`
                if (auth.tg?.id && auth.tg?.username) return `@${auth.tg.username}`
                return html`<sl-button
                  variant="primary"
                  href="https://t.me/NoCapTipsBot"
                  target="_self"
                  size="small"
                  pill
                  outline
                  >Connect</sl-button
                >`
              },
              () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded"></div>`
            )}
            <!-- <sl-icon name="twitter-x" class="pt-0"></sl-icon>
            ${when(
              this.auth,
              (auth) => {
                if (auth.error) return html`<span class="text-red-400">Failed to request user info.</span>`
                if (auth.x?.userId && auth.x?.screenName) return `@${auth.x.screenName}`
                return html`<sl-button
                  variant="primary"
                  href="/api/airdrop?action=authx"
                  target="_self"
                  size="small"
                  pill
                  outline
                  >Connect</sl-button
                >`
              },
              () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded"></div>`
            )} -->
          </div>
          <div class="flex gap-2 items-center">
            <sl-icon name="wallet"></sl-icon>
            <div>
              ${when(
                this.addresses,
                (addresses) => html`
                  <ul>
                    ${map(addresses, (address) => html`<li>${address}</li>`)}
                  </ul>
                `
              )}
              ${when(
                this.auth,
                (auth) => {
                  if (!auth.x && !auth.tg) return 'Connect your telegram or X account to continue'
                  return html`<sl-button
                      variant="primary"
                      size="small"
                      pill
                      outline
                      @click=${() => this.universalUi.openModal()}
                      >Connect</sl-button
                    >
                    <appkit-connect-button size="sm"></appkit-connect-button>`
                },
                () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded"></div>`
              )}
            </div>
          </div>
        </div>
      </main>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-airdrop': AppAirdrop
  }
}
