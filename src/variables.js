// INTERNAL OR EXTERNAL (So exported @ index.js)

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
export const NODE_UIDS_KEY = '$nodeUids'
export const RELATIONSHIP_PREFIX = '$r' + DELIMITER
export const INDEX_SORT_PREFIX = '$index' + DELIMITER + 'sort' + DELIMITER
export const INDEX_UNIQUE_PREFIX = '$index' + DELIMITER + 'unique' + DELIMITER


/**
 * @param { string } relationshipName
 * @returns { string }
 */
export function getRelationshipProp (relationshipName) {
  return RELATIONSHIP_PREFIX + relationshipName
}


/**
 * @param { string } nodeName
 * @param { string } propertyKey
 * @param { string | boolean | number } propertyValue
 * @returns { string }
 */
export function getUniqueIndexKey (nodeName, propertyKey, propertyValue) {
  return INDEX_UNIQUE_PREFIX + nodeName + DELIMITER + propertyKey + DELIMITER + String(propertyValue)
}


/**
 * @param { string } nodeName
 * @param { string } propertyKey
 * @returns { string }
 */
export function getSortIndexKey (nodeName, propertyKey) {
  return INDEX_SORT_PREFIX + nodeName + DELIMITER + propertyKey
}


/**
 * @param { { action: 'read' | 'write', schema?: boolean, nodeName?: string | null, relationshipName?: string | null, propName?: string | null } } x 
 * @returns { string }
 */
export function getRevokesKey (x) {
  let response = ''

  if (x.schema) response = x.action + DELIMITER + 'schema'
  else if (x.nodeName || x.relationshipName) response = x.action + DELIMITER + (x.nodeName || x.relationshipName) + DELIMITER + x.propName

  return response
}
