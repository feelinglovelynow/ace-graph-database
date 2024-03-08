import { _list } from './list.js'
import { error } from './throw.js'
import { _query } from './query.js'
import { _start } from './start.js'
import { td, enums } from '#manifest'
import { _mutate } from './mutate.js'
import { create } from './passport.js'
import { endpoints } from './enums/endpoints.js'
import { _deleteDataAndSchema } from './delete.js'
import { _addToSchema, _getSchema } from './schema.js'
import { _enforcePermissions } from './enforcePermissions.js'


/**
 * @param { td.CF_DO_Storage } storage 
 * @param { Request } request 
 * @returns { Promise<Response> }
 */
async function getResponse (storage, request) {
  let body
  const url = new URL(request.url)

  switch (url.pathname) {
    // start
    case enums.endpoints.start:
      return new Response(JSON.stringify(await _start(create(storage, request, enums.passportSource.start))), { headers: getHeaders('json') })


    // schema
    case enums.endpoints.addToSchema:
      return new Response(JSON.stringify(await _addToSchema(create(storage, request, enums.passportSource.addToSchema), await request.json())), { headers: getHeaders('json') })
    case enums.endpoints.getSchema:
      return new Response(JSON.stringify(await _getSchema(create(storage, request, enums.passportSource.getSchema))), { headers: getHeaders('json') })


    // list
    case enums.endpoints.list:
      /** @type { { [k: string]: any } } */
      const rList = {}
      body = await request.text() // might be undefined
      body = body ? JSON.parse(body) : {} // if defined => parse body to get options
      const map = await _list(create(storage, request, enums.passportSource.list), body) // returns a map
      map.forEach((value, key) => rList[key] = value) // convert map to an object b/c we can't stringify a map
      return new Response(JSON.stringify(rList), { headers: getHeaders('json') })


    // delete
    case enums.endpoints.deleteDataAndSchema:
      await _deleteDataAndSchema(create(storage, request, enums.passportSource.deleteDataAndSchema))
      return new Response(JSON.stringify({ success: true }), { headers: getHeaders('json') })


    // mutate
    case enums.endpoints.mutate:
      return new Response(JSON.stringify(await _mutate(create(storage, request, enums.passportSource.mutate), await request.json())), { headers: getHeaders('json') })


    // query
    case enums.endpoints.query:
      return new Response(JSON.stringify(await _query(create(storage, request, enums.passportSource.query), await request.json())), { headers: getHeaders('json') })


    // enforcePermissions
    case enums.endpoints.enforcePermissions:
      return new Response(JSON.stringify(await _enforcePermissions(create(storage, request, enums.passportSource.enforcePermissions), await request.json())), { headers: getHeaders('json') })


    // throw b/c unknown pathname provided
    default:
      throw error('ace__invalid-url', `The request is invalid b/c the url pathname ${ url.pathname } is invalid, please call with a valid url pathname`, { pathname: url.pathname, validPathnames: endpoints.keys() })
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
