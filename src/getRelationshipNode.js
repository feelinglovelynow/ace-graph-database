import { td } from '#manifest'
import { error } from './throw.js'
import { Passport } from './Passport.js'
import { getGeneratedQueryFormatSectionByParent } from './getGeneratedQueryFormatSection.js'


/**
 * @typedef { { node: any, generatedQueryFormatSection: null | td.QueryRequestItemFormatGenerated } } GetRelationshipNodeResponse
 * 
 * @param { td.QueryRequestItemFormatGenerated } generatedQueryFormatSection 
 * @param { any } startingNode
 * @param { Passport } passport 
 * @param { string[] } relationships 
 * @returns { GetRelationshipNodeResponse }
 */
export function getRelationshipNode (generatedQueryFormatSection, startingNode, passport, relationships) {
  const response = /** @type { GetRelationshipNodeResponse } */ ({ node: null, generatedQueryFormatSection: null })
  let relationshipNodeName = generatedQueryFormatSection.nodeName, schemaRelationshipProp

  for (let iRelationships = 0; iRelationships < relationships.length; iRelationships++) {
    const relationshipPropName = relationships[iRelationships]

    schemaRelationshipProp = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[relationshipNodeName]?.[relationshipPropName])

    if (!schemaRelationshipProp) throw error('get-relationship-node__falsy-relationship', `The relationships array is invalid because one of it's items: ${ relationshipPropName } is not a valid relationship prop according to your schema, please align each item in the relationships array with valid schema props`, { relationships })
    else {
      if (iRelationships === 0) {
        response.generatedQueryFormatSection = /** @type { td.QueryRequestItemFormatGenerated } */ (generatedQueryFormatSection.x[relationshipPropName])
      } else if (response.generatedQueryFormatSection) {
        const relationshipGeneratedQueryFormatSection = getGeneratedQueryFormatSectionByParent(generatedQueryFormatSection.x, relationshipPropName, passport, generatedQueryFormatSection)
        response.generatedQueryFormatSection = relationshipGeneratedQueryFormatSection
      }

      const nodePropName = response.generatedQueryFormatSection?.aliasProperty || relationshipPropName

      if (iRelationships === 0) response.node = startingNode?.[nodePropName]
      else if (response.node) response.node = response.node[nodePropName]
      else response.node = null

      if (response.node) relationshipNodeName = schemaRelationshipProp?.x.nodeName
      else break
    }
  }

  if (schemaRelationshipProp?.x?.has === 'many') throw error('get-relationship-node__ending-with-many', `The relationships array is invalid because it ends with a property that is a "many" relationship, we must end with a "one" relationship`, { relationships })

  return response
}
