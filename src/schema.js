import { SCHEMA_KEY } from './variables.js'
import { td, enums, Schema, SchemaProp } from '#manifest'


/**
 * Get Ace Graph Database schema.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Graph Database)
 * @returns { Promise<Schema> }
 */
export async function _getSchema (storage) {
  return (await storage.get(SCHEMA_KEY)) || {}
}


/**
 * Get Ace Graph Database schema.
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @returns { Promise<Schema> }
 */
export async function getSchema (url) {
  /** @type { RequestInit } */
  const requestInit = { method: 'GET', headers: { 'content-type': 'application/json' } }
  const rFetch = await fetch(`${ url }${ enums.endpoints.getSchema }`, requestInit)
  return await rFetch.json()
}


/**
 * Set Ace Graph Database schema. This function overwrites any existing schema values.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { Schema } schema - Ace Graph Database schema
 * @returns { Promise<Schema> }
 */
export async function _setSchema (storage, schema) {
  validateSchema(schema)
  storage.put(SCHEMA_KEY, schema)
  return schema
}


/**
 * Set Ace Graph Database schema. This function overwrites any existing schema values. Example:
```
  await setSchema(url, new Schema({
    nodes: {
      User: {
        name: new SchemaProp({ dataType: enums.dataTypes.string })
      }
    },
    relationships: {
      Spouse: new SchemaRelationship({
        directions: [
          new SchemaRelationshipDirection({ nodeName: 'User', has: enums.has.one, nodePropName: 'spouse' }),
          new SchemaRelationshipDirection({ nodeName: 'User', has: enums.has.one, nodePropName: 'spouse' }),
        ],
        props: {
          _createdAt: new SchemaProp({ dataType: 'isoString', must: [ enums.must.defined ] })
        }
      })
    }
  }))
```
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { Schema } schema - Ace Graph Database schema
 * @returns { Promise<Schema> }
 */
export async function setSchema (url, schema) {
  /** @type { RequestInit } */
  const requestInit = { body: JSON.stringify(schema), method: 'POST', headers: { 'content-type': 'application/json' } }
  const rFetch = await fetch(`${ url }${ enums.endpoints.setSchema }`, requestInit)
  return await rFetch.json()
}


/** @typedef { Map<string, Set<string>> } UniqueMap */


/**
 * Validate Schema
 * @param { Schema } schema
 */
