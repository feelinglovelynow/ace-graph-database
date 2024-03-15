import { error } from './throw.js'
import { _query } from './query.js'
import { td, enums } from '#manifest'
import { REQUEST_TOKEN_HEADER, SCHEMA_KEY, getRevokesKey, getUniqueIndexKey } from './variables.js'


export class Passport {
  source
  storage
  user
  token
  schema
  revokesAcePermissions
  isEnforcePermissionsOn

  /**
   * @typedef { object } PassportOptions
   * @property { enums.passportSource } source - The source function that created this passport
   * @property { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Graph Database)
   * @property { td.AcePassportUser } [ user ]
   * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling mutate > Start
   * @property { td.Schema } [ schema ]
   * @property { Request } [ request ]
   * @property { Map<string, any> } [ revokesAcePermissions ]
   * @property { boolean } [ isEnforcePermissionsOn ]
   * @param { PassportOptions } options 
   */
  constructor (options) {
    this.source = options.source
    this.storage = options.storage
    if (options.user) this.user = options.user
    if (options.token) this.token = options.token
    if (options.schema) this.schema = options.schema
    if (options.request) this.token = options.request.headers.get(REQUEST_TOKEN_HEADER)
    if (options.revokesAcePermissions) this.revokesAcePermissions = options.revokesAcePermissions
    if (typeof options.isEnforcePermissionsOn === 'boolean') this.isEnforcePermissionsOn = options.isEnforcePermissionsOn
  }

  
  async stamp () {
    const _passport = new Passport({
      storage: this.storage,
      source: enums.passportSource.stamp,
      token: this.token,
      schema: this.schema,
      user: this.user,
      isEnforcePermissionsOn: this.isEnforcePermissionsOn,
      revokesAcePermissions: this.revokesAcePermissions,
    })


    switch (this.source) {
      case enums.passportSource.stamp:
        if (!this.revokesAcePermissions) this.revokesAcePermissions = new Map()
        break
      default:
        if (!this.schema) this.schema = _passport.schema = await this.storage.get(SCHEMA_KEY) // _getSchema() calls stamp so if we call _getSchema() here it's circular

        if (!this.user) {
          const [user, isEnforcePermissionsOn] = await Promise.all([this.#getUser(_passport), this.#getIsEnforcePermissionsOn(_passport)])
          this.user = user
          this.isEnforcePermissionsOn = isEnforcePermissionsOn
          this.revokesAcePermissions = this.#getRevokesAcePermissions(isEnforcePermissionsOn, user)
        }
        break
    }

    if (this.isEnforcePermissionsOn) {
      if (!this.user) throw error('auth__invalid-user', `The request is invalid b/c passport.user is falsy, please ensure the provided token \`${this.token}\` aligns with a user`, { token: this.token, source: this.source })
      if (!this.user?.role) throw error('auth__invalid-role', `The request is invalid b/c passport.user.role is falsy, please ensure the provided token \`${this.token}\` aligns with a user and the user has a role`, { token: this.token, source: this.source })
    }
  }


  /**
   * @param { Passport } _passport 
   * @returns { Promise<td.AcePassportUser | undefined>}
   */
  async #getUser (_passport) {
    let user

    if (_passport.token) {
      const { token } = await _query(_passport, {
        request: {
          id: 'AceToken',
          property: 'token',
          x: {
            $options: [
              { id: 'Alias', x: { alias: 'token' } },
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
                  allowNewInsert: true,
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
   * @param { boolean } isEnforcePermissionsOn
   * @param { td.AcePassportUser } [ user ] 
   * @returns { Map<string, any> }
   */
  #getRevokesAcePermissions(isEnforcePermissionsOn, user)  {
    /** @type { Map<string, any> } - Converts an array of permissions into a map where each key represents the permission (limit includes lookups) and each value is the permission */
    const revokesAcePermissions = new Map()

    if (isEnforcePermissionsOn) {
      if (user?.role?.revokesAcePermissions) {
        for (const permission of user.role.revokesAcePermissions) {
          revokesAcePermissions.set(getRevokesKey(permission), permission)
        }
      }
    }

    return revokesAcePermissions
  }


  /**
   * @param { Passport } _passport 
   * @returns { Promise<boolean>}
   */
  async #getIsEnforcePermissionsOn (_passport) {
    const key = getUniqueIndexKey('AceSetting', 'slug', enums.settings.enforcePermissions)
    const uid = await this.storage.get(key)

    if (!uid) return false

    const { isOn } = await _query(_passport, {
      request: {
        id: 'AceSetting',
        property: 'isOn',
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
