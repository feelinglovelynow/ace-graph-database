import { error } from './throw.js'
import { _query } from './query.js'
import { stamp } from './passport.js'
import { enums, td } from '#manifest'
import { _mutate } from './mutate.js'
import { fetchJSON } from './fetchJSON.js'
import { getRevokesKey } from './variables.js'


/**
 * @param { string } url 
 * @param { string } token 
 * @param { boolean } isOn 
 * @returns { Promise<any> }
 */
export async function enforcePermissions (url, token, isOn) {
  return fetchJSON(url + enums.endpoints.enforcePermissions, token, { body: JSON.stringify({ isOn }) })
}


/**
 * @param { td.AcePassport } passport
 * @param { { isOn: boolean } } request
 * @returns { Promise<td.MutateResponse> }
 */
export async function _enforcePermissions (passport, request) {
  try {
    await stamp(passport)
    validate()
    const uid = await getUid()
    return await setPermission()


    function validate() {
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', nodeName: 'AceSetting', propName: '*' }))) throw error('auth__write-AceSetting', 'Please ensure the token in your request points to a user that has permissions that do not revoke writting to the node name AceSetting and the prop name *', { token: passport.token, source: passport.source })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', nodeName: 'AceSetting', propName: enums.settings.enforcePermissions }))) throw error('auth__write-AceSetting-enforcePermissions', 'Please ensure the token in your request points to a user that has permissions that do not revoke writting to the node name AceSetting and the prop name enforcePermissions', { token: passport.token, source: passport.source })
      if (typeof request?.isOn !== 'boolean') throw error('enforcePermissions__invalid-isOn', 'Please provide a boolean request.isOn param', { request })

      if (request.isOn) {
        if (!passport.user?.uid) throw error('enforcePermissions__falsy-user-uid', 'Please ensure the token in your request points to a user', { token: passport.token })
        if (!passport.user?.password) throw error('enforcePermissions__falsy-user-password', 'Please ensure the token in your request points to a user that has a password defined', { token: passport.token })
        if (!passport.user?.role?.uid) throw error('enforcePermissions__falsy-role', 'Please ensure the token in your request points to a user that has a role defined', { token: passport.token })
      }
    }


    /** @returns { Promise<string> } */
    async function getUid () {
      const r = await _query(passport, {
        property: 'uid',
        format: {
          id: 'AceSetting',
          x: {
            $options: [
              { id: 'FindByUnique', x: { property: 'slug', value: enums.settings.enforcePermissions } },
              { id: 'PropertyAsResponse', x: { property: 'uid' } }
            ]
          }
        }
      })

      return r?.uid ? r.uid : '_:setting'
    }


    /** @returns { Promise<td.MutateResponse> } */
    async function setPermission() {
      return await _mutate(passport, {
        insert: [
          { id: 'AceSetting', x: { uid, isOn: request.isOn, name: 'Enforce Permissions', slug: enums.settings.enforcePermissions } }
        ]
      })
    }
  } catch (error) {
    console.log('error', error)
    throw error
  }
}
