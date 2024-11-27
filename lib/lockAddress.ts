import * as btc from '@scure/btc-signer'
import { hexToBytes } from '@noble/hashes/utils'
import { scriptLock, scriptLockV0 } from './scripts.js'
import { btcNetwork } from './network.js'
import type { Network } from './types.js'

export function getLockAddressV0(
  mpcPubKey: string,
  publicKey: string,
  ca: string,
  lockingBlocks: number,
  network: Network
) {
  return getLockP2WSHV0(mpcPubKey, publicKey, ca, lockingBlocks, network).address!
}

export function getLockP2WSHV0(
  mpcPubKey: string,
  publicKey: string,
  ca: string,
  lockingBlocks: number,
  network: Network
) {
  return btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLockV0(hexToBytes(mpcPubKey), hexToBytes(publicKey), ca, lockingBlocks)
    },
    btcNetwork(network)
  )
}

export function getLockAddress(publicKey: string, ca: string, lockingBlocks: number, network: Network) {
  return getLockP2WSH(publicKey, ca, lockingBlocks, network).address!
}

export function getLockP2WSH(publicKey: string, ca: string, lockingBlocks: number, network: Network) {
  return btc.p2wsh(
    // btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLock(hexToBytes(publicKey), ca, lockingBlocks)
    },
    btcNetwork(network)
  )
}
