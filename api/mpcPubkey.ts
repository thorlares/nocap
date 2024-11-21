import { hex } from '@scure/base'
import { hdKey } from '../api_lib/constants.js'

export function GET() {
  return new Response(hex.encode(hdKey.publicKey))
}
