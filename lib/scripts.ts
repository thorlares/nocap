import { utf8ToBytes } from '@noble/hashes/utils'
import { bytes } from '@scure/base'
import { Script } from '@scure/btc-signer'

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

export function scriptLockCaV0(mpcKey: Uint8Array, userKey: Uint8Array, coinAddress: string, blocks = 10): Uint8Array {
  if (!userKey.length) throw new Error('user key is empty')
  if (!mpcKey.length) throw new Error('mpc key is empty')
  return Script.encode([
    'DEPTH', // push stack depth
    '1SUB', // sub 1
    'IF', // result still greater, which means stack contains two signature
    mpcKey, // check MPC key, here use hd public key for demo
    'CHECKSIGVERIFY', // fail if signature does not match
    'ELSE', // stack contains only one signature
    blocks, // 1 block later
    'CHECKSEQUENCEVERIFY', // fail if block not passes
    'DROP', // drop check result
    'ENDIF',
    userKey, // check user key
    'CHECKSIG', // fail if signature does not match
    'OP_0',
    'IF',
    bytes('base58', coinAddress),
    'ENDIF'
  ])
}

export function scriptLockCa(userKey: Uint8Array, coinAddress: string, blocks = 10): Uint8Array {
  if (!userKey.length) throw new Error('user key is empty')
  return Script.encode([
    blocks, // nubmer of blocks to lock
    'CHECKSEQUENCEVERIFY', // fail if block not passes
    'DROP', // drop check result
    userKey, // check user key
    'CHECKSIG', // fail if signature does not match
    'OP_0', // Skip next if test
    'IF',
    bytes('base58', coinAddress),
    'ENDIF'
  ])
}

export function scriptLockBrc20Ca(userKey: Uint8Array, coinAddress: string, blocks = 10): Uint8Array {
  if (!userKey.length) throw new Error('user key is empty')
  return Script.encode([
    blocks, // nubmer of blocks to lock
    'CHECKSEQUENCEVERIFY', // fail if block not passes
    'DROP', // drop check result
    userKey, // check user key
    'CHECKSIG', // fail if signature does not match
    'OP_0', // Skip next if test
    'IF',
    utf8ToBytes('brc20'),
    bytes('base58', coinAddress),
    'ENDIF'
  ])
}
