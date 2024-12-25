import { TwitterApi } from 'twitter-api-v2'
import { kv } from '@vercel/kv'
import { SignJWT, jwtVerify } from 'jose'
import d from 'debug'

const debug = d('nc:airdrop')

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET!)

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured')
}

async function handleAuth(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.split(';')
    ?.find((c) => c.trim().startsWith('x='))
    ?.split('=')?.[1]

  if (token) {
    debug('cookie: %o', token)
    const result = await jwtVerify(token, secretKey)
    debug('jwt result: %o', result)
    if (result) return new Response(JSON.stringify(result.payload))
  }

  const client = new TwitterApi({ appKey: process.env.X_APPKEY!, appSecret: process.env.X_APPSECRET! })
  return client
    .generateAuthLink(`${process.env.BASE_PATH}/api/airdrop?action=authcb`)
    .then((authLink) =>
      kv.set(`nc:auth:x:token:${authLink.oauth_token}`, authLink.oauth_token_secret, { ex: 600 }).then(() => authLink)
    )
    .then(({ url }) => new Response(JSON.stringify({ url })))
    .catch((error) => new Response(error.message, { status: 500 }))
}

async function handleAuthCallback(url: URL) {
  const oauth_token = url.searchParams.get('oauth_token')
  const oauth_verifier = url.searchParams.get('oauth_verifier')
  if (!oauth_token || !oauth_verifier) return new Response('', { status: 400 })

  return kv
    .get(`nc:auth:x:token:${oauth_token}`)
    .then(async (oauth_token_secret) => {
      const client = new TwitterApi({
        appKey: process.env.X_APPKEY!,
        appSecret: process.env.X_APPSECRET!,
        accessToken: oauth_token,
        accessSecret: oauth_token_secret as string
      })
      const { userId, screenName } = await client.login(oauth_verifier)
      await kv.del(`nc:auth:x:token:${oauth_token}`)
      const token = await new SignJWT({ screenName, userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(secretKey)
      const cookieOptions = 'Path=/; Max-Age=604800; HttpOnly'
      return new Response(JSON.stringify({ userId, screenName }), {
        headers: {
          'set-cookie': `x=${token}; ${cookieOptions}`,
          Location: `${process.env.BASE_PATH}/airdrop/`
        },
        status: 302
      })
    })
    .catch((error) => new Response(error.message, { status: 500 }))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action == 'auth') return handleAuth(request)
  else if (action == 'authcb') return handleAuthCallback(url)
  else return new Response('', { status: 400 })
}
