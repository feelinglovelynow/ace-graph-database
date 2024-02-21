import { error } from './throw.js'
import { td, enums } from '#manifest'
import { SCHEMA_KEY } from './variables.js'


/**
 * Get Ace Graph Database schema.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Graph Database)
 * @returns { Promise<td.Schema> }
 */
export async function _getSchema (storage) {
  return await storage.get(SCHEMA_KEY)
}


/**
 * Get Ace Graph Database schema.
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @returns { Promise<td.Schema> }
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
 * @param { td.Schema } schema - Ace Graph Database schema
 * @returns { Promise<td.Schema> }
 */
export async function _setSchema (storage, schema) {
  try {
    storage.put(SCHEMA_KEY, validateSchema(schema))
    return schema
  } catch (e) {
    console.log('error', e)
    throw e
  }
}


/**
 * Set Ace Graph Database schema. This function overwrites any existing schema values. Example:
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { td.Schema } schema - Ace Graph Database schema
 * @returns { Promise<td.Schema> }
 */
export async function setSchema (url, schema) {
  /** @type { RequestInit } */
  const requestInit = { body: JSON.stringify(schema), method: 'POST', headers: { 'content-type': 'application/json' } }
  const rFetch = await fetch(`${ url }${ enums.endpoints.setSchema }`, requestInit)
  return await rFetch.json()
}


/**
 * Validate Schema
 * @param { td.Schema } schema
 */
