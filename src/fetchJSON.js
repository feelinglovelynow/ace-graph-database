import { REQUEST_TOKEN_HEADER } from "./variables.js"

/**
 * @param { string } url 
 * @param { string | null } token 
 * @param { RequestInit } [ requestInit ]
 * @returns 
 */
export async function fetchJSON (url, token, requestInit) {
  try {
    const definedRequestInit = requestInit || {}
    const defaultRequestInit = { method: 'POST', headers: /** @type {*} */ ({ 'content-type': 'application/json' }) }
    const currentRequestInit = { ...defaultRequestInit, ...definedRequestInit }

    if (token && currentRequestInit.headers) currentRequestInit.headers[REQUEST_TOKEN_HEADER] = token

    return await (await fetch(`${ url }`, currentRequestInit)).json()
  } catch (error) {
    console.log('error', error)
    throw error
  }
}
