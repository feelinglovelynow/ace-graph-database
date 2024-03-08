import { error } from './throw.js'
import { td, enums } from '#manifest'
import { stamp } from './passport.js'
import { fetchJSON } from './fetchJSON.js'
import { SCHEMA_KEY, getRevokesKey } from './variables.js'


/**
 * Get Ace Graph Database Schema
 * @param { td.AceCore } core
 * @returns { Promise<td.Schema> }
 */
export async function getSchema(core) {
  return fetchJSON(core.url + enums.endpoints.getSchema, core.token, { method: 'GET' })
}


/**
 * Get Ace Graph Database Schema
 * @param { td.AcePassport } passport
 * @returns { Promise<td.Schema | undefined> }
 */
export async function _getSchema (passport) {
  try {
    await stamp(passport)

    if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'read', schema: true }))) throw error('auth__read-schema', 'Because the read schema permission is revoked from your AcePermission\'s, you cannot do this', { token: passport.token, source: passport.source })

    return passport.schema
  } catch (e) {
    console.log('error', e)
    throw e
  }
}


/**
 * @param { td.AceCore } core
 * @param { td.Schema } schema - Ace Graph Database schema
 * @returns { Promise<td.Schema> }
 */
export async function addToSchema (core, schema) {
  return fetchJSON(core.url + enums.endpoints.addToSchema, core.token, { body: JSON.stringify(schema) })
}


/**
 * @param { td.AcePassport } passport
 * @param { td.Schema } schemaAdditions - Ace Graph Database schema
 * @returns { Promise<td.Schema> }
 */
export async function _addToSchema (passport, schemaAdditions) {
  try {
    await stamp(passport)

    if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', schema: true }))) throw error('auth__write-schema', 'Because the permission write schema is revoked from your AcePermission\'s, you cannot do this', { token: passport.token, source: passport.source } )
    if (!passport.schema?.nodes) throw error('add-to-schema__falsy-nodes', '/add-to-schema should be called after calling /start, please call /start before calling /add-to-schema', {})
    if (!passport.schema?.relationships) throw error('add-to-schema__falsy-relationships', '/add-to-schema should be called after calling /start, please call /start before calling /add-to-schema', {})

    if (schemaAdditions.nodes) {
      for (const node in schemaAdditions.nodes) {
        if (passport.schema?.nodes[node]) throw error('add-to-schema__overwrite-node', `The node \`${ node }\` is already in your schema, please only include nodes in /add-to-schema that are not already in your schema`, { node })
        passport.schema.nodes[node] = schemaAdditions.nodes[node]
      }
    }

    if (schemaAdditions.relationships) {
      for (const relationship in schemaAdditions.relationships) {
        if (passport.schema?.relationships[relationship]) throw error('add-to-schema__overwrite-relationship', `The relationship \`${ relationship }\` is already in your schema, please only include relationships in /add-to-schema that are not already in your schema`, { relationship })
        passport.schema.relationships[relationship] = schemaAdditions.relationships[relationship]
      }
    }

    passport.storage.put(SCHEMA_KEY, validateSchema(passport.schema))
    return passport.schema
  } catch (e) {
    console.log('error', e)
    throw e
  }
}


/**
 * Validate Schema
 * @param { td.Schema } schema
 */
