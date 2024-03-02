import { error } from './throw.js'
import { enums, td } from '#manifest'
import { stamp } from './passport.js'
import { fetchJSON } from './fetchJSON.js'


/**
 * Removes all data and the schema from your Ace Graph Database
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { string | null } token 
 * @returns { Promise<void> }
 */
export async function deleteDataAndSchema (url, token) {
  return fetchJSON(url + enums.endpoints.deleteDataAndSchema, token, { method: 'DELETE' })
}


/**
 * Removes all data and the schema from your Ace Graph Database
 * @param { td.AcePassport } passport
 * @returns { Promise<void> }
 */
export async function _deleteDataAndSchema (passport) {
  await stamp(passport)

  passport.revokesAcePermissions?.forEach((value) => {
    if (value.action === 'write' && value.schema === true) throw error('auth__write-schema', `Because write permissions to the schema is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
    if (value.action === 'write' && value.nodeName) throw error('auth__write-node', `Because write permissions to the node name \`${ value.nodeName }\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
    if (value.action === 'write' && value.relationshipName) throw error('auth__write-node', `Because write permissions to the relationship name \`${ value.relationshipName }\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
  })

  await passport.storage.deleteAll()
}
