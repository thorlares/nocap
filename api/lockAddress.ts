import { kv } from '@vercel/kv'

export function GET(request: Request) {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')
  if (!address) return new Response('Lock address is required', { status: 400 })

  return kv
    .hget(`nc:lock:addresses`, address)
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to get: ${e.message}`, { status: 500 })
    })
}
