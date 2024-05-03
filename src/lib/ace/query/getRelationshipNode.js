import { td } from '#ace'
import { AceError } from '../../objects/AceError.js'
import { getXGeneratedByParent } from './getXGenerated.js'


/**
 * @typedef { { node: any, xGenerated: null | td.AceQueryRequestItemGeneratedXSection } } GetRelationshipNodeResponse
 * 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { any } startingNode
 * @param { td.AcePassport } passport 
 * @param { string[] } relationships 
 * @returns { GetRelationshipNodeResponse }
 */
export function getRelationshipNode (xGenerated, startingNode, passport, relationships) {
  const response = /** @type { GetRelationshipNodeResponse } */ ({ node: null, xGenerated: null })
  let relationshipNodeName = xGenerated.nodeName, schemaRelationshipProp

  if (!relationshipNodeName && startingNode.a && startingNode.b && xGenerated.relationshipName) { // we're starting w/ a relationship query and not a node query
    const props = passport.schemaDataStructures?.relationshipPropsMap?.get(xGenerated.relationshipName)

    if (props) {
      for (const [ key, { propValue } ] of props) {
        if (key !== relationships[0]) {
          relationshipNodeName = propValue.x.node
          break
        }
      }
    }
  }


  for (let iRelationships = 0; iRelationships < relationships.length; iRelationships++) {
    const relationshipPropName = relationships[iRelationships]

    if (relationshipNodeName) {
      schemaRelationshipProp = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[relationshipNodeName]?.[relationshipPropName])
    
      if (!schemaRelationshipProp) { // IF the relationshipPropName is not in the schema it might be an alias
        for (const xPropName in xGenerated.x) { // loop the x values to find the x props
          if (xGenerated.x[xPropName]?.$o?.alias === relationshipPropName) { // if one of the props has an alias that matches the relationshipPropName
            schemaRelationshipProp = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[relationshipNodeName]?.[xPropName]) // use the xPropName rather then the alias name in the relationships array
            break
          }
        }
      }
    }

    if (!schemaRelationshipProp) throw AceError('getRelationshipNode__falsyRelationship', `The relationships array is invalid because one of it's items: ${ relationshipPropName } is not a valid relationship prop according to your schema, please align each item in the relationships array with valid schema props`, { relationships })
    else {
      if (iRelationships === 0) {
        response.xGenerated = /** @type { td.AceQueryRequestItemGeneratedXSection } */ (xGenerated.x[relationshipPropName])
      } else if (response.xGenerated) {
        const relationshipGeneratedQueryXSection = getXGeneratedByParent(xGenerated.x, relationshipPropName, passport, xGenerated)
        response.xGenerated = relationshipGeneratedQueryXSection
      }

      const nodePropName = response.xGenerated?.aliasPropName || relationshipPropName

      if (iRelationships === 0) response.node = startingNode?.[nodePropName]
      else if (response.node) response.node = response.node[nodePropName]
      else response.node = null

      if (response.node) relationshipNodeName = schemaRelationshipProp?.x.node
      else break
    }
  }
  
  if (schemaRelationshipProp?.x?.has === 'many' && Array.isArray(response.node) && response.node.length) throw AceError('getRelationshipNode__endingWithMany', `The relationships array is invalid because it ends with a property that is a "many" relationship, we must end with a "one" relationship`, { relationships, queryId: xGenerated.id, queryX: xGenerated.x })

  return response
}
