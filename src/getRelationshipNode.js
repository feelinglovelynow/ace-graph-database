import { td } from '#manifest'
import { error } from './throw.js'
import { Passport } from './Passport.js'
import { getGeneratedXQuerySectionByParent } from './getGeneratedXQuerySection.js'


/**
 * @typedef { { node: any, generatedXQuerySection: null | td.QueryRequestItemGeneratedXSection } } GetRelationshipNodeResponse
 * 
 * @param { td.QueryRequestItemGeneratedXSection } generatedXQuerySection 
 * @param { any } startingNode
 * @param { Passport } passport 
 * @param { string[] } relationships 
 * @returns { GetRelationshipNodeResponse }
 */
export function getRelationshipNode (generatedXQuerySection, startingNode, passport, relationships) {
  const response = /** @type { GetRelationshipNodeResponse } */ ({ node: null, generatedXQuerySection: null })
  let relationshipNodeName = generatedXQuerySection.nodeName, schemaRelationshipProp

  for (let iRelationships = 0; iRelationships < relationships.length; iRelationships++) {
    const relationshipPropName = relationships[iRelationships]

    schemaRelationshipProp = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[relationshipNodeName]?.[relationshipPropName])

    if (!schemaRelationshipProp) throw error('get-relationship-node__falsy-relationship', `The relationships array is invalid because one of it's items: ${ relationshipPropName } is not a valid relationship prop according to your schema, please align each item in the relationships array with valid schema props`, { relationships })
    else {
      if (iRelationships === 0) {
        response.generatedXQuerySection = /** @type { td.QueryRequestItemGeneratedXSection } */ (generatedXQuerySection.x[relationshipPropName])
      } else if (response.generatedXQuerySection) {
        const relationshipGeneratedQueryXSection = getGeneratedXQuerySectionByParent(generatedXQuerySection.x, relationshipPropName, passport, generatedXQuerySection)
        response.generatedXQuerySection = relationshipGeneratedQueryXSection
      }

      const nodePropName = response.generatedXQuerySection?.aliasProperty || relationshipPropName

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
