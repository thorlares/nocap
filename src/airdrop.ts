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

setBasePath(import.meta.env.MODE === 'development' ? '/node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-airdrop')
export class AppAirdrop extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]
  @state() private twitterAuth: any

  connectedCallback(): void {
    super.connectedCallback()
    this.loadTwitterAuth()

    // 1. Get a project ID at https://cloud.reown.com
    const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

    const networks = [mainnet, solana]

    // 2. Set up Wagmi adapter
    const wagmiAdapter = new WagmiAdapter({
      projectId,
      networks
    })

    // 3. Configure the metadata
    const metadata = {
      name: 'NoCap.Tips',
      description: 'nocap.tips',
      url: 'https://nocap.tips', // origin must match your domain & subdomain
      icons: ['https://nocap.tips/favicon.svg']
    }
    const siweConfig = createSIWE()

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

  private loadTwitterAuth() {
    fetch('/api/airdrop?action=auth')
      .then(getJson)
      .then((data) => (this.twitterAuth = data))
      .catch((error) => {
        console.error(error)
        this.twitterAuth = { error }
      })
  }

  render() {
    return html`
      <main class="flex flex-col justify-center h-dvh bg-[#333536]">
        <div class="flex flex-col gap-4 self-center w-96">
          <img src="/favicon.svg" alt="NoCap.Tips" class="w-40 h-40 self-center" />
          <div class="flex gap-2">
            <span class="text-2xl min-w-6">💰</span>
            Get your reward by holding your coins! Let's go big! No Cap!
          </div>
          <div class="flex gap-2 items-center">
            <sl-icon name="twitter-x" class="pt-0"></sl-icon>
            ${when(
              this.twitterAuth,
              (twitterAuth) => {
                if (twitterAuth.error) return html`<span class="text-red-400">Failed to request twitter API.</span>`
                if (twitterAuth.userId && twitterAuth.screenName) return `@${twitterAuth.screenName}`
                return html`<sl-button variant="primary" href="${twitterAuth.url}" target="_self" size="small" pill
                  >Connect</sl-button
                >`
              },
              () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded"></div>`
            )}
          </div>
          <div class="flex gap-2 items-center">
            <sl-icon name="wallet"></sl-icon>
            ${when(
              this.twitterAuth,
              (twitterAuth) => {
                if (twitterAuth.userId && twitterAuth.screenName)
                  return html`<appkit-connect-button></appkit-connect-button>`
                return 'Connect your X account to continue'
              },
              () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded"></div>`
            )}
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
