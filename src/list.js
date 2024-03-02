import { error } from './throw.js'
import { td, enums } from '#manifest'
import { stamp } from './passport.js'
import { fetchJSON } from './fetchJSON.js'


/**
 * Returns all keys and values (array of objects) in Ace Database, in ascending sorted order based on the keys’ UTF-8 encodings.
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { td.CF_DO_StorageListOptions } [ options ]
 * @returns { Promise<{ [k: string]: any }[]> }
 */
export async function list (url, options) {
  return fetchJSON(url + enums.endpoints.list, null, { body: JSON.stringify(options || {}) })
}


/**
 * Returns all keys and values (`Map<string, any>`) in Ace Database, in ascending sorted order based on the keys’ UTF-8 encodings.
 * @param { td.AcePassport } passport
 * @param { td.CF_DO_StorageListOptions } [ options ]
 * @returns { Promise<Map<string, any>> }
 */
export async function _list (passport, options) {
  await stamp(passport)

  passport.revokesAcePermissions?.forEach((value) => {
    if (value.action === 'read' && value.schema === true) throw error('auth__read-schema', `Because read permissions to the schema is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
    if (value.action === 'read' && value.nodeName) throw error('auth__read-node', `Because read permissions to the node name \`${value.nodeName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
    if (value.action === 'read' && value.relationshipName) throw error('auth__read-node', `Because read permissions to the relationship name \`${value.relationshipName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
  })

  return await passport.storage.list(options)
}
