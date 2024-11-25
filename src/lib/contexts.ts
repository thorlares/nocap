import { ContextProvider, createContext } from '@lit/context'
export { walletContext } from './walletState'

export const mpcPubKey = createContext<string>('mpcPubKey')

const mpcPubKeyProvider = new ContextProvider(document.body, { context: mpcPubKey })

export function fetchMpcPubKey() {
  fetch('/api/mpcPubkey')
    .then((res) => res.text())
    .then((text) => mpcPubKeyProvider.setValue(text))
}
