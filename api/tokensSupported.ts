import { kv } from '@vercel/kv'

export function GET(request: Request) {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Coin address is required', { status: 400 })

  const prefix = `nc:address:${address}`
  return kv
    .scan(0, {
      match: `${prefix}*`,
      count: 100
    })
    .then(([_, keys]) => keys.map((key) => key.split(':')[4]))
    .then((keys) => new Response(JSON.stringify(keys)))
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to get coins supported: ${e.message}`, { status: 500 })
    })
}
