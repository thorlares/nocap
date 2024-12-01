import { Script } from '@scure/btc-signer'
import * as btc from '@scure/btc-signer'
import { hexToBytes } from '@noble/hashes/utils'
import { btcNetwork } from '../../../lib/network'
import type { Network } from '../../../lib/types'

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

export function scriptLock(userKey: Uint8Array, blocks = 10): Uint8Array {
  if (!userKey.length) throw new Error('user key is empty')
  return Script.encode([
    blocks, // nubmer of blocks to lock
    'CHECKSEQUENCEVERIFY', // fail if block not passes
    'DROP', // drop check result
    userKey, // check user key
    'CHECKSIG' // fail if signature does not match
  ])
}
