import { kv } from '@vercel/kv'
import { getJson } from '../lib/fetch.js'

export function GET() {
  return kv
    .get(`nc:timestamp:updateTokens`)
    .then((time) => {
      console.debug('last update time:', time)
      if (time && Number(time) > Date.now() - 1000 * 60 * 30) {
        return kv.lrange('nc:token:recent', 0, 100)
      }
      kv.set(`nc:timestamp:updateTokens`, Date.now())

      if (!process.env.BITQUERY_TOKEN) {
        console.error('BITQUERY_TOKEN is not configured')
        throw new Error('not configured correctly')
      }

      const newlyTokens = JSON.stringify({
        query: `{
Solana {
  DEXTrades(
    limitBy: {count: 1, by: Trade_Buy_Currency_MintAddress}
    limit: {count: 100}
    orderBy: {descending: Block_Time}
    where: {Trade: {Buy: {Currency: {MintAddress: {notIn: ["11111111111111111111111111111111"]}, Uri: {not: ""}}}, Dex: {ProtocolName: {is: "pump"}}}, Transaction: {Result: {Success: true}}}
  ) {
    Trade {
      Buy {
        Currency {
          Name
          Symbol
          MintAddress
          Uri
        }
      }
    }
  }
}
}`,
        variables: '{}'
      })

      return fetch('https://streaming.bitquery.io/eap', {
        method: 'POST',
        body: newlyTokens,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.BITQUERY_TOKEN}` },
        redirect: 'follow'
      })
        .then(getJson)
        .then((result) => {
          const tokens = result.data.Solana.DEXTrades.map((trade: any) => {
            const {
              Trade: {
                Buy: {
                  Currency: { Name: name, Symbol: symbol, MintAddress: id, Uri: uri }
                }
              }
            } = trade
            return { id, name, symbol, uri }
          })
          return kv
            .multi()
            .lpush('nc:token:recent', ...tokens)
            .ltrim('nc:token:recent', 0, 100)
            .exec()
            .then(() => tokens)
        })
    })
    .then((tokens) => new Response(JSON.stringify(tokens)))
    .catch((e) => {
      console.error(e)
      return new Response(`Failed to update: ${e.message}`, { status: 500 })
    })
}
