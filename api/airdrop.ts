import { TwitterApi } from 'twitter-api-v2'
import { kv } from '@vercel/kv'
import { SignJWT, jwtVerify } from 'jose'
import d from 'debug'
import { createHmac } from 'node:crypto'
import { verifyMessage } from 'viem'
import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'

const debug = d('nc:airdrop')

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_OPTIONS = 'Path=/; Max-Age=604800; HttpOnly'

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
  const result: { x: any; tg: any; addresses: any[] | undefined } = {
    x: undefined,
    tg: undefined,
    addresses: undefined
  }

  if (token_x) {
    debug('x token: %o', token_x)
    result.x = (await jwtVerify(token_x, JWT_SECRET_KEY))?.payload
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
      result.addresses = await getAddresses(tgUser.id)
    }
  }

  return new Response(
    JSON.stringify(result),
    result.tg
      ? {
          headers: {
            'set-cookie': `tg=${await new SignJWT(result.tg)
              .setProtectedHeader({ alg: 'HS256' })
              .setExpirationTime('7d')
              .setIssuedAt()
              .sign(JWT_SECRET_KEY)}; ${COOKIE_OPTIONS}`
          }
        }
      : undefined
  )
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
        .sign(JWT_SECRET_KEY)
      return new Response('Auth succeeded, returning to https://nocap.tips/airdrop', {
        headers: {
          'set-cookie': `x=${token}; ${COOKIE_OPTIONS}`,
          Location: `${process.env.VITE_BASE_PATH}/airdrop/`
        },
        status: 302
      })
    })
    .catch((error) => new Response(error.message, { status: 500 }))
}

async function handleConnectEth(request: Request) {
  const cookies = request.headers.get('cookie')?.split(';')
  const token_tg = cookies?.find((c) => c.trim().startsWith('tg='))?.split('=')?.[1]

  const result = await jwtVerify(token_tg!, JWT_SECRET_KEY)
  if (!result) return new Response('Bad telegram account', { status: 500 })

  const { address, expire, nonce, signature } = await request.json()

  if (expire < Date.now()) return new Response('Signature expired', { status: 400 })

  const message = `Sign this message to allow connecting your wallet address \
with telegram account @${result.payload.username} on NoCap.Tips\n\n\
Telegram account: ${result.payload.username}(${result.payload.id})\n\
Expires At: ${new Date(expire).toISOString()}\nNonce: ${nonce}`
  if (!(await verifyMessage({ address, message, signature }))) return new Response('Bad signature', { status: 400 })

  const db = createKysely<DB>({ connectionString: process.env.POSTGRES_URL })

  const userResult = await db
    .insertInto('user')
    .values({
      tgid: result.payload.id as number,
      tgusername: result.payload.username as string
    })
    .onConflict((oc) => oc.column('tgid').doUpdateSet({ tgusername: result.payload.username as string }))
    .returning('id')
    .execute()

  const userId = userResult[0]?.id

  await db
    .insertInto('eth_address')
    .values({
      address: address,
      uid: userId
    })
    .onConflict((oc) => oc.column('address').doUpdateSet({ uid: userId }))
    .execute()

  return new Response(JSON.stringify(await getAddresses(result.payload.id)))
}

export async function getAddresses(tgid: any) {
  const db = createKysely<DB>({ connectionString: process.env.POSTGRES_URL })

  const addressesResult = await db
    .selectFrom('eth_address')
    .select('address')
    .where('uid', '=', (qb) => qb.selectFrom('user').select('id').where('tgid', '=', tgid))
    .execute()
  debug('tg id: %o, addresses %o', tgid, addressesResult)
  return addressesResult
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  try {
    if (action == 'auth') return await handleAuth(request)
    else if (action == 'connectEth') return await handleConnectEth(request)
    else return new Response('Bad request', { status: 400 })
  } catch (e: any) {
    console.error(e)
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
    else return new Response('Bad request', { status: 400 })
  } catch (e: any) {
    console.error(e)
    return new Response(e?.message ?? e, { status: 500 })
  }
}
