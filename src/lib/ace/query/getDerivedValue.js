import { td, enums } from '#ace'
import { AceError } from '../../objects/AceError.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { { [k: string]: any } } graphNode 
 * @param { td.AceQueryDerivedGroup } derivedGroup 
 * @param { td.AcePassport } passport 
 * @returns { number | string | undefined }
 */
export function getDerivedValue (xGenerated, graphNode, derivedGroup, passport) {
  const symbol = getSymbol(derivedGroup)
  const groupItems = symbol ? derivedGroup[symbol] : null
  const response = /** @type {*} */ ({ value: undefined, using: undefined })

  if (symbol && groupItems) {
    for (const item of groupItems) {
      if (/** @type { td.AceQueryProp } */ (item)?.prop) {
        const queryProp = /** @type { td.AceQueryProp } */ (item)

        if (!queryProp.relationships?.length) setDerivedValueAndUsing(symbol, graphNode[queryProp.prop], response)
        else {
          const rRelationshipNode = getRelationshipNode(xGenerated, graphNode, passport, queryProp.relationships)
          if (rRelationshipNode.node?.[queryProp.prop]) setDerivedValueAndUsing(symbol, rRelationshipNode.node[queryProp.prop], response)
        }
      } else if (/** @type { td.AceQueryDerivedGroup } */ (item)?.add || /** @type { td.AceQueryDerivedGroup } */ (item)?.subtract || /** @type { td.AceQueryDerivedGroup } */ (item)?.multiply || /** @type { td.AceQueryDerivedGroup } */ (item)?.divide) {
        const queryDerivedGroup = /** @type { td.AceQueryDerivedGroup } */ (item)
        const v = getDerivedValue(xGenerated, graphNode, queryDerivedGroup, passport)
        setDerivedValueAndUsing(symbol, v, response)
      } else {
        setDerivedValueAndUsing(symbol, item, response)
      }
    }
  }

  return response.value
}


/**
 * @param { enums.queryDerivedSymbol } symbol 
 * @param { any } derivedValue 
 * @param { any } response 
 */
function setDerivedValueAndUsing (symbol, derivedValue, response) {
  if (typeof response.value === 'undefined') response.value = derivedValue
  else if (response.using === 'string' || typeof derivedValue === 'string') {
    response.using = response.using || 'string'
    if (symbol === enums.queryDerivedSymbol.add) response.value += derivedValue
  } else if (typeof derivedValue === 'number') {
    response.using = response.using || 'number'
    if (symbol === enums.queryDerivedSymbol.add) response.value += derivedValue
    else if (symbol === enums.queryDerivedSymbol.subtract) response.value -= derivedValue
    else if (symbol === enums.queryDerivedSymbol.multiply) response.value *= derivedValue
    else if (symbol === enums.queryDerivedSymbol.divide) response.value /= derivedValue
  }
}


/**
 * @param {*} derivedGroup 
 * @returns { enums.queryDerivedSymbol }
 */
function getSymbol (derivedGroup) {
  let symbol

  if (derivedGroup.add) symbol = enums.queryDerivedSymbol.add
  else if (derivedGroup.subtract) symbol = enums.queryDerivedSymbol.subtract
  else if (derivedGroup.multiply) symbol = enums.queryDerivedSymbol.multiply
  else if (derivedGroup.divide) symbol = enums.queryDerivedSymbol.divide
  else throw AceError('aceFn__invalidNewPropsSymbol', 'Please include add, subtract, multiply or divide when using newProps', { current: derivedGroup, example: { newProps: { fullName: { add: [ { prop: 'firstName' }, ' ', { prop: 'lastName' } ] } } } } )

  return symbol
}
