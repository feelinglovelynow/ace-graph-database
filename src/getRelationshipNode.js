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

    if (!schemaRelationshipProp) throw { id: 'get-relationship-node__undefined-relationship', message: 'Please align relationships with valid schema props', errorData: { relationships } }
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

  if (schemaRelationshipProp?.has === 'many') throw { id: 'get-relationship-node__many', message: 'Gettin a relationship node, from a schema relationship prop that returns many items is invalid', errorData: { schemaRelationshipProp } }

  return relationshipNode
}
