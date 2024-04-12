import { REQUEST_TOKEN_HEADER } from "./variables.js"


/**
 * @param { { url: string, token?: string, method?: 'GET', body?: { [k: string]: any } } } options
 * @returns { Promise<any> }
 */
export async function aceFetch (options) {
  try {
    /** @type { any } */
    let response
    const requestInit = /** @type { any } */ ({})

    if (options?.body) requestInit.body = JSON.stringify(options.body)

    requestInit.headers = { 'content-type': 'application/json' }
    requestInit.method = options?.method ? options.method : 'POST'
    
    if (options?.token) requestInit.headers[REQUEST_TOKEN_HEADER] = options.token

    response = await (await fetch(options.url, requestInit)).json()
    return response
  } catch (error) {
    console.log('error', error)
    throw error
  }
}
