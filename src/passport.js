import { error } from './throw.js'
import { Cache } from './Cache.js'
import { _query } from './query.js'
import { td, enums } from '#manifest'
import { REQUEST_TOKEN_HEADER, SCHEMA_KEY, getRevokesKey, getUniqueIndexKey } from './variables.js'


export class Passport {
  /** @type { Cache } */
  cache
  /** @type { enums.passportSource } */
  source
  /** @type { td.AcePassportUser | undefined } */
  user
  /** @type { string | null | undefined } */
  token
  /** @type { td.Schema | undefined } */
  schema
  /** @type { Map<string, any> | undefined } */
  revokesAcePermissions
  /** @type { boolean | undefined } */
  isEnforcePermissionsOn
  /** @type { PassportSchemaDataStructures | undefined } */
  schemaDataStructures
  /** @type { PassportSchemaDataStructureOptions | undefined } */
  schemaDataStructuresOptions

  /**
   * @typedef { object } PassportSchemaDataStructures
   * @property { Set<string> } [ nodeNamesSet ]
   * @property { Set<string> } [ relationshipNamesSet ]
   * @property { Map<string, Map<string, td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp>> } [ relationshipPropsMap ]
   *
   * @typedef { object } PassportSchemaDataStructureOptions
   * @property { boolean } [ nodeNamesSet ]
   * @property { boolean } [ relationshipNamesSet ]
   * @property { boolean } [ relationshipPropsMap ]
   *
   * @typedef { object } PassportOptions
   * @property { enums.passportSource } source - The source function that created this passport
   * @property { td.CF_DO_Storage } [ storage ] - Cloudflare Durable Object Storage (Ace Graph Database)
   * @property { Cache } [ cache ]
   * @property { td.AcePassportUser } [ user ]
   * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling mutate > Start
   * @property { td.Schema } [ schema ]
   * @property { PassportSchemaDataStructureOptions } [ desiredSchemaDataStructures ]
   * @property { PassportSchemaDataStructures } [ schemaDataStructures ]
   * @property { Request } [ request ]
   * @property { Map<string, any> } [ revokesAcePermissions ]
   * @property { boolean } [ isEnforcePermissionsOn ]
   * @param { PassportOptions } options 
   */

  /**
   * @param { PassportOptions } options
   */
  constructor (options) {
    if (options.cache) this.cache = options.cache
    else if (options.storage) this.cache = new Cache(options.storage)
    else throw error('passport__cache-required', 'Please pass options.cache or options.storage to new Passport(options) so Cache may be setup', { options })

    this.source = options.source

    if (!this.source) throw error('passport__falsy-source', 'Please pass options.source to new Passport(options)', { options })
    if (!enums.passportSource[this.source]) throw error('passport__invalid-source', 'Please pass a valid options.source to new Passport(options)', { options, validSources: enums.passportSource })

    if (options.user) this.user = options.user
    if (options.token) this.token = options.token
    if (options.schema) this.schema = options.schema
    if (options.request) this.token = options.request.headers.get(REQUEST_TOKEN_HEADER)
    if (options.revokesAcePermissions) this.revokesAcePermissions = options.revokesAcePermissions
    if (typeof options.isEnforcePermissionsOn === 'boolean') this.isEnforcePermissionsOn = options.isEnforcePermissionsOn

    if (options.schemaDataStructures) this.schemaDataStructures = options.schemaDataStructures
    else if (options.desiredSchemaDataStructures) this.schemaDataStructuresOptions = options.desiredSchemaDataStructures
  }

  
  async stamp () {
    if (!this.schema) this.schema = await this.cache.one(SCHEMA_KEY)
    if (!this.schemaDataStructures && this.schemaDataStructuresOptions) this.#setDesiredSchemaDataStructures()

    const _passport = new Passport({ ...this, source: enums.passportSource.stamp })

    switch (this.source) {
      case enums.passportSource.stamp:
        if (!this.revokesAcePermissions) this.revokesAcePermissions = new Map()
        break
      default:
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
  #getRevokesAcePermissions (isEnforcePermissionsOn, user)  {
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
    const uid = await this.cache.one(key)

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


  #setDesiredSchemaDataStructures () {
    if (!this.schemaDataStructures && this.schemaDataStructuresOptions) {
      /** @type { PassportSchemaDataStructures } */
      this.schemaDataStructures = {}

      if (this.schema?.nodes && (this.schemaDataStructuresOptions.nodeNamesSet || this.schemaDataStructuresOptions.relationshipPropsMap)) { // nodeNamesSet || relationshipPropsMap
        for (const nodeName in this.schema.nodes) {
          if (this.schemaDataStructuresOptions.nodeNamesSet) { // nodeNamesSet
            if (!this.schemaDataStructures?.nodeNamesSet) this.schemaDataStructures.nodeNamesSet = new Set()
            this.schemaDataStructures.nodeNamesSet.add(nodeName)
          }

          if (this.schemaDataStructuresOptions.relationshipPropsMap) { // relationshipPropsMap
            if (!this.schemaDataStructures?.relationshipPropsMap) this.schemaDataStructures.relationshipPropsMap = new Map()

            for (const nodeName in this.schema.nodes) {
              for (const propName in this.schema.nodes[nodeName]) {
                const propValue = this.schema.nodes[nodeName][propName]

                if (propValue.id !== 'Prop') {
                  const mapValue = this.schemaDataStructures.relationshipPropsMap.get(propValue.x.relationshipName) || new Map()
                  mapValue.set(propName, propValue)
                  this.schemaDataStructures.relationshipPropsMap.set(propValue.x.relationshipName, mapValue)
                }
              }
            }
          }
        }
      }

      if (this.schema?.relationships && this.schemaDataStructuresOptions.relationshipNamesSet) { // relationshipNamesSet
        for (const relationshipName in this.schema.relationships) {
          if (this.schemaDataStructuresOptions.relationshipNamesSet) {
            if (!this.schemaDataStructures?.relationshipNamesSet) this.schemaDataStructures.relationshipNamesSet = new Set()
            this.schemaDataStructures.relationshipNamesSet.add(relationshipName)
          }
        }
      }
    }
  }
}
