import { ContextProvider, createContext } from '@lit/context'

export const publicKey = createContext<string>('publicKey')
export const mpcPubKey = createContext<string>('mpcPubKey')

const mpcPubKeyProvider = new ContextProvider(document.body, { context: mpcPubKey })

fetch('/api/mpcPubkey')
  .then((res) => res.text())
  .then((text) => mpcPubKeyProvider.setValue(text))
