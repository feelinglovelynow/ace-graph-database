import { error } from './throw.js'
import { td, enums } from '#manifest'


/** 
 * @param { td.QueryRequestFormatX } x
 * @param { string } schemaPropName
 * @param { td.AcePassport } passport
 * @param { td.QueryRequestFormatGenerated | null } generatedParent
 * @returns { td.QueryRequestFormatGenerated }
 */
export function getGeneratedQueryFormatSectionByParent(x, schemaPropName, passport, generatedParent) {
  const schemaPropValue = /** @type { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[generatedParent?.nodeName || '']?.[schemaPropName])

  if (!schemaPropValue) throw error('query__falsy-query-format-key', `This request is failing b/c node name "${ generatedParent?.nodeName }" with property name "${ schemaPropName }" is not defined in your schema`, { queryFormatKey: schemaPropName, nodeName: generatedParent?.nodeName })
  
  const id = schemaPropValue.id // var out to help w/ ts

  if (id !== enums.idsSchema.ForwardRelationshipProp && id !== enums.idsSchema.ReverseRelationshipProp && id !== enums.idsSchema.BidirectionalRelationshipProp) {
    throw error('query__invalid-query-format-key', `This request is failing b/c node name "${ generatedParent?.nodeName }" with property name "${ schemaPropName }" is defined in your schema but not as a "ForwardRelationshipProp", "ReverseRelationshipProp" or "BidirectionalRelationshipProp" but as a "${ id }"`, { queryFormatKey: schemaPropName, nodeName: generatedParent?.nodeName })
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
 * @param { td.QueryRequestFormat } queryFormatSection
 * @param { string } schemaProperty
 * @param { td.AcePassport } passport
 * @returns { td.QueryRequestFormatGenerated }
 */
export function getGeneratedQueryFormatSectionById (queryFormatSection, schemaProperty, passport) {
  if (typeof queryFormatSection?.id !== 'string' || !queryFormatSection.id) throw error('query__format-section-id-falsy', 'This request is failing b/c request.format.id is not a truthy string', { queryFormatSection })
  if (!passport.schema?.nodes[queryFormatSection.id]) throw error('query__format-section-id-node-invalid', 'This request is failing b/c request.format.id is not a node in your schema', { queryFormatSection })

  const rLoop = loopOptions(queryFormatSection.x)

  return {
    ...rLoop,
    has: enums.has.many,
    x: queryFormatSection.x,
    schemaProperty: schemaProperty,
    nodeName: queryFormatSection.id,
    property: rLoop.aliasProperty || schemaProperty,
  }
}


/**
 * @param { td.QueryRequestFormatX } x
 * @returns { { sets: Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>>, hasCountOne: boolean, hasOptionsFind: boolean, hasValueAsResponse: boolean, priorityOptions: td.QueryRequestFormatGeneratedPriorityOptions, aliasProperty?: string } }
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
