import { Inscription, Network, SignPsbtOptions, Wallet, WalletEvent } from '.'

const networks: Record<string, Network> = {
  BITCOIN_MAINNET: 'livenet',
  BITCOIN_TESTNET: 'testnet',
  BITCOIN_TESTNET4: 'testnet4',
  BITCOIN_SIGNET: 'signet'
}

export class UniSat implements Wallet {
  protected get instance() {
    return (window as any).unisat
  }

  get installed() {
    return typeof this.instance !== 'undefined'
  }

  get network() {
    if (!this.instance.getChain) return this.instance.getNetwork()
    return this.instance.getChain().then((result: any) => networks[result?.enum ?? 'BITCOIN_MAINNET'])
  }

  switchNetwork(network: Network): Promise<void> {
    if (!this.instance.switchChain) return this.instance.switchNetwork(network)
    const key = Object.keys(networks).find((key) => networks[key] === network)
    if (!key) return Promise.reject(new Error(`Network ${network} not supported`))
    return this.instance.switchChain(key)
  }

  get accounts() {
    return this.instance.getAccounts()
  }

  requestAccounts() {
    return this.instance.requestAccounts()
  }

  get publicKey() {
    return this.instance.getPublicKey()
  }

  get balance() {
    return this.instance.getBalance()
  }

  on(event: WalletEvent, handler: (accounts: Array<string>) => void) {
    this.instance.on(event, handler)
  }

  removeListener(event: WalletEvent, handler: (accounts: Array<string>) => void) {
    this.instance.removeListener(event, handler)
  }

  sendBitcoin(toAddress: string, satoshis: number, options?: { feeRate: number }): Promise<string> {
    return this.instance.sendBitcoin(toAddress, satoshis, options)
  }

  getInscriptions(cursor?: number, size?: number): Promise<{ total: number; list: Inscription[] }> {
    return this.instance.getInscriptions(cursor, size)
  }

  sendInscription(toAddress: string, inscriptionId: string, options?: { feeRate: number }): Promise<string> {
    return this.instance.sendInscription(toAddress, inscriptionId, options)
  }

  signPsbt(psbtHex: string, options?: SignPsbtOptions): Promise<string> {
    return this.instance.signPsbt(psbtHex, options)
  }

  signPsbts(psbtHexs: string[], options?: SignPsbtOptions): Promise<string[]> {
    return this.instance.signPsbts(psbtHexs, options)
  }

  pushPsbt(psbtHex: string): Promise<string> {
    return this.instance.pushPsbt(psbtHex)
  }

  signMessage(message: string): Promise<string> {
    return this.instance.signMessage(message, 'bip322-simple')
  }
}
