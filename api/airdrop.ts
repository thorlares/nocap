import { TwitterApi } from 'twitter-api-v2'
import { kv } from '@vercel/kv'
import { SignJWT, jwtVerify } from 'jose'
import d from 'debug'
import { createHmac } from 'node:crypto'

const debug = d('nc:airdrop')

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET!)

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured')
}

function HMAC_SHA256(key: string | Buffer, secret: string) {
  return createHmac('sha256', key).update(secret)
}

function getCheckString(data: URLSearchParams) {
  const items: [k: string, v: string][] = []

  // remove hash
  for (const [k, v] of data.entries()) if (k !== 'hash') items.push([k, v])

  return items
    .sort(([a], [b]) => a.localeCompare(b)) // sort keys
    .map(([k, v]) => `${k}=${v}`) // combine key-value pairs
    .join('\n')
}

async function handleAuth(request: Request) {
  const cookies = request.headers.get('cookie')?.split(';')
  const token_x = cookies?.find((c) => c.trim().startsWith('x='))?.split('=')?.[1]
  const result: { x: any; tg: any } = { x: undefined, tg: undefined }

  if (token_x) {
    debug('x token: %o', token_x)
    result.x = (await jwtVerify(token_x, secretKey))?.payload
    debug('jwt result: %o', result.x)
  }

  if (request.method == 'POST') {
    const body = await request.text()
    const tgInitData = new URLSearchParams(body)
    const data_check_string = getCheckString(tgInitData)
    const secret_key = HMAC_SHA256('WebAppData', process.env.TGBOT_TOKEN!).digest()
    const hash = HMAC_SHA256(secret_key, data_check_string).digest('hex')

    if (hash === tgInitData.get('hash')) {
      const tgUser = JSON.parse(tgInitData.get('user')!)
      debug('tg user: %o', tgUser)
      result.tg = { id: tgUser.id, username: tgUser.username }
    }
  }
  return new Response(JSON.stringify(result))
}

async function handleAuthX() {
  const client = new TwitterApi({ appKey: process.env.X_APPKEY!, appSecret: process.env.X_APPSECRET! })
  const authLink = await client.generateAuthLink(`${process.env.VITE_BASE_PATH}/api/airdrop?action=authcb`)
  await kv.set(`nc:auth:x:token:${authLink.oauth_token}`, authLink.oauth_token_secret, { ex: 600 })
  return new Response('', { headers: { Location: authLink.url }, status: 302 })
}

async function handleAuthXCallback(url: URL) {
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
      return new Response('Auth succeeded, returning to https://nocap.tips/airdrop', {
        headers: {
          'set-cookie': `x=${token}; ${cookieOptions}`,
          Location: `${process.env.VITE_BASE_PATH}/airdrop/`
        },
        status: 302
      })
    })
    .catch((error) => new Response(error.message, { status: 500 }))
}

async function handleAuthTelegram(url: URL) {
  const token = url.searchParams.get('token')

  debug('tg token: %o', token)
  const result = await jwtVerify(token!, secretKey)
  debug('jwt result: %o', result)
  if (!result) return new Response('Bad token', { status: 500 })

  const cookieOptions = 'Path=/; Max-Age=604800; HttpOnly'
  return new Response('', {
    headers: {
      'set-cookie': `tg=${token}; ${cookieOptions}`,
      Location: `${process.env.VITE_BASE_PATH}/airdrop/`
    },
    status: 302
  })
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  try {
    if (action == 'auth') return await handleAuth(request)
    else return new Response('', { status: 400 })
  } catch (e: any) {
    return new Response(e?.message ?? e, { status: 500 })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  try {
    if (action == 'auth') return await handleAuth(request)
    else if (action == 'authcb') return await handleAuthXCallback(url)
    else if (action == 'authx') return await handleAuthX()
    else if (action == 'authtg') return await handleAuthTelegram(url)
    else return new Response('', { status: 400 })
  } catch (e: any) {
    return new Response(e?.message ?? e, { status: 500 })
  }
}
