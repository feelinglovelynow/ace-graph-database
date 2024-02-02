import { td, enums }from '#manifest'


/**
 * Returns all keys and values (array of objects) in Ace Database, in ascending sorted order based on the keys’ UTF-8 encodings.
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { td.CF_DO_StorageListOptions } [ options ]
 * @returns { Promise<{ [k: string]: any }[]> }
 */
export async function list (url, options) {
  /** @type { RequestInit } */
  const requestInit = { body: JSON.stringify(options), method: 'POST', headers: { 'content-type': 'application/json' } }
  const rFetch = await fetch(`${ url }${ enums.endpoints.list }`, requestInit)
  return await rFetch.json()
}


/**
 * Returns all keys and values (`Map<string, any>`) in Ace Database, in ascending sorted order based on the keys’ UTF-8 encodings.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.CF_DO_StorageListOptions } [ options ]
 * @returns { Promise<Map<string, any>> }
 */
export async function _list (storage, options) {
  return await storage.list(options)
}
