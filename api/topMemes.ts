import { createKysely } from '@vercel/postgres-kysely'
import { DB } from '../api_lib/db/types.js'
import { sql } from 'kysely'

export function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured', 'DATABASE_URL', process.env.DATABASE_URL)
    return new Response('Server is not properly configured', { status: 500 })
  }

  const url = new URL(request.url)
  const network = url.searchParams.get('network') ?? 'livenet'

  return createKysely<DB>({ connectionString: process.env.DATABASE_URL })
    .selectFrom((eb) =>
      eb
        .selectFrom(network == 'livenet' ? 'locked_amounts' : 'locked_amounts_testnet')
        .select([
          'ca',
          (eb) => eb.fn.sum('confirmed').as('confirmed'),
          (eb) => eb.fn.sum('unconfirmed').as('unconfirmed')
        ])
        .groupBy('ca')
        .as('total')
    )
    .selectAll()
    .orderBy(sql<string>`(confirmed + unconfirmed) desc`)
    .limit(10)
    .execute()
    .then((result) => new Response(JSON.stringify(result)))
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
