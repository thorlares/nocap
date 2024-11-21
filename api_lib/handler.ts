import type { VercelApiHandler, VercelRequest, VercelResponse } from '@vercel/node'

//type RequestHandler = (request: VercelRequest, response: VercelResponse) => VercelResponse

type Handlers = {
  get?: VercelApiHandler
  post?: VercelApiHandler
  put?: VercelApiHandler
  delete?: VercelApiHandler
}

export function handleRequest(request: VercelRequest, response: VercelResponse, handlers: Handlers) {
  try {
    return (handlers as { [key: string]: any })[request.method!.toLocaleLowerCase()](request, response)
  } catch (err) {
    if (err instanceof Error) {
      console.log(err)
      response.status(400).send(err.message)
    } else {
      console.error(err)
      response.status(500).send('unknown error')
    }
    return
  }
}
