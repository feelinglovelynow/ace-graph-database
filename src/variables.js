export const REQUEST_UID_PREFIX = '_:'
export const RELATIONSHIP_PREFIX = '$r___'
export const NODE_UIDS_KEY = '$nodeUids'
export const SCHEMA_KEY = '$schema'
export const INDEX_SORT_PREFIX = '$index___sort___'
export const INDEX_EXACT_PREFIX = '$index___exact___'
export const ADD_NOW_DATE = 'now'


/**
 * @param { string } relationshipName
 * @returns { string }
 */
export function getRelationshipProp (relationshipName) {
  return `${ RELATIONSHIP_PREFIX }${ relationshipName }`
}


/**
 * @param { string } nodeName
 * @param { string } propertyKey
 * @param { string | boolean | number } propertyValue
 * @returns { string }
 */
export function getExactIndexKey (nodeName, propertyKey, propertyValue) {
  return `${ INDEX_EXACT_PREFIX }${ nodeName }___${ propertyKey }___${ String(propertyValue) }`
}


/**
 * @param { string } nodeName
 * @param { string } propertyKey
 * @returns { string }
 */
export function getSortIndexKey (nodeName, propertyKey) {
  return `${ INDEX_SORT_PREFIX }${ nodeName }___${ propertyKey }`
}


/**
 * @returns { string }
 */
export function getNow () {
  return (new Date()).toISOString()
}
