import { td, enums } from '#manifest'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
 * @param { { [k: string]: any } } graphNode 
 * @param { enums.queryDerivedSymbol } symbol 
 * @param { (td.QueryDerivedGroup | td.QueryProperty | td.QueryValue)[] } items 
 * @param { td.AcePassport } passport 
 * @returns { number | string | undefined }
 */
export function getDerivedValue (generatedQueryFormatSection, graphNode, symbol, items, passport) {
  const request = /** @type { any } */ ({ value: undefined, using: undefined })
  main()
  return request.value


  function main () {
    for (const item of items) {
      switch (item.id) {
        case enums.idsQuery.DerivedGroup:
          const queryDerivedGroup = /** @type { td.QueryDerivedGroup } */ (item)
          const v = getDerivedValue(generatedQueryFormatSection, graphNode, queryDerivedGroup.x.symbol, queryDerivedGroup.x.items, passport)
          setDerivedValueAndUsing(queryDerivedGroup.x.symbol, v)
          break
        case enums.idsQuery.Value:
          const queryValue = /** @type { td.QueryValue } */ (item)
          setDerivedValueAndUsing(symbol, queryValue.x.value)
          break
        case enums.idsQuery.Property:
          const queryProperty = /** @type { td.QueryProperty } */ (item)

          if (!queryProperty.x.relationships?.length) setDerivedValueAndUsing(symbol, graphNode[queryProperty.x.property])
          else {
            const rRelationshipNode = getRelationshipNode(generatedQueryFormatSection, graphNode, null, passport, queryProperty.x.relationships)
            if (rRelationshipNode.node?.[queryProperty.x.property]) setDerivedValueAndUsing(symbol, rRelationshipNode.node[queryProperty.x.property])
          }

          break
      }
    }
  }


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



