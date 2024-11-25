import { State, property, storage } from '@lit-app/state'
import { Balance, Network, Wallet, WalletType } from './wallets'
import { UniSat } from './wallets/unisat'
import { OKX } from './wallets/okx'
import { Leather } from './wallets/leather'
import { WalletStandard } from './wallets/walletStandard'
import { getJson } from '../../lib/fetch'
import { mempoolApiUrl } from '../../lib/utils'
import { ContextProvider, createContext } from '@lit/context'

export { StateController, type Unsubscribe } from '@lit-app/state'

/**
 * Contexts consumable.
 * @see https://lit.dev/docs/data/context/#example
 */
export const walletContext = {
  address: createContext<string>('address'),
  publicKey: createContext<string>('publicKey'),
  network: createContext<string>('network'),
  height: createContext<number>('height')
}

class WalletState extends State {
  /** type of last connected wallet, subscribe with `wallet` */
  @storage({ key: 'wallet' }) @property() wallet?: WalletType
  /** cache on going updates */
  private promises: Record<string, Promise<any>> = {}

  public mempoolApiUrl(path: string): string {
    return mempoolApiUrl(path, this._network)
  }
  public get mempoolUrl(): string {
    if (this._network == 'devnet') return 'http://localhost:8083'
    return 'https://mempool.space' + (this._network != 'livenet' ? `/${this._network}` : '')
  }

  // ---- address ----
  private addressProvider = new ContextProvider(document.body, { context: walletContext.address })
  @property({ skipReset: true }) private _address?: string
  /** connected address, subscribe with `_address` */
  public get address(): string | undefined {
    if (!this._address) this.updateAddress()
    return this._address
  }
  public async getAddress() {
    return this._address ?? this.updateAddress()
  }

  public async updateAddress(): Promise<string> {
    return (this.promises['address'] ??= this.getConnector()
      .then((connector) => connector.accounts)
      .then((accounts) => (this.addressProvider.setValue(accounts[0]), (this._address = accounts[0])))
      .finally(() => delete this.promises['address']))
  }

  protected onAccountChanged = (accounts: string[]) => {
    this.reset(false)
    if (accounts) {
      this._address = accounts[0]
      this.addressProvider.setValue(accounts[0])
      this.publicKeyProvider.setValue('')
      this.updatePublicKey()
    } else {
      this.addressProvider.setValue('')
      this.publicKeyProvider.setValue('')
    }
  }

  // ---- network ----
  private networkProvider = new ContextProvider(document.body, { context: walletContext.network })
  @property() private _network?: Network
  /** connected network, subscribe with `_network` */
  public get network(): Network | undefined {
    if (this._network) return this._network
    this.updateNetwork()
  }
  public async getNetwork() {
    return this._network ?? this.updateNetwork()
  }

  public async updateNetwork(): Promise<Network> {
    return (this.promises['network'] ??= this.getConnector()
      .then((connector) => connector.network)
      .then((network) => (this.networkProvider.setValue(network), (this._network = network)))
      .finally(() => delete this.promises['network']))
  }
  public switchNetwork(network: Network) {
    this.connector?.switchNetwork(network)
    this.updateNetwork()
  }

  // ---- public key ----
  private publicKeyProvider = new ContextProvider(document.body, { context: walletContext.publicKey })
  @property() private _publicKey?: string
  /** connected public key, subscribe with `_publicKey` */
  public get publicKey(): string | undefined {
    if (this._publicKey) return this._publicKey
    this.updatePublicKey()
  }
  public async getPublicKey() {
    return this._publicKey ?? this.updatePublicKey()
  }

  public async updatePublicKey(): Promise<string> {
    return (this.promises['publicKey'] ??= this.getConnector()
      .then((connector) => connector.publicKey)
      .then((pubKey) => (this.publicKeyProvider.setValue(pubKey), (this._publicKey = pubKey)))
      .finally(() => delete this.promises['publicKey']))
  }

  // ---- balance ----
  @property({ type: Object }) private _balance?: Balance
  /** wallet balance, subscribe with `_balance` */
  public get balance(): Balance | undefined {
    if (this._balance) return this._balance
    this.updateBalance().catch(console.debug)
  }

  public async getBalance() {
    return this._balance ?? this.updateBalance()
  }

  public async updateBalance(): Promise<Balance> {
    return (this.promises['balance'] ??= this.getConnector()
      .then((connector) => connector.balance)
      .then((balance) => {
        console.log('update balance:', JSON.stringify(balance))
        this._balance = balance
        return balance
      })
      .finally(() => delete this.promises['balance']))
  }

  // ---- height ----
  private heightProvider = new ContextProvider(document.body, { context: walletContext.height })
  @property({ type: Object }) private _height?: number
  /** block height, subscribe with `_height` */
  public get height(): number | undefined {
    if (this._height) return this._height
    this.updateHeight().catch(console.debug)
  }

  public async updateHeight(): Promise<number> {
    return (this.promises['height'] ??= fetch(this.mempoolApiUrl('/api/blocks/tip/height'))
      .then(getJson)
      .then((height) => (this.heightProvider.setValue(height), (this._height = height)))
      .finally(() => delete this.promises['height']))
  }

  // --- wallet connector ----
  private _connector?: Wallet
  get connector(): Wallet | undefined {
    if (!this._connector && this.wallet) this.useWallet(this.wallet)

    return this._connector
  }
  /** Get an available connector, will wait until one is ready */
  public async getConnector(): Promise<Wallet> {
    return (
      this.connector ??
      (this.promises['connector'] ??= new Promise<Wallet>((resolve) => {
        this.subscribe((_, v) => {
          if (v) {
            resolve(v)
            delete this.promises['connector']
          }
        }, '_connector')
      }))
    )
  }

  useWallet(type: WalletType) {
    if (this._connector) this.reset()
    switch (type) {
      case 'unisat':
        this._connector = new UniSat()
        break
      case 'okx':
        this._connector = new OKX()
        break
      case 'leather':
        this._connector = new Leather()
        break
      default:
        this._connector = new WalletStandard(type)
        if (!this._connector) throw new Error(`unsupported wallet type: ${type}`)
    }
    if (this._connector.installed) this._connector.on('accountsChanged', this.onAccountChanged)
  }

  reset(resetConnectorAndAddress = true): void {
    super.reset()
    ;[...this.propertyMap]
      // @ts-ignore
      .filter(([key, definition]) => definition.skipReset !== true && definition.resetValue === undefined)
      .forEach(([key, definition]) => {
        ;(this as {} as { [key: string]: unknown })[key as string] = definition.resetValue
      })
    this.promises = {}
    if (resetConnectorAndAddress) {
      if (this._connector?.installed) this._connector.removeListener('accountsChanged', this.onAccountChanged)
      this._connector = undefined
      this._address = undefined
      this.addressProvider.setValue('')
      this.publicKeyProvider.setValue('')
    }
  }
}

/**
 * Properties in {@link WalletState} can be fetched via public `getter` and async
 * `getXXX`. Can also be forced to update via async `updateXXX`.
 * @see {@link walletContext} for subscribing
 */
export const walletState = new WalletState()
