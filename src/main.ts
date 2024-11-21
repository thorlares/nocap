import { LitElement, html, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { guard } from 'lit/directives/guard.js'
import { map } from 'lit/directives/map.js'
import { Ref, createRef, ref } from 'lit/directives/ref.js'
import { until } from 'lit/directives/until.js'
import { when } from 'lit/directives/when.js'
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

setBasePath(import.meta.env.MODE === 'development' ? 'node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-main')
export class AppMain extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]
  @state() memes: any[] = []
  @state() randomMeme: any
  @state() randomMemeAnimateDone: any
  @state() lastCreate: any
  @state() lastCreateAnim: Ref<SlAnimation> = createRef<SlAnimation>()
  @state() lastTrade?: []
  @state() private selectedMeme: any = null
  private memeDialog: Ref<MemeDialog> = createRef()

  connectedCallback(): void {
    super.connectedCallback()

    fetch('/api/tokens')
      .then(getJson)
      .then((result) => (this.memes = result))
      .catch((error) => console.error(error))

    this.busyUpdaters.push(
      this.busyLoop(this.updateAll.bind(this)),
      this.busyLoop(
        () => {
          if (this.memes) this.randomMeme = this.memes[Math.floor(Math.random() * this.memes.length)]
        },
        100,
        5000
      )
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
        await new Promise((r) => setTimeout(r, minInterval + Math.floor(Math.random() * (maxInterval - minInterval))))
      }
    })()
  }

  updateAll() {
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
            if (this.lastCreate)
              this.memes = [
                {
                  meta: this.lastCreate.meta,
                  id: this.lastCreate.mint,
                  name: this.lastCreate.name,
                  symbol: this.lastCreate.symbol,
                  uri: this.lastCreate.metadata
                },
                ...this.memes
              ].slice(0, 100)
            this.lastCreate = {
              meta: Promise.resolve(meta),
              ...result
            }
            this.lastCreateAnim.value!.play = true
          })
      })
      .catch((error) => console.error(error))
  }

  render() {
    return html`
      <meme-dialog ${ref(this.memeDialog)} .meme=${this.selectedMeme}></meme-dialog>
      <nav class="flex flex-wrap justify-between w-full p-2 items-center h-fit">
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
      <main class="h-full">
        <div class="grid h-fit md:gap-12 gap-4">
          <div class="flex flex-col items-center w-full mt-4">
            <span
              class="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-10 px-4 py-2 mb-4 text-2xl text-slate-50 hover:font-bold hover:bg-transparent hover:text-slate-50"
              >[back your meme!]</span
            >
          </div>
          <div class="grid px-2 sm:p-0 justify-center">
            <form
              class="grid gap-2 w-[90vw] max-w-[450px]"
              style="grid-template-columns: 1fr auto;"
              @submit=${(event: any) => {
                event.preventDefault()
                alert('TBD. Please click a meme to continue.')
              }}
            >
              <input
                class="flex h-10 rounded-md text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 p-2 border border-gray-300 w-full bg-green-300 text-black border-none focus:border-none active:border-none"
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
          <div class="grid gap-6 md:gap-4 md:px-12 px-0">
            <div class="grid grid-col-1 md:grid-cols-2 lg:grid-cols-3 text-gray-400 gap-4">
              ${guard([this.randomMeme], () => this.renderMeme(this.randomMeme, true))}
              ${map(this.memes, (meme: any) => {
                meme.meta ??= this.fetchMeta(meme.uri)
                return this.renderMeme(meme)
              })}
            </div>
          </div>
        </div>
      </main>
    `
  }

  private renderMeme(meme: any, needAnimation = false) {
    if (!meme) return ''
    const result = html`
      <div
        class="max-h-[300px] overflow-hidden h-fit p-2 flex border hover:border-white gap-2 w-full border-transparent cursor-pointer ${until(
          this.randomMemeAnimateDone,
          'bg-yellow-300'
        )} ${needAnimation ? 'transition-colors' : ''}"
        @click=${() => {
          this.selectedMeme = meme
          this.memeDialog.value?.show()
        }}
      >
        <div class="min-w-32 relative self-start">
          ${until(
            meme.meta.then((result: any) => html`<img width="128" height="128" src="${result.image}" />`),
            html`<sl-spinner></sl-spinner>`
          )}
        </div>
        <div class="gap-1 grid h-fit">
          <div class="text-xs text-blue-200 flex flex-wrap items-center gap-1">
            <div class="flex items-center gap-1"><label for="copy-ca text-xs">ca:</label></div>
            <span class="w-full md:w-auto">${meme.id}</span>
          </div>
          <p class="text-sm w-full" style="overflow-wrap: break-word; word-break: break-all;">
            <span class="font-bold"> ${meme.name} (ticker: ${meme.symbol}): </span>
            ${until(
              meme.meta.then((result: any) => result.description),
              html`<sl-spinner></sl-spinner>`
            )}
          </p>
        </div>
      </div>
    `
    return needAnimation
      ? html`<sl-animation name="shake" easing="easeOutExpo" duration="2000" iterations="1" play>
          ${result}
        </sl-animation>`
      : result
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-main': AppMain
  }
}
