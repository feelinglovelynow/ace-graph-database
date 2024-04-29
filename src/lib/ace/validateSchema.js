import { td, enums } from '#ace'
import { DELIMITER } from '../variables.js'
import { AceError } from '../objects/AceError.js'


/**
 * Validate Schema
 * @param { td.AceSchema } schema
 */
export function validateSchema (schema) {
  if (!schema.nodes || typeof schema.nodes !== 'object' || Array.isArray(schema.nodes)) throw AceError('schema__invalid-nodes', 'The provided schema requires a nodes object please', { schema: JSON.stringify(schema) })
  if (schema.relationships && (typeof schema.relationships !== 'object' || Array.isArray(schema.relationships))) throw AceError('schema__invalid-relationships', 'If you would love to provide relationships with your schema, please pass it as an object', { schema: JSON.stringify(schema) })

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
    if (nodeNameSet.has(nodeName)) throw AceError('schema__not-unique-node-name', `The node name ${ nodeName } is not unique, please ensure each nodeName is unique`, { nodeName, schema: JSON.stringify(schema) })

    nodeNameSet.add(nodeName)

    if (typeof nodeName !== 'string') throw AceError('schema__invalid-node-type', `The node name ${ nodeName } is an invalid type, please add node that is a type of string`, { nodeName, schema: JSON.stringify(schema) })
    if (!nodeName.match(/^[A-Za-z\_]+$/)) throw AceError('schema__invalid-node-characters', `The node name ${nodeName} has invalid characters, please add node names that have characters a-z or A-Z or underscores (helpful for generated jsdoc and ts types)`, { nodeName, schema: JSON.stringify(schema) })
    if (nodeName.includes(DELIMITER)) throw AceError('schema__node-delimeter', `The node name ${ nodeName } includes ${ DELIMITER } which Ace does not allow b/c ${ DELIMITER } is used as a delimeter within our query language`, { nodeName, schema: JSON.stringify(schema) })

    for (const nodePropName in schema.nodes[nodeName]) {
      validateSchemaProp(nodePropName, schema.nodes[nodeName][nodePropName], false)

      const prop = schema.nodes[nodeName][nodePropName]

      if (prop.id === enums.idsSchema.Prop) {
        const mapValue = uniqueNodePropsMap.get(nodeName)

        if (!mapValue) uniqueNodePropsMap.set(nodeName, new Set([ nodePropName ]))
        else {
          if (mapValue.has(nodePropName)) throw AceError('schema__not-unique-node-prop-name', `The node name ${ nodeName } and prop name ${ nodePropName } is not unique, please ensure all node prop names are unique for the node`, { nodeName, nodePropName, schema: JSON.stringify(schema) })
          else mapValue.add(nodePropName)
        }
      } else {
        const schemaRelationshipProp = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (prop)
        const mapValue = directionsMap.get(schemaRelationshipProp.x.relationship)
        const arrayValue = { nodeName, nodePropName, id: schemaRelationshipProp.id }

        if (!mapValue) directionsMap.set(schemaRelationshipProp.x.relationship, [arrayValue])
        else mapValue.push(arrayValue)

        relationshipPropNodeNameSet.add(schemaRelationshipProp.x.node)
      }
    }
  }

  relationshipPropNodeNameSet.forEach(relationshipPropNodeName => {
    if (!nodeNameSet.has(relationshipPropNodeName)) throw AceError('schema__invalid-relationship-prop-node-name', `The node name \`${ relationshipPropNodeName }\` that is defined as a prop nodeName is not defined @ schema.nodes, please add relationship prop node names that are valid (a node in the schema)`, { nodeName: relationshipPropNodeName, schema})
  })

  for (const relationshipName of relationshipNameArray) {
    if (relationshipNameSet.has(relationshipName)) throw AceError('schema__not-unique-relationship-name', `The relationship name \`${ relationshipName }\` is not unique, please ensure each relationshipName is unique`, { relationshipName, schema: JSON.stringify(schema) })

    relationshipNameSet.add(relationshipName)

    const relationship = schema.relationships?.[relationshipName]
    const _errorData = { relationshipName, relationship }

    if (typeof relationshipName !== 'string') throw AceError('schema__invalid-relationship-type', `The relationship name \`${ relationshipName }\` is not a type of string, please add relationships that are a type of string`, _errorData)
    if (!relationshipName.match(/^[A-Za-z\_]+$/)) throw AceError('schema__invalid-relationship-characters', `The relationship name \`${ relationshipName }\` has invalid characters, please add relationships include characters a-z or A-Z or underscores`, _errorData)
    if (relationship?.id !== enums.idsSchema.OneToOne && relationship?.id !== enums.idsSchema.ManyToMany && relationship?.id !== enums.idsSchema.OneToMany) throw AceError('schema__invalid-relationship-id', `The relationship name \`${ relationshipName }\` is invalid b/c relationship?.id is invalid, please ensure relationships have a valid relationship id of OneToOne, OneToMany or ManyToMany`, _errorData)
    if (relationshipName.includes(DELIMITER)) throw AceError('schema__relationship-delimeter', `The relationship name ${relationshipName} includes ${DELIMITER} which Ace does not allow b/c ${DELIMITER} is used as a delimeter within our query language`, { relationshipName, schema: JSON.stringify(schema) })

    if (relationship.x?.props) {
      if (typeof relationship.x.props !== 'object' || Array.isArray(relationship.x.props)) throw AceError('schema__invalid-relationship-props', `The relationship name ${ relationshipName } has invalid props, if you'd love to include props please ensure relationship.props type, is an object`, _errorData)

      for (const propName in relationship.x.props) {
        validateSchemaProp(propName, relationship.x.props[propName], true)

        const mapValue = uniqueRelationshipPropsMap.get(relationshipName)

        if (!mapValue) uniqueRelationshipPropsMap.set(relationshipName, new Set([propName]))
        else {
          if (mapValue.has(propName)) throw AceError('schema__not-unique-relationship-prop-name', `The relationship name \`${ relationshipName }\` and the prop name \`${ propName }\` is defined more then once in the schema, please ensure all relationship prop names are unique for the node`, { relationshipName, propName })
          else mapValue.add(propName)
        }
      }
    }
  }

  if (relationshipNameArray.length !== directionsMap.size) throw AceError('schema__invalid-relationships', 'All relationships listed in schema.nodes must also be listed in schema.relationships', { schemaNodeRelationships: directionsMap.keys(), schemaRelationships: relationshipNameArray })

  if (relationshipNameArray.length) {
    for (const relationshipName of relationshipNameArray) {
      const directions = directionsMap.get(relationshipName)
      const notify = () => AceError('schema__invalid-relationship-alignment', `The relationship name \`${ relationshipName }\` has invalid props, please ensure each relationship has 1 bidirectional relationship prop that is not an inverse or 2 relationship props where one is inverse and neither is bidirectional`, { relationshipName, directions })

      if (!directions) throw notify()
      if (directions.length !== 1 && directions.length !== 2) throw notify()
      if (directions.length === 1) {
        if (directions[0].id === enums.idsSchema.ReverseRelationshipProp) throw notify()
        if (directions[0].id !== enums.idsSchema.BidirectionalRelationshipProp) throw notify()
      }
      if (directions.length === 2) {
        if ((directions[0].id === enums.idsSchema.ReverseRelationshipProp && directions[1].id !== enums.idsSchema.ReverseRelationshipProp) && (directions[0].id !== enums.idsSchema.ReverseRelationshipProp && directions[1].id === enums.idsSchema.ReverseRelationshipProp)) throw notify()
        if (directions[0].id === enums.idsSchema.BidirectionalRelationshipProp || directions[1].id === enums.idsSchema.BidirectionalRelationshipProp) throw notify()
        if (directions[0].nodePropName === directions[1].nodePropName) throw AceError('schema__invalid-relationship-prop-name', 'Prop names for a relationship must be different so we may do relationship queries', { relationshipName, directions })
      }
    }
  }

  return schema
}


