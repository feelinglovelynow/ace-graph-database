// import { td } from '#manifest'
import { REQUEST_TOKEN_HEADER } from "./variables.js"


/**
 * @param { * } core
 * @param { string } pathname 
 * @param { { method?: 'GET', body?: { [k: string]: any } } } [ options ]
 * @returns 
 */
export async function aceFetch (core, pathname, options) {
  try {
    /** @type { any } */
    let response
    const controller = new AbortController()
    const signal = controller.signal
    const requestInit = /** @type { any } */ ({ signal })

    if (options?.body) requestInit.body = JSON.stringify(options.body)

    requestInit.headers = { 'content-type': 'application/json' }
    requestInit.method = options?.method ? options.method : 'POST'
    
    if (core.token) requestInit.headers[REQUEST_TOKEN_HEADER] = core.token

    setTimeout(() => {
      if (!response) controller.abort()
    }, 6000)

    response = await (await fetch(core.url + pathname, requestInit)).json()
    return response
  } catch (error) {
    console.log('error', error)
    throw error
  }
}
