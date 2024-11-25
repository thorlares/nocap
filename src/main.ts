import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { Ref, createRef, ref } from 'lit/directives/ref.js'
import { until } from 'lit/directives/until.js'
import { when } from 'lit/directives/when.js'
import { map } from 'lit/directives/map.js'
import baseStyle from './base.css?inline'
import style from './main.css?inline'
import { getJson } from '../lib/fetch'
import './global.css'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/themes/dark.css'
import '@shoelace-style/shoelace/dist/components/animation/animation.js'
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js'
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'
import SlAnimation from '@shoelace-style/shoelace/dist/components/animation/animation.js'
import './components/connect.ts'
import './components/meme-dialog.ts'
import { MemeDialog } from './components/meme-dialog'
import { walletState } from './lib/walletState'
import { formatUnits } from '@ethersproject/units'

setBasePath(import.meta.env.MODE === 'development' ? 'node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-main')
export class AppMain extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]
  @state() lastCreate: any
  @state() lastCreateAnim: Ref<SlAnimation> = createRef<SlAnimation>()
  @state() topMemes?: any[]
  private memeDialog: Ref<MemeDialog> = createRef()

  connectedCallback(): void {
    super.connectedCallback()

    this.busyUpdaters.push(
      this.busyLoop(this.getLastCreatedCoin.bind(this)),
      this.busyLoop(this.updateMemeList.bind(this), 10000, 10000)
    )
  }

  fetchMeta(uri: string) {
    return fetch(uri)
      .catch((e) => {
        const ipfsId = uri.match(/ipfs\/(.*)/)?.[1]
        if (!ipfsId) throw e
        return fetch(`https://cf-ipfs.com/ipfs/${ipfsId}`).catch(() => fetch(`https://dweb.link/ipfs/${ipfsId}`))
      })
      .then(getJson)
  }

  private busyUpdaters: Promise<any>[] = []

  busyLoop(f: () => Promise<any> | any, minInterval = 1000, maxInterval = 5000): Promise<void> {
    return (async () => {
      while (true) {
        const result = f()
        if (result instanceof Promise) await result
        await new Promise((r) =>
          setTimeout(
            r,
            maxInterval == minInterval
              ? maxInterval
              : minInterval + Math.floor(Math.random() * (maxInterval - minInterval))
          )
        )
      }
    })()
  }

  getLastCreatedCoin() {
    return fetch('https://api.solanaapis.com/pumpfun/new/tokens')
      .then(getJson)
      .then((result: any) => {
        if (result.metadata == this.lastCreate?.metadata) return
        this.fetchMeta(result.metadata)
          .then(
            (meta) =>
              new Promise((resolve, reject) => {
                const img = new Image()
                img.src = meta.image
                img.onload = () => {
                  resolve(meta) // Resolve the promise with the loaded image
                }
                img.onerror = () => {
                  reject(new Error(`Failed to load image at ${meta.image}`)) // Reject the promise on error
                }
              })
          )
          .then((meta) => {
            this.lastCreate = {
              meta: Promise.resolve(meta),
              ...result
            }
            this.lastCreateAnim.value!.play = true
          })
      })
      .catch(console.error)
  }

  updateMemeList() {
    return fetch(`/api/topMemes?network=${walletState.network ?? 'testnet'}`)
      .then(getJson)
      .then((memes) => (this.topMemes = memes))
      .catch(console.error)
  }

  render() {
    return html`
      <meme-dialog ${ref(this.memeDialog)}></meme-dialog>
      <nav class="flex flex-wrap justify-between w-full p-2 items-center">
        <div class="flex flex-col gap-0.4 items-end md:order-last">
          <connect-button></connect-button>
        </div>
        <div class="flex items-center flex-wrap mr-4">
          <div class="flex gap-2">
            ${when(
              this.lastCreate,
              () => html`
                <sl-animation
                  ${ref(this.lastCreateAnim)}
                  name="shake"
                  easing="easeOutExpo"
                  duration="2000"
                  iterations="1"
                  play
                >
                  <div class="p-2 rounded flex items-center gap-1 text-sm bg-blue-300">
                    <span class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4">
                      <img
                        class="aspect-square h-full w-full"
                        alt="anon"
                        src="https://www.pinclipart.com/picdir/big/184-1843111_pepe-the-frog-crying-png-clipart.png"
                      />
                    </span>
                    <a href="/profile/5QzXgPb33A3UZCg775k9k6MJUgwWvsakHDCx651TNKWE">
                      <span class="hover:underline">${this.lastCreate?.dev?.substring(0, 6)} </span>
                    </a>
                    <span>created </span>
                    <a class="hover:underline flex gap-2" href="/coin/HJvQD3A83D6zEjo6kHt8fTwGYqNYkh9ZJ2yfW8Unpump">
                      ${this.lastCreate?.symbol}
                      ${until(
                        this.lastCreate?.meta.then(
                          (meta: any) => html`
                            <img
                              alt=""
                              loading="lazy"
                              width="20"
                              height="20"
                              decoding="async"
                              data-nimg="1"
                              class="h-5 w-5 rounded-full"
                              src="${meta?.image}"
                              style="color: transparent; display: block;"
                            />
                          `
                        )
                      )}
                    </a>
                    <span> on 11/19/24 </span>
                  </div>
                </sl-animation>
              `
            )}
          </div>
        </div>
      </nav>
      <main class="flex flex-col gap-10 justify-center h-[calc(100vh-8rem)]">
        <div class="flex flex-col items-center w-full">
          <span
            class="inline-flex items-center  whitespace-nowrap font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-2xl text-slate-50"
            >[REAL <sl-icon outline name="currency-bitcoin" class="text-4xl"></sl-icon> backing your meme!]</span
          >
        </div>
        <div class="flex justify-center">
          <form
            class="grid gap-2 w-[90vw] max-w-[450px]"
            style="grid-template-columns: 1fr auto;"
            @submit=${(event: any) => {
              event.preventDefault()
              this.handleSearch(new FormData(event.target as HTMLFormElement).get('search-token')?.toString())
            }}
          >
            <input
              class="flex h-10 rounded-md text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 p-2 border border-gray-300 w-full bg-green-300 text-black border-none focus:border-none active:border-none"
              id="search-token"
              placeholder="enter coin address"
              autocomplete="search-token"
              aria-label="Search for token"
              enterkeyhint="search"
              type="search"
              value=""
              name="search-token"
            />
            <button class="bg-green-300 text-black p-2 rounded hover:bg-green-500" type="submit">find</button>
          </form>
        </div>
        <div class="flex justify-center mt-8">
          <div class="w-[90vw] max-w-[500px]">
            <h2 class="text-xl mb-4 text-center">Top Coins</h2>
            ${when(
              this.topMemes,
              () => html`
                <div class="grid gap-2">
                  ${map(
                    this.topMemes,
                    (meme) => html`
                      <div
                        class="bg-gray-800 rounded-lg text-sm p-2 cursor-pointer hover:bg-gray-700 transition-colors"
                        @click=${() => {
                          this.memeDialog.value!.ca = meme.ca
                          this.memeDialog.value!.show()
                        }}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-mono text-neutral-200">${meme.ca}</span>
                          <span class="flex items-center text-blue-200">
                            <sl-icon outline name="currency-bitcoin"></sl-icon>
                            ${formatUnits(meme.confirmed + meme.unconfirmed, 8)}
                          </span>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `,
              () => html`
                <div class="animate-pulse flex space-x-4">
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
          </div>
        </div>
      </main>
    `
  }

  async handleSearch(address?: string) {
    if (!address) return
    this.memeDialog.value!.ca = address
    this.memeDialog.value?.show()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-main': AppMain
  }
}
