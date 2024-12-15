import * as btc from '@scure/btc-signer'
import { hexToBytes } from '@noble/hashes/utils'
import { scriptLockCa, scriptLockCaV0, scriptLock, scriptLockBrc20Ca } from './scripts.js'
import { btcNetwork } from './network.js'
import type { Network } from './types.js'

export function getLockAddress(publicKey: string, lockingBlocks: number, network: Network) {
  return getLockP2WSH(publicKey, lockingBlocks, network).address!
}

export function getLockP2WSH(publicKey: string, lockingBlocks: number, network: Network) {
  return btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLock(hexToBytes(publicKey), lockingBlocks)
    },
    btcNetwork(network)
  )
}

export function getLockCaAddressV0(
  mpcPubKey: string,
  publicKey: string,
  ca: string,
  lockingBlocks: number,
  network: Network
) {
  return getLockCaP2WSHV0(mpcPubKey, publicKey, ca, lockingBlocks, network).address!
}

export function getLockCaP2WSHV0(
  mpcPubKey: string,
  publicKey: string,
  ca: string,
  lockingBlocks: number,
  network: Network
) {
  return btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLockCaV0(hexToBytes(mpcPubKey), hexToBytes(publicKey), ca, lockingBlocks)
    },
    btcNetwork(network)
  )
}

export function getLockCaAddress(publicKey: string, ca: string, lockingBlocks: number, network: Network) {
  return getLockCaP2WSH(publicKey, ca, lockingBlocks, network).address!
}

export function getLockCaP2WSH(publicKey: string, ca: string, lockingBlocks: number, network: Network) {
  return btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLockCa(hexToBytes(publicKey), ca, lockingBlocks)
    },
    btcNetwork(network)
  )
}

export function getLockBrc20CaAddress(publicKey: string, ca: string, lockingBlocks: number, network: Network) {
  return getLockBrc20CaP2WSH(publicKey, ca, lockingBlocks, network).address!
}

export function getLockBrc20CaP2WSH(publicKey: string, ca: string, lockingBlocks: number, network: Network) {
  return btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLockBrc20Ca(hexToBytes(publicKey), ca, lockingBlocks)
    },
    btcNetwork(network)
  )
}
