// INTERNAL OR EXTERNAL (So exported @ index.js)

// import { enums } from "#manifest"

export const ADD_NOW_DATE = 'now'
export const REQUEST_UID_PREFIX = '_:'
export const REQUEST_TOKEN_HEADER = 'ace_api_token'


/** @returns { string } */
export function getNow () {
  return (new Date()).toISOString()
}






// INTERNAL ONLY (So not exported @ index.js)

export const DELIMITER = '___'
export const SCHEMA_KEY = '$schema'
export const RELATIONSHIP_PREFIX = '$r' + DELIMITER
export const NODE_UIDS_PREFIX = '$node' + DELIMITER + 'uids' + DELIMITER
export const INDEX_SORT_PREFIX = '$index' + DELIMITER + 'sort' + DELIMITER
export const INDEX_UNIQUE_PREFIX = '$index' + DELIMITER + 'unique' + DELIMITER
export const RELATIONSHIP_UIDS_PREFIX = '$relationship' + DELIMITER + 'uids' + DELIMITER

export const ACE_NODE_NAMES = new Set([
  'AceSetting',
  'AceUser',
  'AceToken',
  'AceRole',
  'AcePermission',
])


/**
 * @param { string } relationshipName
 * @returns { string }
 */
export function getRelationshipProp (relationshipName) {
  return RELATIONSHIP_PREFIX + relationshipName
}


/**
 * @param { string } prop
 * @returns { string }
 */
export function getRelationshipNameFromProp (prop) {
  return prop.split(RELATIONSHIP_PREFIX)?.[1]
}


/**
 * @param { string } name - Node name or relationship name
 * @param { string } propertyKey
 * @param { string | boolean | number } propertyValue
 * @returns { string }
 */
export function getUniqueIndexKey (name, propertyKey, propertyValue) {
  return INDEX_UNIQUE_PREFIX + name + DELIMITER + propertyKey + DELIMITER + String(propertyValue)
}


/**
 * @param { string } name - Node name or relationship name
 * @param { string } propertyKey
 * @returns { string }
 */
export function getSortIndexKey (name, propertyKey) {
  return INDEX_SORT_PREFIX + name + DELIMITER + propertyKey
}


/**
 * @param { string } nodeName
 * @returns { string }
 */
export function getNodeUidsKey (nodeName) {
  return NODE_UIDS_PREFIX + nodeName
}


/**
 * @param { string } relationshipName
 * @returns { string }
 */
export function getRelationshipUidsKey (relationshipName) {
  return RELATIONSHIP_UIDS_PREFIX + relationshipName
}


/**
 * @param { { action: *, schema?: boolean, nodeName?: string, relationshipName?: string, propName?: string } } x 
 * @returns { string }
 */
export function getRevokesKey (x) {
  let response = ''

  if (x.schema) response = x.action + DELIMITER + 'schema'
  else if (x.nodeName || x.relationshipName) response = x.action + DELIMITER + (x.nodeName || x.relationshipName) + DELIMITER + x.propName

  return response
}


/**
 * @param { string } nodeName 
 * @param { string } relationshipName 
 * @returns { string }
 */
export function getNodeNamePlusRelationshipNameToNodePropNameMapKey (nodeName, relationshipName) {
  return nodeName + DELIMITER + relationshipName
}
