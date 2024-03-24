import { error } from './throw.js'
import { td, enums } from '#manifest'
import { Passport } from './Passport.js'


/**
 * @param { td.QueryRequestItemNode | td.QueryRequestItemRelationship } query
 * @param { Passport } passport
 * @param { 'getNodes' | 'getRelationships' } queryType
 * @returns { td.QueryRequestItemGeneratedXSection }
 */
export function getXGeneratedById (query, passport, queryType) {
  if (typeof query?.id !== 'string' || !query.id) throw error('getXGeneratedById__x-id-falsy', 'This request is failing b/c request.x.id is not a truthy string', { query })
  if (queryType === 'getNodes' && !passport.schema?.nodes[query.id]) throw error('getXGeneratedById__x-section-id-node-invalid', 'This request is failing b/c request.x.id is not a node in your schema', { query })
  if (queryType === 'getRelationships' && !passport.schema?.relationships[query.id]) throw error('getXGeneratedById__x-section-id-relationship-invalid', 'This request is failing b/c request.x.id is not a relationship in your schema', { query })

  const rLoop = loopOptions(query.x)

  return {
    ...rLoop,
    queryType,
    x: query.x,
    id: query.id,
    has: enums.has.many,
    xPropName: query.property,
    aliasPropName: rLoop.aliasPropName,
    propName: rLoop.aliasPropName || query.property,
  }
}


/** 
 * @param { td.QueryRequestItemNodeX } xValue
 * @param { string } xKey
 * @param { Passport } passport
 * @param { td.QueryRequestItemGeneratedXSection } xGeneratedParent
 * @returns { td.QueryRequestItemGeneratedXSection }
 */
export function getXGeneratedByParent (xValue, xKey, passport, xGeneratedParent) {
  let schemaPropValue

  if (xGeneratedParent.queryType === 'getRelationships' && xGeneratedParent.id) {
    if (!passport.schemaDataStructures?.relationshipPropsMap) throw error('getXGeneratedByParent__falsy-schemaDataStructures-relationshipPropsMap', 'The schema data structure relationshipPropsMap must be truthy, this is set based on the schemaDataStructuresOptions passed to new Passport(), pass { desiredSchemaDataStructures: { relationshipPropsMap: true } } for this to work', { schemaDataStructuresOptions: passport.schemaDataStructuresOptions })

    const relationshipPropsMap = passport.schemaDataStructures.relationshipPropsMap.get(xGeneratedParent.id)

    if (!relationshipPropsMap) throw error('getXGeneratedByParent__falsy-relationshipPropsMap', `The schema data structure relationshipPropsMap must be truthy, it is not because the relationship \`${ xGeneratedParent.id }\` does not align with any relationships in the map`, { relationshipName: xGeneratedParent.id })

    schemaPropValue = relationshipPropsMap.get(xKey)

    if (!schemaPropValue) throw error('getXGeneratedByParent__falsy-schemaPropValue', `This error is thrown b/c schemaPropValue must be truthy, it is not because the relationship \`${ xGeneratedParent.id }\` and the xKey \`${ xKey }\` does not align with your schema`, { relationshipName: xGeneratedParent.id, xKey })
  } else {
    schemaPropValue = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[xGeneratedParent.id]?.[xKey])
  }

  if (!schemaPropValue) throw error('getXGeneratedByParent__falsy-query-x-id', `This request is failing b/c parent id "${ xGeneratedParent?.id }" with property name "${ xKey }" is not defined in your schema`, { schemaPropName: xKey, nodeName: xGeneratedParent?.id })

  const rLoop = loopOptions(xValue)

  return {
    ...rLoop,
    queryType: xGeneratedParent.queryType,
    x: xValue,
    id: schemaPropValue.x.nodeName,
    has: schemaPropValue.x.has,
    xPropName: xKey,
    aliasPropName: rLoop.aliasPropName,
    propName: rLoop.aliasPropName || xKey,
    relationshipName: schemaPropValue.x.relationshipName,
  }
}


/**
 * @param { td.QueryRequestItemNodeX } x
 * @returns { { sets: Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>>, hasCountOne: boolean, hasOptionsFind: boolean, hasValueAsResponse: boolean, priorityOptions: td.QueryRequestItemGeneratedXSectionPriorityOptions, aliasPropName?: string } }
 */ 
function loopOptions (x) {
  let aliasPropName
  const sets = new Map()
  let hasCountOne = false
  let hasOptionsFind = false
  let hasValueAsResponse = false
  const priorityOptions = new Map()

  if (x?.$options?.length) {
    for (const $o of x.$options) {
      if ($o.id === 'Sort') priorityOptions.set('Sort', $o)
      else if ($o.id === 'Alias') aliasPropName = $o.x.alias
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
