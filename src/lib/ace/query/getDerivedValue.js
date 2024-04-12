import { td, enums } from '#ace'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { { [k: string]: any } } graphNode 
 * @param { enums.queryDerivedSymbol } symbol 
 * @param { (td.AceQueryDerivedGroup | td.AceQueryProperty | td.AceQueryValue)[] } items 
 * @param { td.AcePassport } passport 
 * @returns { number | string | undefined }
 */
export function getDerivedValue (xGenerated, graphNode, symbol, items, passport) {
  const request = /** @type { any } */ ({ value: undefined, using: undefined })

  for (const item of items) {
    switch (item.id) {
      case enums.idsQueryOptions.DerivedGroup:
        const queryDerivedGroup = /** @type { td.AceQueryDerivedGroup } */ (item)
        const v = getDerivedValue(xGenerated, graphNode, queryDerivedGroup.x.symbol, queryDerivedGroup.x.items, passport)
        setDerivedValueAndUsing(queryDerivedGroup.x.symbol, v)
        break
      case enums.idsQueryOptions.Value:
        const queryValue = /** @type { td.AceQueryValue } */ (item)
        setDerivedValueAndUsing(symbol, queryValue.x.value)
        break
      case enums.idsQueryOptions.Property:
        const queryProperty = /** @type { td.AceQueryProperty } */ (item)

        if (!queryProperty.x.relationships?.length) setDerivedValueAndUsing(symbol, graphNode[queryProperty.x.property])
        else {
          const rRelationshipNode = getRelationshipNode(xGenerated, graphNode, passport, queryProperty.x.relationships)
          if (rRelationshipNode.node?.[queryProperty.x.property]) setDerivedValueAndUsing(symbol, rRelationshipNode.node[queryProperty.x.property])
        }

        break
    }
  }

  return request.value


  /**
   * @param { enums.queryDerivedSymbol } symbol 
   * @param { any } derivedValue 
   */
  function setDerivedValueAndUsing (symbol, derivedValue) {
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
}
