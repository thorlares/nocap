export class FetchError extends Error {
  status: number
  constructor(status: number, message?: string) {
    super(message)
    this.status = status
  }
}

function createFetchError(res: Response) {
  return res.text().then((text) => {
    throw new FetchError(res.status, text)
  })
}

export function getJson(res: Response) {
  if (res.status != 200) return createFetchError(res)
  return res.json().catch((e) => {
    console.warn(e)
    throw e
  })
}

export function getBody(res: Response) {
  if (res.status != 200) return createFetchError(res)
  return res.text()
}

export function ensureSuccess(res: Response) {
  if (res.status != 200) return createFetchError(res)
}
