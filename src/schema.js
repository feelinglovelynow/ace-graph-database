import { SCHEMA_KEY } from './variables.js'
import { td, enums, Schema, SchemaProp, SchemaRelationshipProp } from '#manifest'
import { getRelationshipOptionsDetails } from './getRelationshipOptionsDetails.js'


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
  try {
    storage.put(SCHEMA_KEY, validateSchema(schema))
    return schema
  } catch (error) {
    console.log('error', error)
    throw error
  }
}


/**
 * Set Ace Graph Database schema. This function overwrites any existing schema values. Example:
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


/**
 * Validate Schema
 * @param { Schema } schema
 */
function validateSchema (schema) {
  if (!schema.nodes || typeof schema.nodes !== 'object') throw { id: 'validateSchema__invalid-nodes', message: 'Please add nodes object', _errorData: { schema } }
  if (!schema.relationships || typeof schema.relationships !== 'object') throw { id: 'validateSchema__invalid-relationships', message: 'Please add relationships object', _errorData: { schema } }

  const nodeNameSet = new Set()
  const relationshipNameSet = new Set()
  const relationshipPropNodeNameSet = new Set()
  const relationshipNames = Object.keys(schema.relationships) || []
  const directionsMap = /** Map<relationshipName, [{ nodeName, nodePropName, isBidirectional, isInverse }]> @type { Map<string, { nodeName: String, nodePropName: string, isBidirectional: boolean, isInverse: boolean }[]> } */ (new Map())
  const uniqueNodePropsMap = /** Map<nodeName, Set<nodePropName>> @type { Map<string, Set<string>> } */ (new Map()) // each nodePropName is unique for the nodeName
  const uniqueRelationshipPropsMap = /** Map<relationshipName, Set<propName>> @type { Map<string, Set<string>> } */ (new Map()) // each relationshipPropName is unique for the relationshipName

  for (const nodeName in schema.nodes) {
    if (nodeNameSet.has(nodeName)) throw { id: 'validateSchema__not-unique-node-name', message: 'Please ensure each nodeName is unique', _errorData: { nodeName, schema } }

    nodeNameSet.add(nodeName)

    if (typeof nodeName !== 'string') throw { id: 'validateSchema__invalid-node-type', message: 'Please add node that has a type of string', _errorData: { nodeName, schema } }
    if (!nodeName.match(/[A-Z]{0,1}/)) throw { id: 'validateSchema__invalid-node-first-character', message: 'Please add node that starts with a capital letter (helpful for jsdoc types)', _errorData: { nodeName, schema } }
    if (!nodeName.match(/^[A-Za-z\_]+$/)) throw { id: 'validateSchema__invalid-node-characters', message: 'Please add node that has character a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData: { nodeName, schema } }

    for (const nodePropName in schema.nodes[nodeName]) {
      validateSchemaProp(nodePropName, schema.nodes[nodeName][nodePropName], false)

      const prop = schema.nodes[nodeName][nodePropName]

      if (prop.info.name === enums.classInfoNames.SchemaProp) {
        const mapValue = uniqueNodePropsMap.get(nodeName)

        if (!mapValue) uniqueNodePropsMap.set(nodeName, new Set([ nodePropName ]))
        else {
          if (mapValue.has(nodePropName)) throw { id: 'validateSchema__not-unique-node-prop-name', message: 'Please ensure all node prop names are unique for the node', _errorData: { nodeName, nodePropName, schema } }
          else mapValue.add(nodePropName)
        }
      } else {
        const schemaRelationshipProp = /** @type { SchemaRelationshipProp } */ (prop)
        const mapValue = directionsMap.get(schemaRelationshipProp.relationshipName)
        const { isInverse, isBidirectional } = getRelationshipOptionsDetails(schemaRelationshipProp.options)
        const arrayValue = { nodeName, nodePropName, isBidirectional, isInverse }

        if (!mapValue) directionsMap.set(schemaRelationshipProp.relationshipName, [arrayValue])
        else mapValue.push(arrayValue)

        relationshipPropNodeNameSet.add(schemaRelationshipProp.nodeName)
      }
    }
  }

  relationshipPropNodeNameSet.forEach(relationshipPropNodeName => {
    if (!nodeNameSet.has(relationshipPropNodeName)) throw { id: 'validateSchema__invalid-relationship-prop-node-name', message: 'Please add relationship prop node names that are valid (a node in the schema)', _errorData: { schema, nodeName: relationshipPropNodeName } }
  })

  for (const relationshipName of relationshipNames) {
    if (relationshipNameSet.has(relationshipName)) throw { id: 'validateSchema__not-unique-relationship-name', message: 'Please ensure each relationshipName is unique', _errorData: { relationshipName, schema } }

    relationshipNameSet.add(relationshipName)

    const relationship = schema.relationships[relationshipName]
    const _errorData = { schema, relationshipName, relationship }

    if (typeof relationshipName !== 'string') throw { id: 'validateSchema__invalid-relationship-type', message: 'Please add relationship that has a type of string', _errorData }
    if (!relationshipName.match(/^[A-Za-z\_]+$/)) throw { id: 'validateSchema__invalid-relationship-characters', message: 'Please add relationship that has character a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData }
    if (relationship.info.name !== enums.classInfoNames.SchemaOneToOne && relationship.info.name !== enums.classInfoNames.SchemaOneToMany && relationship.info.name !== enums.classInfoNames.SchemaManyToMany) throw { id: 'validateSchema__invalid-relationship-info-name', message: 'Please ensure relationships have a valid relationship info name of SchemaOneToOne, SchemaOneToMany or SchemaManyToMany', _errorData }

    if (relationship.props) {
      if (typeof relationship.props !== 'object') throw { id: 'validateSchema__invalid-relationship-props', message: 'Please add only valid relationship.props type, which should be an object', _errorData }

      for (const propName in relationship.props) {
        validateSchemaProp(propName, relationship.props[propName], true)

        const mapValue = uniqueRelationshipPropsMap.get(relationshipName)

        if (!mapValue) uniqueRelationshipPropsMap.set(relationshipName, new Set([propName]))
        else {
          if (mapValue.has(propName)) throw { id: 'validateSchema__not-unique-relationship-prop-name', message: 'Please ensure all relationship prop names are unique for the node', _errorData: { relationshipName, propName, schema } }
          else mapValue.add(propName)
        }
      }
    }
  }

  if (relationshipNames.length !== directionsMap.size) throw { id: 'validateSchema__invalid-relationships', message: 'All relationships listed in nodes must also be listed in relationships', _errorData: { nodeRelationshipNames: directionsMap.keys(), relationshipNames } }

  if (relationshipNames.length) {
    for (const relationshipName of relationshipNames) {
      const directions = directionsMap.get(relationshipName)
      const error = { id: 'validateSchema__invalid-relationship-alignment', message: 'Please ensure each relationshipName has 1 bidirectional relationship prop that is not an inverse or 2 relationship props where one is inverse and neither is bidirectional', _errorData: { relationshipName, directions } }

      if (!directions) throw error
      if (directions.length !== 1 && directions.length !== 2) throw error
      if (directions.length === 1) {
        if (directions[0].isInverse) throw error
        if (!directions[0].isBidirectional) throw error
      }
      if (directions.length === 2) {
        if ((directions[0].isInverse && !directions[1].isInverse) && (!directions[0].isInverse && directions[1].isInverse)) throw error
        if (directions[0].isBidirectional || directions[1].isBidirectional) throw error
      }
    }
  }

  return schema
}


/**
 * Validate Schema Property
 * @param { string } propName
 * @param { SchemaProp | SchemaRelationshipProp } propValue
 * @param { boolean } isRelationshipProp
 */
function validateSchemaProp (propName, propValue, isRelationshipProp) {
  validatePropertyKey(propName, isRelationshipProp)

  switch (propValue.info.name) {
    case enums.classInfoNames.SchemaProp:
      const schemaProp = /** @type { SchemaProp } */ (propValue)

      if (!schemaProp.dataType) throw { id: 'validateSchemaProp__falsy-data-type', message: 'Please add is (dataType) to schema\'s propertyValue', _errorData: { key: propName, value: schemaProp } }
      if (!enums.dataTypes[schemaProp.dataType]) throw { id: 'validateSchemaProp__invalid-data-type', message: `Please add is (dataType) that is a valid enums.dataTypes. Valuid options are ${ enums.dataTypes }`, _errorData: { key: propName, value: schemaProp } }

      if (schemaProp.options) {
        if (!Array.isArray(schemaProp.options)) throw { id: 'validateSchemaProp__invalid-options', message: 'If you would love to include options please define them as an array', _errorData: { schemaProp } }

        for (const option of schemaProp.options) {
          if (!enums.schemaPropOptions[option]) throw { id: 'validateSchemaProp__invalid-option', message: `Please include options that are an option thatis one of the following ${ enums.schemaPropOptions }`, _errorData: { schemaProp, option } }
        }
      }

      if (schemaProp.indices) {
        for (const index of schemaProp.indices) {
          if (!enums.indices[index]) throw { id: 'validateSchemaProp__invalid-index', message: `Please only include valid indices. Valid options are ${ enums.indices }`, _errorData: { key: propName, value: schemaProp, index } }
        }
      }
      break
    case enums.classInfoNames.SchemaRelationshipProp:
      const schemaRelationshipProp = /** @type { SchemaRelationshipProp } */ (propValue)

      if (isRelationshipProp) throw { id: 'validateSchemaProp___invalid-info-name', message: `Because ${ propName } is a relationship prop it should be structured like a new SchemaProp()`, _errorData: { propName, value: schemaRelationshipProp } }
      if (schemaRelationshipProp.has !== enums.has.one && schemaRelationshipProp.has !== enums.has.many) throw { id: 'validateSchemaProp___invalid-has', message: 'Please add schema prop that has a "has" property of "one" or "many"', _errorData: { key: propName, value: schemaRelationshipProp } }
      if (typeof schemaRelationshipProp.nodeName !== 'string' || !schemaRelationshipProp.nodeName) throw { id: 'validateSchemaProp___invalid-node-name', message: 'Please add a schema prop that has a string truthy node name', _errorData: { key: propName, value: schemaRelationshipProp } }
      if (typeof schemaRelationshipProp.relationshipName !== 'string' || !schemaRelationshipProp.relationshipName) throw { id: 'validateSchemaProp___invalid-relationship-name', message: 'Please add a schema prop that has a string truthy relationship name', _errorData: { key: propName, value: schemaRelationshipProp } }

      if (schemaRelationshipProp.options) {
        if (!Array.isArray(schemaRelationshipProp.options)) throw { id: 'validateSchemaProp___options-not-array', message: 'Please include options that are an array', _errorData: { key: propName, value: schemaRelationshipProp } }

        let includesBidirectional, includesInverse

        for (const option of schemaRelationshipProp.options) {
          if (!enums.schemaRelationshipPropOptions[option]) throw { id: 'validateSchemaProp__invalid-option', message: `Please include options that are an option thatis one of the following ${ enums.schemaPropOptions }`, _errorData: { option, schemaRelationshipProp } }
          if (option === enums.schemaRelationshipPropOptions.inverse) includesInverse = true
          if (option === enums.schemaRelationshipPropOptions.bidirectional) includesBidirectional = true
        }

        if (includesBidirectional && includesInverse) throw { id: 'validateSchemaProp__inverse-and-bidirectional', message: 'Prop may not be inverse and bidirectional at the same time', _errorData: { options: schemaRelationshipProp.options } }
      }
      break
    default:
      if (isRelationshipProp) throw { id: 'validateSchemaProp___invalid-info-name', message: `Because ${ propName } is a relationship prop it should be structured like a new SchemaProp()`, _errorData: { propName, propValue } }
      break
  }
}


/**
 * Validate Schema Property Key
 * @param { string } propertyKey
 * @param { boolean } isRelationshipProp
 */
function validatePropertyKey (propertyKey, isRelationshipProp) {
  if (typeof propertyKey !== 'string') throw { id: 'validatePropertyKey___invalid-typeof', message: 'Please add propKey that has a type of string', _errorData: { key: propertyKey } }
  if (propertyKey.toLowerCase().startsWith('ace')) throw { id: 'validatePropertyKey___ace-start', message: 'Please add propKey that does not start with "ace"', _errorData: { key: propertyKey } }
  if (!propertyKey.match(/^[A-Za-z\_]+$/)) throw { id: 'validatePropertyKey___invalid-characters', message: 'Please add propKey that has characters a-z or A-Z or underscores (helpful for jsdoc types & db keys)', _errorData: { key: propertyKey } }
  if (isRelationshipProp && !propertyKey.startsWith('_')) throw { id: 'validatePropertyKey___add-underscore', message: 'Please start relationship props with an underscore, this helps know what props in a query are relationship props', _errorData: { key: propertyKey } }
  if (!isRelationshipProp && propertyKey.startsWith('_')) throw { id: 'validatePropertyKey___remove-underscore', message: 'Please do not start node props with an underscore, relationship props start with an underscore, this helps know what props in a query are relationship props', _errorData: { key: propertyKey } }
}
