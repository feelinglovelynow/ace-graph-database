import { enums, td } from '#manifest'


/**
 * Removes all data and the schema from your Ace Graph Database
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @returns { Promise<void> }
 */
export async function deleteDataAndSchema (url) {
  /** @type { RequestInit } */
  const requestInit = { method: 'DELETE' }
  await fetch(`${ url }${ enums.endpoints.deleteDataAndSchema }`, requestInit)
}


/**
 * Removes all data and the schema from your Ace Graph Database
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @returns { Promise<void> }
 */
export async function _deleteDataAndSchema (storage) {
  await storage.deleteAll()
}