function validateSchema (schema) {
  const uniqueMap = /** @type { UniqueMap } */ (new Map())

  if (!schema.nodes || typeof schema.nodes !== 'object') throw { id: 'validateSchema__invalid-nodes', message: 'Please add nodes object', _errorData: { schema } }
  if (!schema.relationships || typeof schema.relationships !== 'object') throw { id: 'validateSchema__invalid-relationships', message: 'Please add relationships object', _errorData: { schema } }

  for (const nodeName in schema.nodes) {
    if (typeof nodeName !== 'string') throw { id: 'validateSchema__invalid-node-type', message: 'Please add node that has a type of string', _errorData: { nodeKey: nodeName, schema } }
    if (!nodeName.match(/[A-Z]{0,1}/)) throw { id: 'validateSchema__invalid-node-first-character', message: 'Please add node that starts with a capital letter (helpful for jsdoc types)', _errorData: { nodeKey: nodeName, schema } }
    if (!nodeName.match(/^[A-Za-z\_]+$/)) throw { id: 'validateSchema__invalid-node-characters', message: 'Please add node that has character a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData: { nodeKey: nodeName, schema } }

    for (const propKey in schema.nodes[nodeName]) {
      validateSchemaProp(propKey, schema.nodes[nodeName][propKey], false)
      isSchemaPropUnique(uniqueMap, nodeName, propKey)
    }
  }

  for (const relationshipName in schema.relationships) {
    const options = schema.relationships[relationshipName]
    const _errorData = { schema, relationshipName, relationship: options }

    if (typeof relationshipName !== 'string') throw { id: 'validateSchema__invalid-relationship-type', message: 'Please add relationship that has a type of string', _errorData }
    if (!relationshipName.match(/[A-Z]{0,1}/)) throw { id: 'validateSchema__invalid-relationship-first-character', message: 'Please add relationship that starts with a capital letter (helpful for jsdoc types)', _errorData }
    if (!relationshipName.match(/^[A-Za-z\_]+$/)) throw { id: 'validateSchema__invalid-relationship-characters', message: 'Please add relationship that has character a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData }
    if (!Array.isArray(options.directions) || options.directions.length !== 2) throw { id: 'validateSchema__invalid-directions-length', message: 'Please add relationship where directions is an array with a length of 2', _errorData }
    if (typeof options.directions[0] !== 'object') throw { id: 'validateSchema__invalid-direction-0', message: 'Please add relationship where directions[0] is an object', _errorData }
    if (typeof options.directions[1] !== 'object') throw { id: 'validateSchema__invalid-direction-1', message: 'Please add relationship where directions[1] is an object', _errorData }
    if (options.directions[0].nodePropName === options.directions[1].nodePropName && options.directions[0].has !== options.directions[1].has) throw { id: 'validateSchema__invalid-has', message: 'If the nodePropName for directions[0] matches the nodePropName for directions[1] the "has" property must also match', _errorData }
    if (((Object.keys(options) || []).filter(k => k !== 'directions' && k !== 'props')).length) throw { id: 'validateSchema__invalid-relationship-object', message: 'Please add a valid relationship object - { directions: [ SchemaRelationshipDirection, SchemaRelationshipDirection ], props?: { [ propName: string ]: SchemaProp } }', _errorData }

    const directionPropsMatch = options.directions[0].nodeName === options.directions[1].nodeName && options.directions[0].nodePropName === options.directions[1].nodePropName

    if (options.props) {
      if (typeof options.props !== 'object') throw { id: 'validateSchema__invalid-relationship-props', message: 'Please add only valid relationship.props type, which should be an object', _errorData }

      for (const propKey in options.props) {
        validateSchemaProp(propKey, options.props[propKey], true)

        if (directionPropsMatch) isSchemaPropUnique(uniqueMap, options.directions[0].nodeName || '', propKey)
        else {
          isSchemaPropUnique(uniqueMap, options.directions[0].nodeName || '', propKey)
          isSchemaPropUnique(uniqueMap, options.directions[1].nodeName || '', propKey)
        }
      }
    }

    for (let i = 0; i < options.directions.length; i++) {
      const direction = options.directions[i]

      if (!direction.has || !enums.has[direction.has]) throw { id: 'validateSchema__invalid-relationship-has', message: 'Please add relationship "has" that is included @ enums.has', _errorData: { ..._errorData, direction } }
      validateSchemaPropKey(direction.nodePropName || '', false)

      if (!direction.nodeName || typeof direction.nodeName !== 'string') throw { id: 'validateSchema__invalid-relationship-node', message: 'Please add relationship "node" with a type of string', _errorData: { ..._errorData, direction } }
      if (!direction.nodePropName || typeof direction.nodePropName !== 'string') throw { id: 'validateSchema__invalid-relationship-name', message: 'Please add relationship "name" with a type of string', _errorData: { ..._errorData, direction } }
      if (!direction.nodePropName.match(/[A-Z]{0,1}/)) throw { id: 'validateSchema__invalid-relationship-first-character', message: 'Please add relationship that starts with a capital letter (helpful for jsdoc types)', _errorData }
      if (!direction.nodePropName.match(/^[A-Za-z\_]+$/)) throw { id: 'validateSchema__invalid-relationship-characters', message: 'Please add relationship that has character a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData }

      validateSchemaMust(_errorData, direction.must)
      if (!directionPropsMatch || i !== 1) isSchemaPropUnique(uniqueMap, direction.nodeName, direction.nodePropName)
    }
  }
}


/**
 * Validate Schema Property
 * @param { string } key - Property Key
 * @param { SchemaProp } value - Property Value
 * @param { boolean } isRelationshipProp
 */
function validateSchemaProp (key, value, isRelationshipProp) {
  validateSchemaPropKey(key, isRelationshipProp)

  if (!value.dataType) throw { id: 'validateSchemaProp__falsy-data-type', message: 'Please add is (dataType) to schema\'s propertyValue', _errorData: { key, value } }
  if (!enums.dataTypes[value.dataType]) throw { id: 'validateSchemaProp__invalid-data-type', message: `Please add is (dataType) that is a valid enums.dataTypes. Valuid options are ${ enums.dataTypes }`, _errorData: { key, value } }
  if (key === 'must') validateSchemaMust({ key, value }, value.must)

  if (value.indices) {
    for (const index of value.indices) {
      if (!enums.indices[index]) throw { id: 'validateSchemaProp__invalid-index', message: `Please only include valid indices. Valid options are ${ enums.indices }`, _errorData: { key, value } } 
    }
  }
}


/**
 * Validate Schema Property
 * @param { string } key - Property Key
 * @param { boolean } isRelationshipProp
 */
function validateSchemaPropKey (key, isRelationshipProp) {
  if (typeof key !== 'string') throw { id: 'validateSchemaPropKey__invalid-typeof', message: 'Please add propKey that has a type of string', _errorData: { key } }
  if (key.startsWith('ace')) throw { id: 'validateSchemaPropKey__ace-start', message: 'Please add propKey that does not start with "ace"', _errorData: { key } }
  if (!key.match(/^[A-Za-z\_]+$/)) throw { id: 'validateSchemaPropKey__invalid-characters', message: 'Please add propKey that has characters a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData: { key } }
  if (isRelationshipProp && !key.startsWith('_')) throw { id: 'validateSchemaPropKey__add-underscore', message: 'Please start relationship props with an underscore, this helps know what props in a query are relationship props', _errorData: { key } }
  if (!isRelationshipProp && key.startsWith('_')) throw { id: 'validateSchemaPropKey__remove-underscore', message: 'Please do not start node props with an underscore, relationship props start with an underscore, this helps know what props in a query are relationship props', _errorData: { key } }
}


/**
 * Validate a schema must array
 * @param { any } _errorData
 * @param { enums.must[] } [ must ]
 */
function validateSchemaMust (_errorData, must) {
  if (must) {
    if (!Array.isArray(must)) throw { id: 'validateSchema__invalid-relationship-must-array', message: 'Please add must as an array (must is not required but if it is defined it must be an array)', _errorData }

    for (const m of must) {
      if (!enums.must[m]) throw { id: 'validateSchema__invalid-relationship-must', message: `Please add must that is included in enums.must. Valid options are ${ enums.must }`, _errorData }
    }
  }
}


/**
 * @param { UniqueMap } uniqueMap 
 * @param { string } nodeName 
 * @param { string } propKey 
 */
function isSchemaPropUnique (uniqueMap, nodeName, propKey) {
  const set = uniqueMap.get(nodeName) || new Set()

  if (set.has(propKey)) throw { id: 'validateSchema__is-schema-prop-unique', message: 'Please ensure all schema props are unique', _errorData: { nodeName, propKey } }
  else {
    set.add(propKey)
    uniqueMap.set(nodeName, set)
  }
}