function validateSchema (schema) {
  if (!schema.nodes || typeof schema.nodes !== 'object' || Array.isArray(schema.nodes)) throw error('schema__invalid-nodes', 'The provided schema requires a nodes object please', { schema })
  if (schema.relationships && (typeof schema.relationships !== 'object' || Array.isArray(schema.relationships))) throw error('schema__invalid-relationships', 'If you would love to provide relationships with your schema, please pass it as an object', { schema })

  const nodeNameSet = new Set()
  const relationshipNameSet = new Set()
  const relationshipPropNodeNameSet = new Set()
  const relationshipNames = Object.keys(schema.relationships || {})
  const uniqueNodePropsMap = /** Map<nodeName, Set<nodePropName>> @type { Map<string, Set<string>> } */ (new Map()) // each nodePropName is unique for the nodeName
  const uniqueRelationshipPropsMap = /** Map<relationshipName, Set<propName>> @type { Map<string, Set<string>> } */ (new Map()) // each relationshipPropName is unique for the relationshipName
  const directionsMap = /** Map<relationshipName, [{ nodeName, nodePropName, id }]> @type { Map<string, { nodeName: String, nodePropName: string, id: (typeof enums.idsSchema.ForwardRelationshipProp | typeof enums.idsSchema.ReverseRelationshipProp | typeof enums.idsSchema.BidirectionalRelationshipProp) }[]> } */ (new Map())

  for (const nodeName in schema.nodes) {
    if (nodeNameSet.has(nodeName)) throw error('schema__not-unique-node-name', `The node name ${ nodeName } is not unique, please ensure each nodeName is unique`, { nodeName, schema })

    nodeNameSet.add(nodeName)

    if (typeof nodeName !== 'string') throw error('schema__invalid-node-type', `The node name ${ nodeName } is an invalid type, please add node that is a type of string`, { nodeName, schema })
    if (!nodeName.match(/[A-Z]{0,1}/)) throw error('schema__invalid-node-first-character', `The node name ${ nodeName } is does not start with a capital letter, please add node names that start with a capital letters (helpful for generated jsdoc and ts types)`, { nodeName, schema })
    if (!nodeName.match(/^[A-Za-z\_]+$/)) throw error('schema__invalid-node-characters', `The node name ${ nodeName } has invalid characters, please add node names that have characters a-z or A-Z or underscores (helpful for generated jsdoc and ts types)`, { nodeName, schema })

    for (const nodePropName in schema.nodes[nodeName]) {
      validateSchemaProp(nodePropName, schema.nodes[nodeName][nodePropName], false)

      const prop = schema.nodes[nodeName][nodePropName]

      if (prop.id === enums.idsSchema.Prop) {
        const mapValue = uniqueNodePropsMap.get(nodeName)

        if (!mapValue) uniqueNodePropsMap.set(nodeName, new Set([ nodePropName ]))
        else {
          if (mapValue.has(nodePropName)) throw error('schema__not-unique-node-prop-name', `The node name ${ nodeName } and prop name ${ nodePropName } is not unique, please ensure all node prop names are unique for the node`, { nodeName, nodePropName, schema })
          else mapValue.add(nodePropName)
        }
      } else {
        const schemaRelationshipProp = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (prop)
        const mapValue = directionsMap.get(schemaRelationshipProp.x.relationshipName)
        const arrayValue = { nodeName, nodePropName, id: schemaRelationshipProp.id }

        if (!mapValue) directionsMap.set(schemaRelationshipProp.x.relationshipName, [arrayValue])
        else mapValue.push(arrayValue)

        relationshipPropNodeNameSet.add(schemaRelationshipProp.x.nodeName)
      }
    }
  }

  relationshipPropNodeNameSet.forEach(relationshipPropNodeName => {
    if (!nodeNameSet.has(relationshipPropNodeName)) throw error('schema__invalid-relationship-prop-node-name', `The node name ${ relationshipPropNodeName } that is defined as a prop nodeName is not defined @ schema.nodes, please add relationship prop node names that are valid (a node in the schema)`, { nodeName: relationshipPropNodeName, schema})
  })

  for (const relationshipName of relationshipNames) {
    if (relationshipNameSet.has(relationshipName)) throw error('schema__not-unique-relationship-name', `The relationship name ${ relationshipName } is not unique, please ensure each relationshipName is unique`, { relationshipName, schema })

    relationshipNameSet.add(relationshipName)

    const relationship = schema.relationships?.[relationshipName]
    const _errorData = { relationshipName, relationship }

    if (typeof relationshipName !== 'string') throw error('schema__invalid-relationship-type', `The relationship name ${ relationshipName } is not a type of string, please add relationships that are a type of string`, _errorData)
    if (!relationshipName.match(/^[A-Za-z\_]+$/)) throw error('schema__invalid-relationship-characters', `The relationship name ${ relationshipName } has invalid characters, please add relationships include characters a-z or A-Z or underscores (helpful for generated jsdoc and ts types)`, _errorData)
    if (relationship?.id !== enums.idsSchema.OneToOne && relationship?.id !== enums.idsSchema.ManyToMany && relationship?.id !== enums.idsSchema.OneToMany) throw error('schema__invalid-relationship-id', `The relationship name ${ relationshipName } is invalid b/c relationship?.id is invalid, please ensure relationships have a valid relationship id of OneToOne, OneToMany or ManyToMany`, _errorData)

    if (relationship.x?.props) {
      if (typeof relationship.x.props !== 'object' || Array.isArray(relationship.x.props)) throw error('schema__invalid-relationship-props', `The relationship name ${ relationshipName } has invalid props, if you'd love to include props please ensure relationship.props type, is an object`, _errorData)

      for (const propName in relationship.x.props) {
        validateSchemaProp(propName, relationship.x.props[propName], true)

        const mapValue = uniqueRelationshipPropsMap.get(relationshipName)

        if (!mapValue) uniqueRelationshipPropsMap.set(relationshipName, new Set([propName]))
        else {
          if (mapValue.has(propName)) throw error('schema__not-unique-relationship-prop-name', `The relationship name ${ relationshipName } and the prop name ${ propName } has props that are not unique, please ensure all relationship prop names are unique for the node`, { relationshipName, propName })
          else mapValue.add(propName)
        }
      }
    }
  }

  if (relationshipNames.length !== directionsMap.size) throw error('schema__invalid-relationships', 'All relationships listed in schema.nodes must also be listed in schema.relationships', { schemaNodeRelationships: directionsMap.keys(), schemaRelationships: relationshipNames })

  if (relationshipNames.length) {
    for (const relationshipName of relationshipNames) {
      const directions = directionsMap.get(relationshipName)
      const notify = () => error('schema__invalid-relationship-alignment', `The relationship name ${ relationshipName } has invalid props, please ensure each relationship has 1 bidirectional relationship prop that is not an inverse or 2 relationship props where one is inverse and neither is bidirectional`, { relationshipName, directions })

      if (!directions) throw notify()
      if (directions.length !== 1 && directions.length !== 2) throw notify()
      if (directions.length === 1) {
        if (directions[0].id === enums.idsSchema.ReverseRelationshipProp) throw notify()
        if (directions[0].id !== enums.idsSchema.BidirectionalRelationshipProp) throw notify()
      }
      if (directions.length === 2) {
        if ((directions[0].id === enums.idsSchema.ReverseRelationshipProp && directions[1].id !== enums.idsSchema.ReverseRelationshipProp) && (directions[0].id !== enums.idsSchema.ReverseRelationshipProp && directions[1].id === enums.idsSchema.ReverseRelationshipProp)) throw notify()
        if (directions[0].id === enums.idsSchema.BidirectionalRelationshipProp || directions[1].id === enums.idsSchema.BidirectionalRelationshipProp) throw notify()
      }
    }
  }

  return schema
}


