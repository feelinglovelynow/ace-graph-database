import { getRelationshipNode } from './getRelationshipNode.js'
import { td, enums, Schema, QueryValue, QueryProperty, QueryDerivedGroup } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { (QueryDerivedGroup | QueryProperty | QueryValue)[] } items 
 * @param { enums.queryDerivedSymbol } symbol 
 * @param { td.QueryRequestFormat } queryFormatSection
 * @param { string } nodeName
 * @param { { [k: string]: any } } graphNode 
 * @returns { number | string | undefined }
 */
export function getDerivedValue (schema, items, symbol, queryFormatSection, nodeName, graphNode) {
  const request = /** @type { any } */ ({ value: undefined, using: undefined })

  for (const item of items) {
    switch (item.info.name) {
      case enums.classInfoNames.QueryDerivedGroup:
        const queryDerivedGroup = /** @type { QueryDerivedGroup } */ (item)
        const v = getDerivedValue(schema, queryDerivedGroup.items, queryDerivedGroup.symbol, queryFormatSection, nodeName, graphNode)
        setDerivedValueAndUsing(request, queryDerivedGroup.symbol, v)
        break
      case enums.classInfoNames.QueryValue:
        const queryValue = /** @type { QueryValue } */ (item)
        setDerivedValueAndUsing(request, symbol, queryValue.value)
        break
      case enums.classInfoNames.QueryProperty:
        const queryProperty = /** @type { QueryProperty } */ (item)

        if (!queryProperty.relationships?.length) setDerivedValueAndUsing(request, symbol, graphNode[queryProperty.property])
        else {
          const relationshipNode = getRelationshipNode(schema, queryProperty.relationships, queryFormatSection, graphNode)
          if (relationshipNode?.[queryProperty.property]) setDerivedValueAndUsing(request, symbol, relationshipNode[queryProperty.property])
        }

        break
    }
  }

  return request.value
}


/**
 * @param { { value: any, using: any } } request 
 * @param { enums.queryDerivedSymbol } symbol 
 * @param { any } derivedValue 
 */
function setDerivedValueAndUsing (request, symbol, derivedValue) {
  if (typeof request.value === 'undefined') request.value = derivedValue
  else if (request.using === 'string' || typeof derivedValue === 'string') {
    request.using = request.using || 'string'
    if (symbol === enums.queryDerivedSymbol.add) request.value += derivedValue
  } else if (typeof derivedValue === 'number') {
    request.using = request.using || 'number'
    if (symbol === enums.queryDerivedSymbol.add) request.value += derivedValue
    else if (symbol === enums.queryDerivedSymbol.subtract) request.value -= derivedValue
    else if (symbol === enums.queryDerivedSymbol.multiply) request.value *= derivedValue
    else if (symbol === enums.queryDerivedSymbol.divide) request.value /= derivedValue
  }
}
