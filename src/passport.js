import { _query } from './query.js'
import { td, enums } from '#manifest'
import { _getSchema } from './schema.js'
import { REQUEST_TOKEN_HEADER, SCHEMA_KEY, getRevokesKey, getUniqueIndexKey } from './variables.js'
import { error } from './throw.js'


/**
 * @param { td.AcePassport } passport
 * @returns { Promise<td.AcePassport> }
 */
export async function stamp (passport) {
  /** @type { td.AcePassport } - Internal passport */
  const _passport = { ...passport, ...{ type: enums.passportType.internal, source: enums.passportSource.stamp } }

  switch (passport.type) {
    case enums.passportType.internal:
      if (!passport.revokesAcePermissions) passport.revokesAcePermissions = new Map()
      break
    case enums.passportType.external:
      if (!passport.schema) passport.schema = _passport.schema = await passport.storage.get(SCHEMA_KEY) // _getSchema() calls stamp so if we call _getSchema() here it's circular

      if (!passport.user) {
        const [ user, isEnforcePermissionsOn ] = await Promise.all([ getUser(), getIsEnforcePermissionsOn() ])
        passport.user = user
        passport.isEnforcePermissionsOn = isEnforcePermissionsOn
        passport.revokesAcePermissions = getRevokesAcePermissions(user, isEnforcePermissionsOn)
      }
      break
  }

  if (passport.isEnforcePermissionsOn) {
    if (!passport.user) throw error('auth__invalid-user', `The request is invalid b/c passport.user is falsy, please ensure the provided token \`${ passport.token }\` aligns with a user`, { token: passport.token, source: passport.source })
    if (!passport.user?.role) throw error('auth__invalid-role', `The request is invalid b/c passport.user.role is falsy, please ensure the provided token \`${ passport.token }\` aligns with a user and the user has a role`, { token: passport.token, source: passport.source })
  }

  return passport


  /** @returns { Promise<boolean> } */
  async function getIsEnforcePermissionsOn () {
    const key = getUniqueIndexKey('AceSetting', 'slug', enums.settings.enforcePermissions)
    const uid = await passport.storage.get(key)

    if (!uid) return false
    else {
      const { isOn } = await _query(_passport, {
        property: 'isOn',
        format: {
          id: 'AceSetting',
          x: {
            $options: [
              { id: 'FindByUid', x: { uid } },
              { id: 'PropertyAsResponse', x: { property: 'isOn' } }
            ]
          }
        }
      })

      return Boolean(isOn)
    }
  }


  /** @returns { Promise<any> } */
  async function getUser () {
    let user = null

    if (_passport.token) {
      const { token } = await _query(_passport, {
        property: 'token',
        format: {
          id: 'AceToken',
          x: {
            $options: [
              { id: 'FindByUid', x: { uid: _passport.token } }
            ],
            user: {
              uid: true,
              password: true,
              role: {
                uid: true,
                revokesAcePermissions: {
                  uid: true,
                  action: true,
                  nodeName: true,
                  relationshipName: true,
                  propName: true,
                  schema: true,
                  allowPropName: true,
                }
              }
            },
          }
        }
      })

      user = token?.user
    }

    return user
  }


  /**
   * @param {{ role: { revokesAcePermissions: any } } } user
   * @param { boolean } enforcePermissions
   * @returns { Map<string, any> }
   */
  function getRevokesAcePermissions (user, enforcePermissions) {
    /** @type { Map<string, any> } - Converts an array of permissions into a map where each key represents the permission (limit includes lookups) and each value is the permission */
    const revokesAcePermissions = new Map()

    if (enforcePermissions) {
      if (user?.role?.revokesAcePermissions) {
        for (const permission of user.role.revokesAcePermissions) {
          revokesAcePermissions.set(getRevokesKey(permission), permission)
        }
      }
    }

    return revokesAcePermissions
  }
}


/**
 * @param { td.CF_DO_Storage } storage
 * @param { Request } request
 * @param { enums.passportSource } source
 * @returns { td.AcePassport }
 */
export function create (storage, request, source) {
  return {
    source,
    storage,
    type: enums.passportType.external,
    token: request.headers.get(REQUEST_TOKEN_HEADER),
  }
}
