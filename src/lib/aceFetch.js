import { td } from '#manifest'
import { REQUEST_TOKEN_HEADER } from "./variables.js"


/**
 * @param { td.AceFnOptions } options
 * @param { string } pathname 
 * @param { { method?: 'GET', body?: { [k: string]: any } } } [ settings ]
 * @returns { Promise<any> }
 */
export async function aceFetch (options, pathname, settings) {
  try {
    /** @type { any } */
    let response
    const controller = new AbortController()
    const signal = controller.signal
    const requestInit = /** @type { any } */ ({ signal })

    if (settings?.body) requestInit.body = JSON.stringify(settings.body)

    requestInit.headers = { 'content-type': 'application/json' }
    requestInit.method = settings?.method ? settings.method : 'POST'
    
    if (options.token) requestInit.headers[REQUEST_TOKEN_HEADER] = options.token

    setTimeout(() => {
      if (!response) controller.abort()
    }, 6000)

    response = await (await fetch(options.url + pathname, requestInit)).json()
    return response
  } catch (error) {
    console.log('error', error)
    throw error
  }
}