/**
 * Validate Schema Property
 * @param { string } propName
 * @param { td.AceSchemaProp | td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp | td.AceSchemaRelationshipProp } propValue
 * @param { boolean } isRelationshipProp
 */
function validateSchemaProp (propName, propValue, isRelationshipProp) {
  validatePropertyKey(propName, isRelationshipProp)

  switch (propValue.id) {
    case enums.idsSchema.Prop:
    case enums.idsSchema.RelationshipProp:
      const schemaProp = /** @type { td.AceSchemaProp } */ (propValue)

      if (!schemaProp.x.dataType) throw AceError('schema__falsy-data-type', `The schema prop ${ propName } is because its dataType is falsy, Please ensure every data type is valid`, { propName, propValue })
      if (!enums.dataTypes[schemaProp.x.dataType]) throw AceError('schema__invalid-data-type', `The schema prop ${ propName } is invalid because its dataType is not a valid option, please add a dataType that is a valid enums.dataTypes. Valid options include ${ enums.dataTypes }`, { propName, propValue })
      break
    case enums.idsSchema.ForwardRelationshipProp:
    case enums.idsSchema.ReverseRelationshipProp:
    case enums.idsSchema.BidirectionalRelationshipProp:
      const schemaRelationshipProp = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (propValue)

      if (isRelationshipProp) throw AceError('schema__invalid-id', `The schema prop ${ propName } is invalid because prop's must have an id of "SchemaProp" and not "SchemaRelationshipProp"`, { propName, propValue })
      if (schemaRelationshipProp.x.has !== enums.has.one && schemaRelationshipProp.x.has !== enums.has.many) throw AceError('schema__invalid-has', `The schema prop ${ propName } is invalid because has is not "one" or "many", please ensure "has" is "one" or "many"`, { propName, propValue })
      if (typeof schemaRelationshipProp.x.node !== 'string' || !schemaRelationshipProp.x.node) throw AceError('schema__invalid-node-name', `The schema prop ${ propName } is invalid because the nodeName is not a truthy string, please ensure each schema prop that has a truthy string nodeName`, { propName, propValue })
      if (typeof schemaRelationshipProp.x.relationship !== 'string' || !schemaRelationshipProp.x.relationship) throw AceError('schema__invalid-relationship-name', `The schema prop ${ propName } is invalid because the relationshipName is not a truthy string, please ensure each schema prop that has a truthy string relationshipName`, { propName, propValue })
      break
    default:
      if (isRelationshipProp) throw AceError('schema__invalid-id', `The schema prop ${ propName } is invalid because prop's must include an id of "SchemaProp"`, { propName, propValue })
      break
  }
}


