import { td, enums } from '#manifest'
import { AceError } from './AceError.js'
import { _ace  } from '../ace/ace.js'
import { AceCache, one } from './AceCache.js'
import { DELIMITER, REQUEST_TOKEN_HEADER, SCHEMA_KEY, getRevokesKey, getUniqueIndexKey } from '../variables.js'


/**
 * @param { td.AcePassportOptions } options 
 * @returns { td.AcePassport }
 */
export function AcePassport (options) {
  let passport = {}

  if (options.cache) passport.cache = options.cache
  else if (options.storage) passport.cache = AceCache(options.storage)
  else throw AceError('passport__cache-required', 'Please pass options.cache or options.storage to AcePassport(options) so Cache may be setup', { options })

  if (!options.source) throw AceError('passport__falsy-source', 'Please pass options.source to AcePassport(options)', { options })
  if (!enums.passportSource[options.source]) throw AceError('passport__invalid-source', 'Please pass a valid options.source to AcePassport(options)', { options, validSources: enums.passportSource })

  passport.source = options.source

  if (options.user) passport.user = options.user
  if (options.token) passport.token = options.token
  if (options.schema) passport.schema = options.schema
  if (options.request) passport.token = options.request.headers.get(REQUEST_TOKEN_HEADER)
  if (options.revokesAcePermissions) passport.revokesAcePermissions = options.revokesAcePermissions
  if (typeof options.isEnforcePermissionsOn === 'boolean') passport.isEnforcePermissionsOn = options.isEnforcePermissionsOn

  if (options.schemaDataStructures) passport.schemaDataStructures = options.schemaDataStructures

  return passport
}


/**
 * @param { td.AcePassport } passport
 */
export async function stamp (passport) {
  if (!passport.schema) passport.schema = await one(SCHEMA_KEY, passport.cache)
  if (!passport.schemaDataStructures) setSchemaDataStructures(passport)

  const _passport = AcePassport({ ...passport, source: enums.passportSource.stamp })

  switch (passport.source) {
    case enums.passportSource.stamp:
      if (!passport.revokesAcePermissions) passport.revokesAcePermissions = new Map()
      break
    default:
      if (!passport.user) {
        const [user, isEnforcePermissionsOn] = await Promise.all([getUser(_passport), getIsEnforcePermissionsOn(_passport)])
        if (user) passport.user = user
        passport.isEnforcePermissionsOn = isEnforcePermissionsOn
        passport.revokesAcePermissions = getRevokesAcePermissions(isEnforcePermissionsOn, user)
      }
      break
  }

  if (passport.isEnforcePermissionsOn) {
    if (!passport.user) throw AceError('auth__invalid-user', `The request is invalid b/c passport.user is falsy, please ensure the provided token \`${passport.token}\` aligns with a user`, { token: passport.token, source: passport.source })
    if (!passport.user?.role) throw AceError('auth__invalid-role', `The request is invalid b/c passport.user.role is falsy, please ensure the provided token \`${passport.token}\` aligns with a user and the user has a role`, { token: passport.token, source: passport.source })
  }
}


/**
 * @param { td.AcePassport } passport 
 */
export function setSchemaDataStructures (passport) {
  /** @type { td.AcePassportSchemaDataStructures } */
  passport.schemaDataStructures = {}

  if (passport.schema?.nodes) {
    for (const nodeName in passport.schema.nodes) {
      if (!passport.schemaDataStructures?.nodeNamesSet) passport.schemaDataStructures.nodeNamesSet = new Set()
      if (!passport.schemaDataStructures?.mustPropsMap) passport.schemaDataStructures.mustPropsMap = new Map()
      if (!passport.schemaDataStructures?.relationshipPropsMap) passport.schemaDataStructures.relationshipPropsMap = new Map()
      if (!passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap) passport.schemaDataStructures.nodeNamePlusRelationshipNameToNodePropNameMap = new Map()

      passport.schemaDataStructures.nodeNamesSet.add(nodeName)

      for (const propName in passport.schema.nodes[nodeName]) {
        const propValue = passport.schema.nodes[nodeName][propName]

        if (propValue.id !== 'Prop') {
          passport.schemaDataStructures.nodeNamePlusRelationshipNameToNodePropNameMap.set(nodeName + DELIMITER + propValue.x.relationshipName, propName)

          // relationshipPropsMap
          const mapValue = passport.schemaDataStructures.relationshipPropsMap.get(propValue.x.relationshipName) || new Map()
          mapValue.set(propName, propValue)
          passport.schemaDataStructures.relationshipPropsMap.set(propValue.x.relationshipName, mapValue)
        }

        if (propValue?.x?.mustBeDefined) {
          const map = passport.schemaDataStructures.mustPropsMap.get(nodeName) || new Map()
          map.set(propName, propValue)
          passport.schemaDataStructures.mustPropsMap.set(nodeName, map)
        }
      }
    }
  }

  if (passport.schema?.relationships) {
    for (const relationshipName in passport.schema.relationships) {
      if (!passport.schemaDataStructures?.mustPropsMap) passport.schemaDataStructures.mustPropsMap = new Map()
      if (!passport.schemaDataStructures?.relationshipNamesSet) passport.schemaDataStructures.relationshipNamesSet = new Set()

      passport.schemaDataStructures.relationshipNamesSet.add(relationshipName)

      const props = passport.schema.relationships[relationshipName]?.x?.props

      if (props) {
        for (const propName in props) {
          if (props[propName].x?.mustBeDefined) {
            const map = passport.schemaDataStructures.mustPropsMap.get(relationshipName) || new Map()
            map.set(propName, props[propName])
            passport.schemaDataStructures.mustPropsMap.set(relationshipName, map)
          }
        }
      }
    }
  }
}


/**
 * @param { td.AcePassport } _passport 
 * @returns { Promise<td.AcePassportUser | undefined>}
 */
async function getUser (_passport) {
  let user

  if (_passport.token) {
    const { token } = await _ace(_passport, {
      request: {
        id: 'QueryNode',
        nodeName: 'AceToken',
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
 * @returns { Map<string, td.AceGraphPermission> }
 */
function getRevokesAcePermissions (isEnforcePermissionsOn, user)  {
  /** @type { Map<string, td.AceGraphPermission> } - Converts an array of permissions into a map where each key represents the permission (limit includes lookups) and each value is the permission */
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
 * @param { td.AcePassport } _passport 
 * @returns { Promise<boolean>}
 */
async function getIsEnforcePermissionsOn (_passport) {
  const key = getUniqueIndexKey('AceSetting', 'slug', enums.settings.enforcePermissions)
  const uid = await one(key, _passport.cache)

  if (!uid) return false

  const { isOn } = await _ace(_passport, {
    request: {
      id: 'QueryNode',
      nodeName: 'AceSetting',
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
