import * as btc from '@scure/btc-signer'
import { hexToBytes } from '@noble/hashes/utils'
import { scriptLock } from './scripts.js'
import { btcNetwork } from './network.js'
import type { Network } from './types.js'

export function getLockAddress(
  mpcPubKey: string,
  publicKey: string,
  ca: string,
  lockingBlocks: number,
  network: Network
) {
  return btc.p2wsh(
    {
      type: 'wsh',
      script: scriptLock(hexToBytes(mpcPubKey), hexToBytes(publicKey), ca, lockingBlocks)
    },
    btcNetwork(network)
  ).address!
}
