import { getRelationshipNode } from './getRelationshipNode.js'
import { enums, Schema, QueryDerived, QueryDerivedProperty, QueryDerivedValue } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { any } queryFormatSection
 * @param { string } nodeName
 * @param { { [k: string]: any } } graphNode 
 */
export function getDerivedNode (schema, queryFormatSection, nodeName, graphNode) {
  let derivedNode = /** @type { { [k: string]: any } } */ ({})

  if (graphNode.$derived) {
    for (const property in graphNode.$derived) {
      derivedNode[property] = getDerivedValue(graphNode.$derived[property].items, graphNode.$derived[property].symbol)
    }
  }

  for (const property in graphNode) {
    // @ts-ignore
    if (!enums.reservedQueryFormatKeys[property]) {
      if (typeof graphNode[property] !== 'object') derivedNode[property] = graphNode[property]
      else if (!Array.isArray(graphNode[property])) derivedNode[property] = getDerivedNode(schema, queryFormatSection, nodeName, graphNode[property])
      else {
        const array = []

        for (const n of graphNode[property]) {
          array.push(getDerivedNode(schema, queryFormatSection, nodeName, n))
        }

        derivedNode[property] = array
      }
    }
  }

  return derivedNode


  /**
   * @param { (QueryDerived | QueryDerivedProperty | QueryDerivedValue)[] } items 
   * @param { enums.queryDerivedSymbol } symbol 
   * @returns { number | string | undefined }
   */
  function getDerivedValue (items, symbol) {
    const request = /** @type { any } */ ({ value: undefined, using: undefined })

    for (const item of items) {
      switch (item.is.str) {
        case 'QueryDerived':
          const queryDerivedItem = /** @type { QueryDerived } */ (item)
          const v = getDerivedValue(queryDerivedItem.items, queryDerivedItem.symbol)
          setDerivedValueAndUsing(request, queryDerivedItem.symbol, v)
          break
        case 'QueryDerivedValue':
          const queryDerivedValue = /** @type { QueryDerivedValue } */ (item)
          setDerivedValueAndUsing(request, symbol, queryDerivedValue.value)
          break
        case 'QueryDerivedProperty':
          const queryDerivedProperty = /** @type { QueryDerivedProperty } */ (item)
          
          if (!queryDerivedProperty.relationships?.length) setDerivedValueAndUsing(request, symbol, graphNode[queryDerivedProperty.property] || derivedNode[queryDerivedProperty.property])
          else {
            const relationshipNode = getRelationshipNode(schema, queryDerivedProperty.relationships, nodeName, queryFormatSection, graphNode, derivedNode)
            if (relationshipNode?.[queryDerivedProperty.property]) setDerivedValueAndUsing(request, symbol, relationshipNode[queryDerivedProperty.property])
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
}
