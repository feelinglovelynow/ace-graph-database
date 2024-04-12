import { td, enums } from '#ace'
import { _ace } from './lib/ace/ace.js'
import { AceError } from './lib/objects/AceError.js'
import { AcePassport } from './lib/objects/AcePassport.js'


/**
 * @param { td.Ace_CF_DO_Storage } storage 
 * @param { Request } request 
 * @returns { Promise<Response> }
 */
async function getResponse (storage, request) {
  const url = new URL(request.url)

  if (url.pathname === '/ace') return new Response(JSON.stringify(await _ace(AcePassport({ storage, request, source: enums.passportSource.worker }), await request.json())), { headers: getHeaders('json') })
  else throw AceError('ace__invalid-url', `The request is invalid b/c the url pathname ${ url.pathname } is invalid, please call with the only valid url pathname, which is /ace`, { pathname: url.pathname, validPathname: '/ace' })
}


// Cloudflare Worker
export default {
  /**
   * @param { Request } request 
   * @param { td.Ace_CF_Env } env 
   * @returns 
   */
  async fetch (request, env) {
    switch (request.method) {
      case 'OPTIONS':
        return new Response('', { headers: getHeaders('standard') })
      case 'POST':
        const id = env.AceGraphDatabase.idFromName('ace')
        const stub = env.AceGraphDatabase.get(id)
        return await stub.fetch(request)
      default:
        throw AceError('ace__invalid-method', `The request method is invalid because the method ${ request.method } is invalid, please call with a valid request method, POST`, { method: request.method })
    }
  },
}


// Cloudflare Durable Object
export class AceGraphDatabase {
  /**
   * @param { td.Ace_CF_DO_State } state 
   * @param { td.Ace_CF_Env } env 
   */
  constructor (state, env) {
    this.state = state;
  }

  /**
   * @param { Request } request 
   * @returns { Promise<Response> }
   */
  async fetch (request) {
    try {
      switch (request.method) {
        case 'OPTIONS':
          return new Response('', { headers: getHeaders('standard') })
        case 'POST':
          return await getResponse(this.state.storage, request)
        default:
          throw AceError('ace__invalid-method', `The request method is invalid because the method ${ request.method } is invalid, please call with a valid request method, POST`, { method: request.method })
      }
    } catch (e) {
      if (typeof e === 'object') return new Response(JSON.stringify(e), { headers: getHeaders('json'), status: 400 })
      else return new Response(JSON.stringify({ id: 'aceDatabase__error', message: 'An error has occured' }), { headers: getHeaders('json'), status: 400 })
    }
  }
}


/**
 * Get response headers
 * @param { 'standard' | 'json' } type 
 * @returns { HeadersInit }
 */
function getHeaders (type) {
  switch (type) {
    case 'standard':
      return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
    case 'json':
      return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'content-type': 'application/json' }
  }
}
