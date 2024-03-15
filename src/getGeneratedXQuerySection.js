import { error } from './throw.js'
import { td, enums } from '#manifest'
import { Passport } from './Passport.js'


/** 
 * @param { td.QueryRequestItemNodeX } x
 * @param { string } schemaPropName
 * @param { Passport } passport
 * @param { td.QueryRequestItemGeneratedXSection | null } generatedParent
 * @returns { td.QueryRequestItemGeneratedXSection }
 */
export function getGeneratedXQuerySectionByParent (x, schemaPropName, passport, generatedParent) {
  const schemaPropValue = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[generatedParent?.nodeName || '']?.[schemaPropName])

  if (!schemaPropValue) throw error('query__falsy-query-x-key', `This request is failing b/c node name "${ generatedParent?.nodeName }" with property name "${ schemaPropName }" is not defined in your schema`, { schemaPropName, nodeName: generatedParent?.nodeName })
  
  const id = schemaPropValue.id // var out to help w/ ts

  if (id !== enums.idsSchema.ForwardRelationshipProp && id !== enums.idsSchema.ReverseRelationshipProp && id !== enums.idsSchema.BidirectionalRelationshipProp) {
    throw error('query__invalid-query-x-key', `This request is failing b/c node name "${ generatedParent?.nodeName }" with property name "${ schemaPropName }" is defined in your schema but not as a "ForwardRelationshipProp", "ReverseRelationshipProp" or "BidirectionalRelationshipProp" but as a "${ id }"`, { schemaPropName, nodeName: generatedParent?.nodeName })
  }

  const rLoop = loopOptions(x)

  return {
    x,
    ...rLoop,
    has: schemaPropValue.x.has,
    schemaProperty: schemaPropName,
    nodeName: schemaPropValue.x.nodeName,
    property: rLoop.aliasProperty || schemaPropName,
    relationshipName: schemaPropValue.x.relationshipName,
  }
}


/**
 * @param { td.QueryRequestItemNodeX } xQuerySection
 * @param { string } schemaProperty
 * @param { Passport } passport
 * @returns { td.QueryRequestItemGeneratedXSection }
 */
export function getGeneratedXQuerySectionById (xQuerySection, schemaProperty, passport) {
  if (typeof xQuerySection?.id !== 'string' || !xQuerySection.id) throw error('query__x-section-id-falsy', 'This request is failing b/c request.x.id is not a truthy string', { xQuerySection })
  if (!passport.schema?.nodes[xQuerySection.id]) throw error('query__x-section-id-node-invalid', 'This request is failing b/c request.x.id is not a node in your schema', { xQuerySection })

  const rLoop = loopOptions(xQuerySection.x)

  return {
    ...rLoop,
    has: enums.has.many,
    x: xQuerySection.x,
    schemaProperty: schemaProperty,
    nodeName: xQuerySection.id,
    property: rLoop.aliasProperty || schemaProperty,
  }
}


/**
 * @param { td.QueryRequestItemNodeX } x
 * @returns { { sets: Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>>, hasCountOne: boolean, hasOptionsFind: boolean, hasValueAsResponse: boolean, priorityOptions: td.QueryRequestItemGeneratedXSectionPriorityOptions, aliasProperty?: string } }
 */ 
function loopOptions (x) {
  let aliasProperty
  const sets = new Map()
  let hasCountOne = false
  let hasOptionsFind = false
  let hasValueAsResponse = false
  const priorityOptions = new Map()

  if (x?.$options?.length) {
    for (const $o of x.$options) {
      if ($o.id === 'Sort') priorityOptions.set('Sort', $o)
      else if ($o.id === 'Alias') aliasProperty = $o.x.alias
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
    aliasProperty,
    hasOptionsFind,
    priorityOptions,
    hasValueAsResponse,
  }
}
