import { td, enums } from '#ace'
import { AceError } from '../../objects/AceError.js'


/**
 * @param { td.AceQueryRequestItemNode | td.AceQueryRequestItemRelationship } requestItem
 * @param { td.AcePassport } passport
 * @returns { td.AceQueryRequestItemGeneratedXSection }
 */
export function getXGeneratedById (requestItem, passport) {
  if (requestItem.id !== 'QueryByNode' && requestItem.id !== 'QueryByRelationship') throw AceError('getXGeneratedById__x-id-invalid', 'This request is failing b/c request.x.id is not a truthy string of QueryByNode or QueryByRelationship', { query: requestItem })
  if (requestItem.id === 'QueryByNode' && !passport.schema?.nodes[requestItem.node]) throw AceError('getXGeneratedById__x-section-id-node-invalid', 'This request is failing b/c request.x.nodeName is not a node in your schema', { query: requestItem })
  if (requestItem.id === 'QueryByRelationship' && !passport.schema?.relationships[requestItem.relationship]) throw AceError('getXGeneratedById__x-section-id-relationship-invalid', 'This request is failing b/c request.x.relationshipName is not a relationship in your schema', { query: requestItem })

  const response = /** @type { td.AceQueryRequestItemGeneratedXSection } */ ({
    x: appendAllProps(requestItem.x),
    id: requestItem.id,
    has: enums.has.many,
    xPropName: requestItem.prop,
    aliasPropName: requestItem.x?.$o?.alias,
    propName: requestItem.x?.$o?.alias || requestItem.prop,
  })

  if (/** @type { td.AceQueryRequestItemNode } */(requestItem).node) response.nodeName = /** @type { td.AceQueryRequestItemNode } */(requestItem).node
  else if (/** @type { td.AceQueryRequestItemRelationship } */(requestItem).relationship) response.relationshipName = /** @type { td.AceQueryRequestItemRelationship } */(requestItem).relationship

  return response
}


/**
 * @param { td.AceQueryRequestItemNodeX } xValue
 * @param { string } xKey
 * @param { td.AcePassport } passport
 * @param { td.AceQueryRequestItemGeneratedXSection } xGeneratedParent
 * @returns { td.AceQueryRequestItemGeneratedXSection }
 */
export function getXGeneratedByParent (xValue, xKey, passport, xGeneratedParent) {
  let schemaPropValue

  if (xGeneratedParent.id === 'QueryByRelationship') {
    if (!passport.schemaDataStructures?.relationshipPropsMap) throw AceError('getXGeneratedByParent__falsy-schemaDataStructures-relationshipPropsMap', 'The schema data structure relationshipPropsMap must be truthy, this is set if your schema is defined when you create an AcePassport', { relationshipPropsMap: '' })

    const relationshipPropsMap = xGeneratedParent.relationshipName ? passport.schemaDataStructures.relationshipPropsMap.get(xGeneratedParent.relationshipName) : null

    if (!relationshipPropsMap) throw AceError('getXGeneratedByParent__falsy-relationshipPropsMap', `The schema data structure relationshipPropsMap must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` does not align with any relationships in the map`, { relationshipName: xGeneratedParent.relationshipName })

    schemaPropValue = relationshipPropsMap.get(xKey)

    if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-schemaPropValue', `This error is thrown b/c schemaPropValue must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` and the xKey \`${ xKey }\` does not align with your schema`, { relationshipName: xGeneratedParent.relationshipName, xKey })
  } else if (xGeneratedParent.nodeName) {
    schemaPropValue = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[xGeneratedParent.nodeName]?.[xKey])
  }

  if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-query-x-id', `This request is failing b/c node name "${xGeneratedParent?.nodeName }" with property name "${ xKey }" is not defined in your schema`, { schemaPropName: xKey, nodeName: xGeneratedParent?.id })

  return {
    x: appendAllProps(xValue),
    nodeName: schemaPropValue.x.node,
    has: schemaPropValue.x.has,
    xPropName: xKey,
    aliasPropName: xValue.$o?.alias,
    propName: xValue.$o?.alias || xKey,
    relationshipName: schemaPropValue.x.relationship,
  }
}


/**
 * IF x is empty manually set $o.all to true (if all is set don't overwrite it)
 * @param { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX } [ xValue]  
 */
function appendAllProps (xValue) {
  let res

  if (typeof xValue === 'undefined' || Object.keys(xValue).length === 0) res = { $o: { all: true } }
  else {
    const keys = Object.keys(xValue)

    if (keys.length === 0) res = { $o: { all: true } }
    else if (keys.length === 1 && xValue.$o) res = { $o: { all: true, ...xValue.$o } }
    else res = xValue
  }

  return res
}
