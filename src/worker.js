import { _list } from './list.js'
import { _query } from './query.js'
import { td, enums }from '#manifest'
import { _mutate } from './mutate.js'
import { endpoints } from './enums/endpoints.js'
import { _deleteDataAndSchema } from './delete.js'
import { _setSchema, _getSchema } from './schema.js'


/**
 * @param { td.CF_DO_Storage } storage 
 * @param { Request } request 
 * @returns { Promise<Response> }
 */
async function getResponse (storage, request) {
  let body
  const url = new URL(request.url)

  switch (url.pathname) {
    // schema
    case enums.endpoints.setSchema:
      return new Response(JSON.stringify(await _setSchema(storage, await request.json())), { headers: getHeaders('json') })
    case enums.endpoints.getSchema:
      return new Response(JSON.stringify(await _getSchema(storage)), { headers: getHeaders('json') })


    // list
    case enums.endpoints.list:
      /** @type { { [k: string]: any } } */
      const r = {}
      body = await request.text() // might be undefined
      body = body ? JSON.parse(body) : {} // if defined => parse body to get options
      const map = await _list(storage, body) // returns a map
      map.forEach((value, key) => r[key] = value) // convert map to an object b/c we can't stringify a map
      return new Response(JSON.stringify(r), { headers: getHeaders('json') })


    // delete
    case enums.endpoints.deleteDataAndSchema:
      await _deleteDataAndSchema(storage)
      return new Response(JSON.stringify({ success: true }), { headers: getHeaders('json') })


    // mutate
    case enums.endpoints.mutate:
      return new Response(JSON.stringify(await _mutate(storage, await request.json())), { headers: getHeaders('json') })


    // query
    case enums.endpoints.query:
      return new Response(JSON.stringify(await _query(storage, await request.json())), { headers: getHeaders('json') })


    // throw b/c unknown pathname provided
    default:
      throw { id: 'aceDatabase__invalid-url', message: 'Please call with a valid url pathname', _errorData: { pathname: url.pathname, validPathnames: Object.values(endpoints) } }
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
          throw { id: 'aceDatabase__invalid-method', message: 'Please call with a valid request method', _errorData: { method: request.method } }
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
