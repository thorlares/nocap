import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { ref, createRef } from 'lit/directives/ref.js'
import baseStyle from './base.css?inline'
import style from './airdrop.css?inline'
import './global.css'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/themes/dark.css'
import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js'
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js'
import '@shoelace-style/shoelace/dist/components/tab/tab.js'
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js'
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js'
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'
import { when } from 'lit/directives/when.js'
import { getJson } from '../lib/fetch'
// import { createAppKit } from '@reown/appkit'
// import { mainnet, solana } from '@reown/appkit/networks'
// import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// import { createSIWE } from './lib/siweUtils'
// import { getAddressFromMessage, getChainIdFromMessage, verifySignature } from '@reown/appkit-siwe'
import { map } from 'lit/directives/map.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'
import { toastImportantError } from './components/toast'
import { OKXSolanaProvider } from '@okxconnect/solana-provider'
import { OKXUniversalConnectUI } from '@okxconnect/ui'
import { SlDialog } from '@shoelace-style/shoelace'

setBasePath(import.meta.env.MODE === 'development' ? '/node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-airdrop')
export class AppAirdrop extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]
  @state() private auth: any
  @state() private addressesEth: any
  @state() private connectedAddressEth: any
  @state() private addressesSol: any
  @state() private connectedAddressSol: any

  private universalUi: any
  private dialogSol = createRef<SlDialog>()

  connectedCallback(): void {
    super.connectedCallback()
    this.loadAuth()
    this.initWalletConnect()
  }

  private initWalletConnect() {
    OKXUniversalConnectUI.init({
      dappMetaData: { name: 'NoCap.Tips', icon: `${import.meta.env.VITE_BASE_PATH}/apple-touch-icon.png` },
      actionsConfiguration: {
        returnStrategy: 'tg://resolve',
        modals: 'all',
        tmaReturnUrl: 'back'
      }
    }).then((ui) => {
      this.universalUi = ui
      if (ui.connected()) ui.disconnect()
      ui.on('session_delete', () => (this.connectedAddressSol = this.connectedAddressEth = undefined))
    })

    // const projectId = import.meta.env.VITE_REOWN_PROJECT_ID

    // const networks = [mainnet, solana]

    // const wagmiAdapter = new WagmiAdapter({
    //   projectId,
    //   networks
    // })
    // console.log(import.meta.env.VITE_BASE_PATH)
    // const metadata = {
    //   name: 'NoCap.Tips',
    //   description: 'nocap.tips',
    //   url: import.meta.env.VITE_BASE_PATH, // origin must match your domain & subdomain
    //   icons: ['https://nocap.tips/favicon.svg']
    // }

    // const siweConfig = createSIWE(
    //   async () => ({
    //     domain: 'nocap.tips',
    //     uri: window.location.origin,
    //     statement: `And connect with X account @${this.auth.screenName}`,
    //     chains: [1]
    //   }),
    //   async ({ message, signature }) => {
    //     const address = getAddressFromMessage(message)
    //     let chainId = getChainIdFromMessage(message)

    //     const isValid = await verifySignature({
    //       address,
    //       message,
    //       signature,
    //       chainId,
    //       projectId
    //     })

    //     if (!isValid) return false
    //     this.addresses = [...this.addresses, address]
    //     return true
    //   }
    // )

    // createAppKit({
    //   adapters: [wagmiAdapter],
    //   networks: [mainnet, solana],
    //   metadata,
    //   projectId,
    //   enableWalletGuide: false,
    //   features: { email: false, socials: false },
    //   siweConfig
    // })
  }

  private loadAuth() {
    const tg = (globalThis as any).Telegram?.WebApp?.initData
    fetch('/api/airdrop?action=auth', tg ? { method: 'POST', body: tg } : undefined)
      .then(getJson)
      .then((data) => {
        this.auth = data
        this.addressesEth = data.addressesEth.map((d: any) => d.address)
        this.addressesSol = data.addressesSol.map((d: any) => d.address)
      })
      .catch((error) => {
        console.error(error)
        this.auth = { error }
      })
  }

  render() {
    return html`
      <main class="flex flex-col justify-center h-dvh bg-[#333536]">
        <div class="flex flex-col gap-4 self-center max-w-96 px-2 pb-10">
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
          <div class="flex gap-2">
            <sl-icon src="/ethereum.svg"></sl-icon>
            <div>
              ${when(
                this.addressesEth,
                (addresses) => {
                  if (addresses.length === 0) return html`<div>No address connected yet.</div>`
                  return html`
                    <ul>
                      ${map(
                        addresses,
                        (address: string) =>
                          html`<li>${address.substring(0, 8)}...${address.substring(address.length - 6)}</li>`
                      )}
                    </ul>
                  `
                },
                () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded my-2"></div>`
              )}
              ${when(
                this.connectedAddressEth,
                (address) => html`
                  ${address.substring(0, 8)}...${address.substring(address.length - 6)}
                  <sl-spinner class="text-xs ml-1"></sl-spinner>
                `
              )}
              ${when(
                this.auth,
                (auth) => {
                  if (!auth.x && !auth.tg) return 'Connect your telegram or X account to continue'
                  if (!this.connectedAddressEth)
                    return html`<sl-button
                      variant="primary"
                      size="small"
                      pill
                      outline
                      @click=${() => this.connectWalletEth()}
                      >Connect</sl-button
                    >`
                  return html`<sl-button
                    variant="primary"
                    size="small"
                    pill
                    outline
                    @click=${() => this.universalUi.disconnect()}
                    >Disconnect</sl-button
                  >`
                },
                () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded my-2"></div>`
              )}
            </div>
          </div>
          <div class="flex gap-2">
            <sl-icon src="/solana.svg"></sl-icon>
            <div>
              ${when(
                this.addressesSol,
                (addresses) => {
                  if (addresses.length === 0) return html`<div>No address connected yet.</div>`
                  return html`
                    <ul>
                      ${map(
                        addresses,
                        (address: string) =>
                          html`<li>${address.substring(0, 8)}...${address.substring(address.length - 6)}</li>`
                      )}
                    </ul>
                  `
                },
                () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded my-2"></div>`
              )}
              ${when(
                this.connectedAddressSol,
                (address) => html`
                  ${address.substring(0, 8)}...${address.substring(address.length - 6)}
                  <sl-spinner class="text-xs ml-1"></sl-spinner>
                `
              )}
              ${when(
                this.auth,
                (auth) => {
                  if (!auth.x && !auth.tg) return 'Connect your telegram or X account to continue'
                  if (!this.connectedAddressSol)
                    return html`<sl-button
                      variant="primary"
                      size="small"
                      pill
                      outline
                      @click=${() => this.connectWalletSol()}
                      >Connect</sl-button
                    >`
                  return html`<sl-button
                    variant="primary"
                    size="small"
                    pill
                    outline
                    @click=${() => this.universalUi.disconnect()}
                    >Disconnect</sl-button
                  >`
                },
                () => html`<div class="animate-pulse w-16 h-2 bg-slate-600 rounded my-2"></div>`
              )}
            </div>
          </div>
        </div>
      </main>
      <sl-dialog
        no-header
        @sl-request-close=${(event: CustomEvent) => {
          if (event.detail.source === 'overlay') event.preventDefault()
        }}
        ${ref(this.dialogSol)}
      >
        <div class="flex flex-col gap-4">
          <div>
            Please sign to verify your wallet address. This will link your wallet address with your Telegram account.
          </div>
          <div class="flex items-center gap-2">
            <sl-icon src="/solana.svg" class="w-6 h-6"></sl-icon>
            ${when(this.connectedAddressSol, (address) => html`<span class="font-mono break-all">${address}</span>`)}
          </div>
        </div>
        <sl-button slot="footer" variant="primary" @click=${() => this.verifyWalletSol()}> Verify </sl-button>
      </sl-dialog>
    `
  }

  private connectWalletSol() {
    console.log(this.universalUi)
    return this.universalUi
      .openModal({ namespaces: { solana: { chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'] } } })
      .then((arg: any) => (console.log(arg), arg))
      .then(({ namespaces }: any) => {
        this.dialogSol.value?.show()
        this.connectedAddressSol = namespaces['solana'].accounts[0].split(':')[2]
      })
  }

  private verifyWalletSol() {
    const expire = new Date(Date.now() + 10 * 60 * 1000)
    const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(8)))
    const message = `Sign this message to allow connecting your wallet address with telegram account @${
      this.auth.tg.username
    } on NoCap.Tips\n\nTelegram account: ${this.auth.tg.username}(${
      this.auth.tg.id
    })\nExpires At: ${expire.toISOString()}\nNonce: ${nonce}`
    return new OKXSolanaProvider(this.universalUi)
      .signMessage(message)
      .then((arg: any) => (console.log(arg), arg))
      .then(({ signature }) =>
        fetch('/api/airdrop?action=connectSol', {
          method: 'POST',
          body: JSON.stringify({
            address: this.connectedAddressSol,
            signature: bytesToHex(signature),
            expire: expire.getTime(),
            nonce
          })
        })
      )
      .then(getJson)
      .then((addresses) => {
        this.addressesSol = addresses.map((d: any) => d.address)
        this.connectedAddressSol = undefined
        this.universalUi.disconnect()
        this.dialogSol.value?.hide()
      })
      .catch((error) => {
        toastImportantError(error, 'Failed to connect wallet address')
      })
  }

  private connectWalletEth() {
    const expire = new Date(Date.now() + 10 * 60 * 1000)
    const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(8)))
    const message =
      '0x' +
      bytesToHex(
        utf8ToBytes(
          `Sign this message to allow connecting your wallet address with telegram account @${
            this.auth.tg.username
          } on NoCap.Tips\n\nTelegram account: ${this.auth.tg.username}(${
            this.auth.tg.id
          })\nExpires At: ${expire.toISOString()}\nNonce: ${nonce}`
        )
      )
    return this.universalUi
      .openModalAndSign({ namespaces: { eip155: { chains: ['eip155:1'] } } }, [
        {
          method: 'personal_sign',
          chainId: 'eip155:1',
          params: [message]
        }
      ])
      .then((arg: any) => (console.log(arg), arg))
      .then(({ namespaces, signResponse }: any) => {
        this.connectedAddressEth = namespaces['eip155'].accounts[0].split(':')[2]
        fetch('/api/airdrop?action=connectEth', {
          method: 'POST',
          body: JSON.stringify({
            address: this.connectedAddressEth,
            signature: signResponse[0].result,
            expire: expire.getTime(),
            nonce
          })
        })
          .then(getJson)
          .then((addresses) => {
            this.addressesEth = addresses.map((d: any) => d.address)
            this.connectedAddressEth = undefined
            this.universalUi.disconnect()
          })
          .catch((error) => {
            toastImportantError(error, 'Failed to connect wallet address')
          })
      })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-airdrop': AppAirdrop
  }
}
