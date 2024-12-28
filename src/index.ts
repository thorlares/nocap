import { LitElement, html, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'
import baseStyle from './base.css?inline'
import style from './index.css?inline'
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
      <main class="flex flex-col justify-between items-center h-dvh text-sm text-neutral-400 whitespace-nowrap">
        <span></span>
        <span></span>
        <span class="ml-[calc(50vw)]"
          >दूसरों की मदद करने और इस तेजी बाज़ार का आनंद लेने के लिए अपने MEME का उपयोग करें</span
        >
        <span class="-ml-[calc(80vw)]">Une nouvelle piste pour les protocoles et scénarios de niveau billion</span>
        <span class="ml-[calc(40vw)]">Ngày càng có nhiều người dùng trở thành người nắm giữ MEME coin</span>
        <span class="ml-[calc(55vw)]">手を使って他の人の成長を助ける</span>
        <span class="-ml-[calc(40vw)]"
          >Αφήστε τα token που κρατάτε να παράγουν μεγαλύτερη αξία αντί να κοιμούνται στο πορτοφόλι σας</span
        >
        <span class="ml-[calc(65vw)]">سيكون هذا سوقًا صاعدة للغاية، وهذا عصر جديد</span>
        <span class="-ml-[calc(55vw)]">Новый трек для протоколов и сценариев уровня триллион</span>
        <span class="ml-[calc(45vw)]">Use seu MEME para ajudar outras pessoas em vez de dormir na sua carteira</span>
        <span class="text-4xl text-white font-light py-[calc(6vh)]" style="font-family: 'Jura', monospace;"
          >Deposit coins to get interest, lock coins to get airdrops</span
        >
        <span class="-ml-[calc(45vw)]">مسار جديد للبروتوكولات والسيناريوهات على مستوى تريليون</span>
        <span class="ml-[calc(45vw)]">Att hålla MEME kommer också att tjäna ränta och kontrollera investeringar</span>
        <span class="-ml-[calc(65vw)]">持有 MEME 也获得利息和控投</span>
        <span class="ml-[calc(45vw)]">Rättvis lansering ger dig fler möjligheter och rikedom</span>
        <span class="-ml-[calc(45vw)]"
          >ཁྱེད་རང་གི་དངུལ་ཁུག་ནང་ཉལ་བའི་ཚབ་ཏུ་གཞན་ལ་རོགས་རམ་བྱེད་པར་ཁྱེད་རང་གི་MEMEབེད་སྤྱོད་བྱོས།</span
        >
        <span class="ml-[calc(60vw)]">새로운 시대가 곧 올 것이다. 우리는 가고 있다</span>
        <span class="ml-[calc(45vw)]"
          >ତୁମେ ଧରିଥିବା ଟୋକେନ୍ ଗୁଡିକ ତୁମର ୱାଲେଟରେ ଶୋଇବା ପରିବର୍ତ୍ତେ ଅଧିକ ମୂଲ୍ୟ ସୃଷ୍ଟି କରିବାକୁ ଦିଅ |</span
        >
        <span class="-ml-[calc(65vw)]"
          >अन्येषां साहाय्यार्थं, स्वस्य प्राप्त्यर्थं, अस्य वृषभविपण्यस्य आनन्दं च प्राप्तुं स्वस्य NFT इत्यस्य उपयोगं
          कुर्वन्तु</span
        >
        <span></span>
        <span></span>
      </main>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-index': AppIndex
  }
}
