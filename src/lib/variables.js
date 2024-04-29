// INTERNAL OR EXTERNAL (So exported @ index.js / index.ts)

export const ADD_NOW_DATE = 'now'
export const REQUEST_UID_PREFIX = '_:'
export const REQUEST_TOKEN_HEADER = 'ace_api_token'

export const PRE_QUERY_OPTIONS_FLOW = [
  'flow',
  'alias',
  'all',
  'sort', // IF sort schema index is defined for the sort prop, then we get sorted uids from index
  'findByUid',
  'findBy_Uid',
  'findByUnique',
  'filterByUids',
  'filterBy_Uids',
  'filterByUniques',
  'publicJWKs',
]

export const DEFAULT_QUERY_OPTIONS_FLOW = [ // configurable
  'countAsProp',
  'sumAsProp',
  'avgAsProp',
  'minAmtAsProp',
  'maxAmtAsProp',

  'newProps',
  'propAdjToRes',

  'findByOr',
  'findByAnd',
  'findByDefined',
  'findByUndefined',
  'findByPropValue',
  'findByPropProp',
  'findByPropRes',

  'filterByOr',
  'filterByAnd',
  'filterByDefined',
  'filterByUndefined',
  'filterByPropValue',
  'filterByPropProp',
  'filterByPropRes',

  'sort', // IF sort schema index is not defined for the sort prop then we manually sort
  'limit',
]

export const POST_QUERY_OPTIONS_FLOW = [
  'resHide',
  'propAsRes',
  'countAsRes',
  'sumAsRes',
  'avgAsRes',
  'minAmtAsRes',
  'maxAmtAsRes',
  'minNodeAsRes',
  'maxNodeAsRes',
]


/** @returns { string } */
export function getNow () {
  return (new Date()).toISOString()
}






// INTERNAL ONLY (So not exported @ index.js / index.ts)

export const DELIMITER = '___'
export const SCHEMA_KEY = '$schema'
export const RELATIONSHIP_PREFIX = '$r' + DELIMITER
export const NODE_UIDS_PREFIX = '$index' + DELIMITER + 'nodes' + DELIMITER
export const INDEX_SORT_PREFIX = '$index' + DELIMITER + 'sort' + DELIMITER
export const INDEX_UNIQUE_PREFIX = '$index' + DELIMITER + 'unique' + DELIMITER
export const RELATIONSHIP_UIDS_PREFIX = '$index' + DELIMITER + 'relationships' + DELIMITER


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
 * @param { { action: *, schema?: boolean, node?: string, relationship?: string, prop?: string } } x 
 * @returns { string }
 */
export function getRevokesKey (x) {
  let response = ''

  if (x.schema) response = x.action + DELIMITER + 'schema'
  else if (x.node || x.relationship) response = x.action + DELIMITER + (x.node || x.relationship) + DELIMITER + x.prop

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
