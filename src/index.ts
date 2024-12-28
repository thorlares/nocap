import { LitElement, html, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'
import baseStyle from './base.css?inline'
import style from './index.css?inline'
import './global.css'
import '@shoelace-style/shoelace/dist/themes/light.css'
import '@shoelace-style/shoelace/dist/themes/dark.css'
import '@shoelace-style/shoelace/dist/components/button/button'
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button'
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'

setBasePath(import.meta.env.MODE === 'development' ? 'node_modules/@shoelace-style/shoelace/dist' : '/')

@customElement('app-index')
export class AppIndex extends LitElement {
  static styles = [unsafeCSS(baseStyle), unsafeCSS(style)]

  render() {
    return html`
      <header class="absolute gap-16 flex w-full items-center">
        <img src="/nocaps.svg" alt="NoCap.Tips" class="w-48 h-48" />
        <sl-icon-button
          name="telegram"
          class="pb-4 text-5xl [&::part(base)]:text-white [&::part(base)]:hover:text-gray-400"
          href="https://t.me/NoCapTipsBot"
        ></sl-icon-button>
        <sl-icon-button
          name="twitter-x"
          class="pb-4 text-5xl [&::part(base)]:text-white [&::part(base)]:hover:text-gray-400"
          href="https://x.com/NocapGogo"
        ></sl-icon-button>
      </header>
      <main class="absolute flex flex-col justify-center items-center h-dvh w-full">
        <span class="text-5xl text-white w-fit text-center leading-tight" style="font-family: 'Jura', monospace;"
          >Earn with Holding!<br />Airdrop with Locking!<br /><sl-button
            class="w-full earn text-2xl"
            href="https://t.me/NoCapTipsBot"
            >EARNING/AIRDROP</sl-button
          ></span
        >
      </main>
      <div class="slide flex flex-col justify-between h-dvh text-sm text-neutral-400 whitespace-nowrap">
        <span></span>
        <span></span>
        <span class="text-amber-100" style="animation-delay: -7.5s;"
          >दूसरों की मदद करने और इस तेजी बाज़ार का आनंद लेने के लिए अपने MEME का उपयोग करें</span
        >
        <span class="text-[#e9c34b] mt-10" style="animation-duration: 12s;"
          >Une nouvelle piste pour les protocoles et scénarios de niveau billion</span
        >
        <span class="text-[#abc2f1]" style="animation-delay: -6s;"
          >Ngày càng có nhiều người dùng trở thành người nắm giữ MEME coin</span
        >
        <span class="text-[#edcdcd] mt-4" style="animation-delay: -7.7s;">手を使って他の人の成長を助ける</span>
        <span class="text-[#f1fe5e]" style="animation-delay: -1s; animation-duration: 6s;"
          >Αφήστε τα token που κρατάτε να παράγουν μεγαλύτερη αξία αντί να κοιμούνται στο πορτοφόλι σας</span
        >
        <span class="text-[#7da8d9]" style="animation-delay: -6.5s;"
          >Use seu MEME para ajudar outras pessoas em vez de dormir na sua carteira</span
        >
        <span class="text-[#e938fa]" style="animation-delay: -0.5s;"
          >Новый трек для протоколов и сценариев уровня триллион</span
        >
        <span class="text-[#e9c34b]" style="animation-delay: -7.9s; animation-duration: 7s;"
          >سيكون هذا سوقًا صاعدة للغاية، وهذا عصر جديد</span
        >
        <span class="text-[#8b7ec0] mt-48" style="animation-delay: -3s;"
          >مسار جديد للبروتوكولات والسيناريوهات على مستوى تريليون</span
        >
        <span class="text-[#cda8bd]" style="animation-delay: -6.5s;"
          >Att hålla MEME kommer också att tjäna ränta och kontrollera investeringar</span
        >
        <span class="text-[#fae5a0]" style="animation-delay: -1s;">持有 MEME 也获得利息和控投</span>
        <span class="text-[#cf826f]" style="animation-delay: -6.7s; animation-duration: 11s;"
          >Rättvis lansering ger dig fler möjligheter och rikedom</span
        >
        <span class="text-[#b7b7b7]" style="animation-delay: -2s;"
          >ཁྱེད་རང་གི་དངུལ་ཁུག་ནང་ཉལ་བའི་ཚབ་ཏུ་གཞན་ལ་རོགས་རམ་བྱེད་པར་ཁྱེད་རང་གི་MEMEབེད་སྤྱོད་བྱོས།</span
        >
        <span class="text-[#497468]" style="animation-delay: -7.8s;">새로운 시대가 곧 올 것이다. 우리는 가고 있다</span>
        <span class="text-[#79fb40]" style="animation-delay: -6s; animation-duration: 6s;"
          >ତୁମେ ଧରିଥିବା ଟୋକେନ୍ ଗୁଡିକ ତୁମର ୱାଲେଟରେ ଶୋଇବା ପରିବର୍ତ୍ତେ ଅଧିକ ମୂଲ୍ୟ ସୃଷ୍ଟି କରିବାକୁ ଦିଅ |</span
        >
        <span class="text-[#f0913c]" style="animation-delay: -0.2s;"
          >अन्येषां साहाय्यार्थं, स्वस्य प्राप्त्यर्थं, अस्य वृषभविपण्यस्य आनन्दं च प्राप्तुं स्वस्य NFT इत्यस्य उपयोगं
          कुर्वन्तु</span
        >
        <span></span>
        <span></span>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-index': AppIndex
  }
}
