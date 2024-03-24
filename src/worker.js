import { error } from './throw.js'
import { _query } from './query.js'
import { td, enums } from '#manifest'
import { _mutate } from './mutate.js'
import { Passport } from './Passport.js'


/**
 * @param { td.CF_DO_Storage } storage 
 * @param { Request } request 
 * @returns { Promise<Response> }
 */
async function getResponse (storage, request) {
  const url = new URL(request.url)

  switch (url.pathname) {
    // mutate
    case enums.pathnames.mutate:
      return new Response(JSON.stringify(await _mutate(new Passport({ storage, request, source: enums.passportSource.mutate, desiredSchemaDataStructures: { nodeNamesSet: true, relationshipNamesSet: true } }), await request.json())), { headers: getHeaders('json') })


    // query
    case enums.pathnames.query:
      return new Response(JSON.stringify(await _query(new Passport({ storage, request, source: enums.passportSource.query, desiredSchemaDataStructures: { nodeNamesSet: true, relationshipNamesSet: true, relationshipPropsMap: true } }), await request.json())), { headers: getHeaders('json') })


    // throw b/c unknown pathname provided
    default:
      throw error('ace__invalid-url', `The request is invalid b/c the url pathname ${ url.pathname } is invalid, please call with a valid url pathname`, { pathname: url.pathname, validPathnames: enums.pathnames })
  }
}




// Cloudflare Worker
export default {
  /**
   * @param { Request } request 
   * @param { td.CF_Env } env 
   * @returns 
   */
  async fetch (request, env) {
    switch (request.method) {
      case 'OPTIONS':
        return new Response('', { headers: getHeaders('standard') })
      case 'GET':
      case 'POST':
      case 'DELETE':
        const id = env.AceGraphDatabase.idFromName('ace')
        const stub = env.AceGraphDatabase.get(id)
        return await stub.fetch(request)
    }
  },
}


// Cloudflare Durable Object
export class AceGraphDatabase {
  /**
   * @param { td.CF_DO_State } state 
   * @param { td.CF_Env } env 
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
        case 'GET':
        case 'POST':
        case 'DELETE':
          return await getResponse(this.state.storage, request)
        default:
          throw error('ace__invalid-method', `The request method is invalid because the method ${ request.method } is invalid, please call with a valid request method, GET, POST or DELETE`, { method: request.method })
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