/**
 * Validate Schema Property
 * @param { string } propName
 * @param { td.SchemaProp | td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp | td.SchemaRelationshipProp } propValue
 * @param { boolean } isRelationshipProp
 */
function validateSchemaProp (propName, propValue, isRelationshipProp) {
  validatePropertyKey(propName, isRelationshipProp)

  switch (propValue.id) {
    case enums.idsSchema.Prop:
    case enums.idsSchema.RelationshipProp:
      const schemaProp = /** @type { td.SchemaProp } */ (propValue)

      if (!schemaProp.x.dataType) throw error('schema__falsy-data-type', `The schema prop ${ propName } is because its dataType is falsy, Please ensure every data type is valid`, { propName, propValue })
      if (!enums.dataTypes[schemaProp.x.dataType]) throw error('schema__invalid-data-type', `The schema prop ${ propName } is invalid because its dataType is not a valid option, please add a dataType that is a valid enums.dataTypes. Valid options include ${ enums.dataTypes }`, { propName, propValue })
      break
    case enums.idsSchema.ForwardRelationshipProp:
    case enums.idsSchema.ReverseRelationshipProp:
    case enums.idsSchema.BidirectionalRelationshipProp:
      const schemaRelationshipProp = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (propValue)

      if (isRelationshipProp) throw error('schema__invalid-id', `The schema prop ${ propName } is invalid because prop's must have an id of "SchemaProp" and not "SchemaRelationshipProp"`, { propName, propValue })
      if (schemaRelationshipProp.x.has !== enums.has.one && schemaRelationshipProp.x.has !== enums.has.many) throw error('schema__invalid-has', `The schema prop ${ propName } is invalid because has is not "one" or "many", please ensure "has" is "one" or "many"`, { propName, propValue })
      if (typeof schemaRelationshipProp.x.nodeName !== 'string' || !schemaRelationshipProp.x.nodeName) throw error('schema__invalid-node-name', `The schema prop ${ propName } is invalid because the nodeName is not a truthy string, please ensure each schema prop that has a truthy string nodeName`, { propName, propValue })
      if (typeof schemaRelationshipProp.x.relationshipName !== 'string' || !schemaRelationshipProp.x.relationshipName) throw error('schema__invalid-relationship-name', `The schema prop ${ propName } is invalid because the relationshipName is not a truthy string, please ensure each schema prop that has a truthy string relationshipName`, { propName, propValue })
      break
    default:
      if (isRelationshipProp) throw error('schema__invalid-id', `The schema prop ${ propName } is invalid because prop's must include an id of "SchemaProp"`, { propName, propValue })
      break
  }
}


/**
 * Validate Schema Property Key
 * @param { string } propertyKey
 * @param { boolean } isRelationshipProp
 */
function validatePropertyKey (propertyKey, isRelationshipProp) {
  if (typeof propertyKey !== 'string') throw error('validatePropertyKey___invalid-typeof', `The property key ${ propertyKey } is invalid because it is not a type of string, please ensure each property key has a type of string`, { propertyKey })
  if (propertyKey.toLowerCase().startsWith('ace')) throw error('validatePropertyKey___ace-start', `The property key ${propertyKey } is invalid because it starts with "ace", please ensure no property keys start with "ace"`, { propertyKey })
  if (!propertyKey.match(/^[A-Za-z\_]+$/)) throw error('validatePropertyKey___invalid-characters', `The property key ${ propertyKey } is invalid because it includes invalid characters, please ensure each property key has characters a-z or A-Z or underscores (helpful for generated jsdoc and ts types)`, { propertyKey })
  if (isRelationshipProp && !propertyKey.startsWith('_')) throw error('validatePropertyKey___add-underscore', `The property key ${ propertyKey } is invalid because this is a relationship prop that does not start with an underscore, please start relationship props with an underscore, this helps know what props in a query are relationship props`, { propertyKey })
  if (!isRelationshipProp && propertyKey.startsWith('_')) throw error('validatePropertyKey___remove-underscore', `The property key ${ propertyKey } is invalid because it is not a relationship prop but it starts with an underscore, please do not start node props with an underscore, relationship props start with an underscore, this helps know what props in a query are relationship props`, { propertyKey })
}
