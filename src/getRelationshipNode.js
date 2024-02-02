import { enums, Schema } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { enums.relationshipNames[] } relationships 
 * @param { string } nodeName 
 * @param { any } queryFormatSection 
 * @param { any } startingNode1
 * @param { any } [ startingNode2 ]
 */
export function getRelationshipNode(schema, relationships, nodeName, queryFormatSection, startingNode1, startingNode2) {
  let relationshipNodeName = nodeName, relationshipNode, qfs

  for (let iRelationships = 0; iRelationships < relationships.length; iRelationships++) {
    const relationshipName = /** @type { enums.relationshipNames } */ (relationships[iRelationships])
    const schemaRelationshipDirection = schema.relationships?.[relationshipName]?.directions?.find(d => d.nodeName === relationshipNodeName)

    if (schemaRelationshipDirection) {
      if (iRelationships === 0) qfs = queryFormatSection[schemaRelationshipDirection.nodePropName]
      else if (qfs) qfs = qfs[schemaRelationshipDirection.nodePropName]

      const nodePropName = qfs?.$alias || schemaRelationshipDirection.nodePropName

      if (iRelationships === 0) relationshipNode = startingNode1[nodePropName] || startingNode2?.[nodePropName]
      else if (relationshipNode) relationshipNode = relationshipNode[nodePropName]
      else relationshipNode = null

      if (relationshipNode) relationshipNodeName = schemaRelationshipDirection.nodeName
      else break
    }
  }

  return relationshipNode
}
