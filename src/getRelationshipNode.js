import { td, enums, Schema, QueryAliasProperty } from '#manifest'
import { getAlias } from './getAlias.js'


/**
 * @param { Schema } schema 
 * @param { enums.relationshipNames[] } relationships 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { any } startingNode1
 * @param { any } [ startingNode2 ]
 */
export function getRelationshipNode (schema, relationships, queryFormatSection, startingNode1, startingNode2) {
  let relationshipNodeName = queryFormatSection.$info.nodeName, relationshipNode, qfs

  for (let iRelationships = 0; iRelationships < relationships.length; iRelationships++) {
    const relationshipName = /** @type { enums.relationshipNames } */ (relationships[iRelationships])
    const schemaRelationshipDirection = schema.relationships?.[relationshipName]?.directions?.find(d => d.nodeName === relationshipNodeName)

    if (schemaRelationshipDirection) {
      if (iRelationships === 0) qfs = /** @type { td.QueryRequestFormat } */ (queryFormatSection[schemaRelationshipDirection.nodePropName])
      else if (qfs) qfs = /** @type { td.QueryRequestFormat } */ (qfs[schemaRelationshipDirection.nodePropName])

      const nodePropName = getAlias(qfs) || schemaRelationshipDirection.nodePropName

      if (iRelationships === 0) relationshipNode = startingNode1[nodePropName] || startingNode2?.[nodePropName]
      else if (relationshipNode) relationshipNode = relationshipNode[nodePropName]
      else relationshipNode = null

      if (relationshipNode) relationshipNodeName = schemaRelationshipDirection.nodeName
      else break
    }
  }

  return relationshipNode
}
