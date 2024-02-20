import { error } from './throw.js'
import { td, enums } from '#manifest'
import { getAlias } from './getAlias.js'


/**
 * @typedef { { hasOptionsFind: boolean, hasPropAsResponse: boolean, hasCountOne: boolean } } OptionsBooleans
 * 
 * @param { td.QueryRequestFormatX } x
 * @param { string } schemaPropName
 * @param { td.Schema } schema
 * @param { td.QueryRequestFormatGenerated | null } generatedParent
 * @returns { td.QueryRequestFormatGenerated }
 */
export function getGeneratedQueryFormatSectionByParent (x, schemaPropName, schema, generatedParent) {
  const schemaPropValue = /** @type { td.SchemaRelationshipProp } */ (schema.nodes?.[generatedParent?.nodeName || '']?.[schemaPropName])

  if (!schemaPropValue) throw error('query__falsy-query-format-key', `This request is failing b/c node name "${ generatedParent?.nodeName }" with property name "${ schemaPropName }" is not defined in your schema`, { queryFormatKey: schemaPropName, nodeName: generatedParent?.nodeName })
  if (schemaPropValue.id !== 'RelationshipProp') throw error('query__invalid-query-format-key', `This request is failing b/c node name "${ generatedParent?.nodeName }" with property name "${ schemaPropName }" is defined in your schema but not as a "RelationshipProp" but as a "${ schemaPropValue.id }"`, { queryFormatKey: schemaPropName, nodeName: generatedParent?.nodeName })

  const aliasProperty = getAlias(x?.$options)

  return {
    x: x,
    aliasProperty,
    ...getOptionsBoolean(x),
    has: schemaPropValue.x.has,
    schemaProperty: schemaPropName,
    nodeName: schemaPropValue.x.nodeName,
    property: aliasProperty || schemaPropName,
    relationshipName: schemaPropValue.x.relationshipName,
  }
}


/**
 * @param { td.QueryRequestFormat } queryFormatSection
 * @param { string } schemaProperty
 * @param { td.Schema } schema
 * @returns { td.QueryRequestFormatGenerated }
 */
export function getGeneratedQueryFormatSectionById (queryFormatSection, schemaProperty, schema) {
  if (typeof queryFormatSection.id !== 'string' || !queryFormatSection.id) throw error('query__format-section-id-falsy', 'This request is failing b/c request.format.id is not a truthy string', { queryFormatSection })
  if (!schema.nodes[queryFormatSection.id]) throw error('query__format-section-id-node-invalid', 'This request is failing b/c request.format.id is not a node in your schema', { queryFormatSection })

  const aliasProperty = getAlias(queryFormatSection.x.$options)

  return {
    aliasProperty,
    has: enums.has.many,
    x: queryFormatSection.x,
    schemaProperty: schemaProperty,
    nodeName: queryFormatSection.id,
    property: aliasProperty || schemaProperty,
    ...getOptionsBoolean(queryFormatSection.x),
  }
}


/**
 * @param { td.QueryRequestFormatX } x
 * @returns { OptionsBooleans }
 */ 
function getOptionsBoolean (x) {
  const booleans = { hasOptionsFind: false, hasPropAsResponse: false, hasCountOne: false }

  if (x?.$options?.length) {
    for (const $o of x.$options) {
      switch ($o.id) {
        case enums.idsQuery.Find:
          booleans.hasOptionsFind = true
          break
        case enums.idsQuery.PropertyAsResponse:
          booleans.hasPropAsResponse = true
          break
        case enums.idsQuery.Limit:
          if ($o.x.count === 1) booleans.hasCountOne = true
          break
      }
    }
  }

  return booleans
}