/**
 * Validate Schema Property Key
 * @param { string } propertyKey
 * @param { boolean } isRelationshipProp
 */
function validatePropertyKey (propertyKey, isRelationshipProp) {
  if (typeof propertyKey !== 'string') throw AceError('validatePropertyKey___invalid-typeof', `The property key ${ propertyKey } is invalid because it is not a type of string, please ensure each property key has a type of string`, { propertyKey })
  if (!propertyKey.match(/^[A-Za-z\_]+$/)) throw AceError('validatePropertyKey___invalid-characters', `The property key ${ propertyKey } is invalid because it includes invalid characters, please ensure each property key has characters a-z or A-Z or underscores (helpful for generated jsdoc and ts types)`, { propertyKey })
  if (isRelationshipProp && propertyKey === '_uid') throw AceError('validatePropertyKey___relationship-uid', 'The property key _uid is invalid because _uid is a reserved relationship prop', { propertyKey })
  if (isRelationshipProp && !propertyKey.startsWith('_')) throw AceError('validatePropertyKey___add-underscore', `The property key ${ propertyKey } is invalid because this is a relationship prop that does not start with an underscore, please start relationship props with an underscore, this helps know what props in a query are relationship props`, { propertyKey })
  if (!isRelationshipProp && propertyKey === 'uid') throw AceError('validatePropertyKey___node-uid', 'The property uid is invalid because uid is a reserved node prop', { propertyKey })
  if (!isRelationshipProp && propertyKey.startsWith('_')) throw AceError('validatePropertyKey___remove-underscore', `The property key ${ propertyKey } is invalid because it is not a relationship prop but it starts with an underscore, please do not start node props with an underscore, relationship props start with an underscore, this helps know what props in a query are relationship props`, { propertyKey })
  if (propertyKey.includes(DELIMITER)) throw AceError('validatePropertyKey__delimeter', `The property key ${ propertyKey } includes ${ DELIMITER } which Ace does not allow b/c ${ DELIMITER } is used as a delimeter within our query language`, { propertyKey })
}
