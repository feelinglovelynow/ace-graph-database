import { td, enums } from '#ace'
import { AceError } from '../../objects/AceError.js'


/**
 * @param { td.AceQueryRequestItemNode | td.AceQueryRequestItemRelationship } requestItem
 * @param { td.AcePassport } passport
 * @returns { td.AceQueryRequestItemGeneratedXSection }
 */
export function getXGeneratedById (requestItem, passport) {
  if (requestItem.id !== 'QueryNode' && requestItem.id !== 'QueryRelationship') throw AceError('getXGeneratedById__x-id-invalid', 'This request is failing b/c request.x.id is not a truthy string of QueryNode or QueryRelationship', { query: requestItem })
  if (requestItem.id === 'QueryNode' && !passport.schema?.nodes[requestItem.node]) throw AceError('getXGeneratedById__x-section-id-node-invalid', 'This request is failing b/c request.x.nodeName is not a node in your schema', { query: requestItem })
  if (requestItem.id === 'QueryRelationship' && !passport.schema?.relationships[requestItem.relationship]) throw AceError('getXGeneratedById__x-section-id-relationship-invalid', 'This request is failing b/c request.x.relationshipName is not a relationship in your schema', { query: requestItem })

  const rLoop = loopOptions(requestItem.x)

  const response = /** @type { td.AceQueryRequestItemGeneratedXSection } */ ({
    ...rLoop,
    x: requestItem.x,
    id: requestItem.id,
    has: enums.has.many,
    xPropName: requestItem.prop,
    aliasPropName: rLoop.aliasPropName,
    propName: rLoop.aliasPropName || requestItem.prop,
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

  if (xGeneratedParent.id === 'QueryRelationship') {
    if (!passport.schemaDataStructures?.relationshipPropsMap) throw AceError('getXGeneratedByParent__falsy-schemaDataStructures-relationshipPropsMap', 'The schema data structure relationshipPropsMap must be truthy, this is set if your schema is defined when you create an AcePassport', { relationshipPropsMap: '' })

    const relationshipPropsMap = xGeneratedParent.relationshipName ? passport.schemaDataStructures.relationshipPropsMap.get(xGeneratedParent.relationshipName) : null

    if (!relationshipPropsMap) throw AceError('getXGeneratedByParent__falsy-relationshipPropsMap', `The schema data structure relationshipPropsMap must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` does not align with any relationships in the map`, { relationshipName: xGeneratedParent.relationshipName })

    schemaPropValue = relationshipPropsMap.get(xKey)

    if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-schemaPropValue', `This error is thrown b/c schemaPropValue must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` and the xKey \`${ xKey }\` does not align with your schema`, { relationshipName: xGeneratedParent.relationshipName, xKey })
  } else if (xGeneratedParent.nodeName) {
    schemaPropValue = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[xGeneratedParent.nodeName]?.[xKey])
  }

  if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-query-x-id', `This request is failing b/c node name "${xGeneratedParent?.nodeName }" with property name "${ xKey }" is not defined in your schema`, { schemaPropName: xKey, nodeName: xGeneratedParent?.id })

  const rLoop = loopOptions(xValue)

  return {
    ...rLoop,
    x: xValue,
    nodeName: schemaPropValue.x.node,
    has: schemaPropValue.x.has,
    xPropName: xKey,
    aliasPropName: rLoop.aliasPropName,
    propName: rLoop.aliasPropName || xKey,
    relationshipName: schemaPropValue.x.relationship,
  }
}


/**
 * @param { td.AceQueryRequestItemNodeX } x
 * @returns { { sets: Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>>, hasCountOne: boolean, hasOptionsFind: boolean, hasValueAsResponse: boolean, priorityOptions: td.AceQueryRequestItemGeneratedXSectionPriorityOptions, aliasPropName?: string } }
 */ 
function loopOptions (x) {
  let aliasPropName
  const sets = new Map()
  let hasCountOne = false
  let hasOptionsFind = false
  let hasValueAsResponse = false
  const priorityOptions = new Map()

  if (x?.$o?.length) {
    for (const $o of x.$o) {
      if ($o.id === 'Sort') priorityOptions.set('Sort', $o)
      else if ($o.id === 'Alias') aliasPropName = $o.property
      else if ($o.id === 'Limit') { if ($o.x.count === 1) hasCountOne = true }
      else if ($o.id === 'FilterByUids') { priorityOptions.set('FilterByUids', $o); sets.set('FilterByUids', new Set($o.x.uids)) }
      else if ($o.id === 'FilterBy_Uids') { priorityOptions.set('FilterBy_Uids', $o); sets.set('FilterBy_Uids', new Set($o.x._uids)) }
      else if ($o.id === 'FilterByUniques') { priorityOptions.set('FilterByUniques', $o); sets.set('FilterByUniques', new Set($o.x.uniques)) }
      else if ($o.id === 'FindByUid') { priorityOptions.set('FindByUid', $o); hasOptionsFind = true }
      else if ($o.id === 'FindBy_Uid') { priorityOptions.set('FindBy_Uid', $o); hasOptionsFind = true }
      else if ($o.id === 'FindByUnique') { priorityOptions.set('FindByUnique', $o); hasOptionsFind = true }
      else if ($o.id === 'Find' || $o.id === 'FindGroup' || $o.id === 'FindDefined' || $o.id === 'FindUndefined') hasOptionsFind = true
      else if ($o.id === 'SumAsResponse' || $o.id === 'CountAsResponse' || $o.id === 'AverageAsResponse' || $o.id === 'MinNodeAsResponse' || $o.id === 'MaxNodeAsResponse' || $o.id === 'PropertyAsResponse' || $o.id === 'MinAmountAsResponse' || $o.id === 'MaxAmountAsResponse') hasValueAsResponse = true
    }
  }

  return {
    sets,
    hasCountOne,
    aliasPropName,
    hasOptionsFind,
    priorityOptions,
    hasValueAsResponse,
  }
}
