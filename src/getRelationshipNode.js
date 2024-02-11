import { error } from './throw.js'
import { getAlias } from './getAlias.js'
import { td, Schema, SchemaRelationshipProp } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { string[] } relationships 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { any } startingNode1
 * @param { any } [ startingNode2 ]
 */
export function getRelationshipNode (schema, relationships, queryFormatSection, startingNode1, startingNode2) {
  let relationshipNodeName = queryFormatSection.$info.nodeName, relationshipNode, qfs, schemaRelationshipProp

  for (let iRelationships = 0; iRelationships < relationships.length; iRelationships++) {
    const relationshipPropName = relationships[iRelationships]

    schemaRelationshipProp = /** @type { SchemaRelationshipProp } */ (schema.nodes?.[relationshipNodeName]?.[relationshipPropName])

    if (!schemaRelationshipProp) throw error('get-relationship-node__falsy-relationship', `The relationships array is invalid because one of it's items: ${ relationshipPropName } is not a valid relationship prop according to your schema, please align each item in the relationships array with valid schema props`, { relationships })
    else {
      if (iRelationships === 0) qfs = /** @type { td.QueryRequestFormat } */ (queryFormatSection[relationshipPropName])
      else if (qfs) qfs = /** @type { td.QueryRequestFormat } */ (qfs[relationshipPropName])

      const nodePropName = getAlias(qfs) || relationshipPropName

      if (iRelationships === 0) relationshipNode = startingNode1[nodePropName] || startingNode2?.[nodePropName]
      else if (relationshipNode) relationshipNode = relationshipNode[nodePropName]
      else relationshipNode = null

      if (relationshipNode) relationshipNodeName = schemaRelationshipProp.nodeName
      else break
    }
  }

  if (schemaRelationshipProp?.has === 'many') throw error('get-relationship-node__ending-with-many', `The relationships array is invalid because it ends with a property that is a "many" relationship, we must end with a "one" relationship`, { relationships })

  return relationshipNode
}
