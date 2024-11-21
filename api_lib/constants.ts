import * as ecc from '@bitcoinerlab/secp256k1'
import { BIP32Factory } from 'bip32'

const bip32 = BIP32Factory(ecc)

if (!process.env.BITCOIN_KEY) throw new Error('BITCOIN_KEY is not configured')

export const hdKey = bip32.fromSeed(Buffer.from(process.env.BITCOIN_KEY ?? '', 'hex'))