export function validateSchema (schema) {
  if (!schema.nodes || typeof schema.nodes !== 'object' || Array.isArray(schema.nodes)) throw error('schema__invalid-nodes', 'The provided schema requires a nodes object please', { schema })
  if (schema.relationships && (typeof schema.relationships !== 'object' || Array.isArray(schema.relationships))) throw error('schema__invalid-relationships', 'If you would love to provide relationships with your schema, please pass it as an object', { schema })

  /** @type { Set<string> } - Helps ensure each node in `schema.nodes` is unique */
  const nodeNameSet = new Set()

  /** @type { Set<string> } - Add relationships to this set as we loop `relationshipNameArray` - Ensures `relationshipName` is unique */
  const relationshipNameSet = new Set()

  /** @type { Set<string> } - Add relationships to this set as we loop `schema.nodes[nodeName]` - Ensures each nodeName in a prop points to a node defined in the schema */
  const relationshipPropNodeNameSet = new Set()

  /** @type { string[] } - Helpful so we may loop the relationships in the schema */
  const relationshipNameArray = Object.keys(schema.relationships || {})

  /** @type { Map<string, Set<string>> } - `Map<nodeName, Set<nodePropName>>` - Ensures each `nodePropName` is a unique `nodeName` */
  const uniqueNodePropsMap = new Map()

  /** @type { Map<string, Set<string>> } - `Map<relationshipName, Set<propName>>` - Ensures each `relationshipPropName` at a `relationshipName` is unique */
  const uniqueRelationshipPropsMap = new Map()

  /** @type { Map<string, { nodeName: String, nodePropName: string, id: (typeof enums.idsSchema.ForwardRelationshipProp | typeof enums.idsSchema.ReverseRelationshipProp | typeof enums.idsSchema.BidirectionalRelationshipProp) }[]> } - `Map<relationshipName, [{ nodeName, nodePropName, id }]>` - Helps ensure relationships defined in `schema.relationships` have required and properfly formatted nodes props in `schema.nodes` */
  const directionsMap = new Map()

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
    if (!nodeNameSet.has(relationshipPropNodeName)) throw error('schema__invalid-relationship-prop-node-name', `The node name \`${ relationshipPropNodeName }\` that is defined as a prop nodeName is not defined @ schema.nodes, please add relationship prop node names that are valid (a node in the schema)`, { nodeName: relationshipPropNodeName, schema})
  })

  for (const relationshipName of relationshipNameArray) {
    if (relationshipNameSet.has(relationshipName)) throw error('schema__not-unique-relationship-name', `The relationship name \`${ relationshipName }\` is not unique, please ensure each relationshipName is unique`, { relationshipName, schema })

    relationshipNameSet.add(relationshipName)

    const relationship = schema.relationships?.[relationshipName]
    const _errorData = { relationshipName, relationship }

    if (typeof relationshipName !== 'string') throw error('schema__invalid-relationship-type', `The relationship name \`${ relationshipName }\` is not a type of string, please add relationships that are a type of string`, _errorData)
    if (!relationshipName.match(/^[A-Za-z\_]+$/)) throw error('schema__invalid-relationship-characters', `The relationship name \`${ relationshipName }\` has invalid characters, please add relationships include characters a-z or A-Z or underscores (helpful for generated jsdoc and ts types)`, _errorData)
    if (relationship?.id !== enums.idsSchema.OneToOne && relationship?.id !== enums.idsSchema.ManyToMany && relationship?.id !== enums.idsSchema.OneToMany) throw error('schema__invalid-relationship-id', `The relationship name \`${ relationshipName }\` is invalid b/c relationship?.id is invalid, please ensure relationships have a valid relationship id of OneToOne, OneToMany or ManyToMany`, _errorData)

    if (relationship.x?.props) {
      if (typeof relationship.x.props !== 'object' || Array.isArray(relationship.x.props)) throw error('schema__invalid-relationship-props', `The relationship name ${ relationshipName } has invalid props, if you'd love to include props please ensure relationship.props type, is an object`, _errorData)

      for (const propName in relationship.x.props) {
        validateSchemaProp(propName, relationship.x.props[propName], true)

        const mapValue = uniqueRelationshipPropsMap.get(relationshipName)

        if (!mapValue) uniqueRelationshipPropsMap.set(relationshipName, new Set([propName]))
        else {
          if (mapValue.has(propName)) throw error('schema__not-unique-relationship-prop-name', `The relationship name \`${ relationshipName }\` and the prop name \`${ propName }\` is defined more then once in the schema, please ensure all relationship prop names are unique for the node`, { relationshipName, propName })
          else mapValue.add(propName)
        }
      }
    }
  }

  if (relationshipNameArray.length !== directionsMap.size) throw error('schema__invalid-relationships', 'All relationships listed in schema.nodes must also be listed in schema.relationships', { schemaNodeRelationships: directionsMap.keys(), schemaRelationships: relationshipNameArray })

  if (relationshipNameArray.length) {
    for (const relationshipName of relationshipNameArray) {
      const directions = directionsMap.get(relationshipName)
      const notify = () => error('schema__invalid-relationship-alignment', `The relationship name \`${ relationshipName }\` has invalid props, please ensure each relationship has 1 bidirectional relationship prop that is not an inverse or 2 relationship props where one is inverse and neither is bidirectional`, { relationshipName, directions })

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
