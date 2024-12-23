import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const query = request.query['query']
  const address = request.query['address']
  if (query == 'balance') {
    const result = await fetch(
      `${process.env.UNISAT_URL ?? 'https://open-api-testnet.unisat.io'}/v1/indexer/address/${address}/brc20/summary`,
      {
        headers: { Authorization: `Bearer ${process.env.UNISAT_KEY}` }
      }
    )
    response.status(result.status).send(await result.text())
  } else if (query == 'transferable') {
    const ticker = request.query['ticker']
    const result = await fetch(
      `${
        process.env.UNISAT_URL ?? 'https://open-api-testnet.unisat.io'
      }/v1/indexer/address/${address}/brc20/${ticker}/transferable-inscriptions`,
      {
        headers: { Authorization: `Bearer ${process.env.UNISAT_KEY}` }
      }
    )
    response.status(result.status).send(await result.text())
  } else {
    response.status(400).send('invalid query param')
  }
}
