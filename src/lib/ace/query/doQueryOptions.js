import { td, enums } from '#ace'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { getRelationshipNode } from './getRelationshipNode.js'
import { DEFAULT_QUERY_OPTIONS_FLOW, POST_QUERY_OPTIONS_FLOW } from '../../variables.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { boolean } isUsingSortIndex 
 * @param { string[] } uids 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 * @returns { Promise<void> }
 */
export async function doQueryOptions (xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport) {
  if (xGenerated.x?.$o) {
    /** @type { boolean } Set to true when ...AsRes is used */
    let hasValueAsResponse = false

    /** @type { Set<string> } If we have completed an option put it in done */
    const doneOptions = new Set()

    if (xGenerated.x?.$o.flow) { // do in requested flow order
      for (const option of xGenerated.x?.$o.flow) {
        await doOption(option, hasValueAsResponse, doneOptions, xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport)
      }
    }

    for (const option of DEFAULT_QUERY_OPTIONS_FLOW) { // do in default flow order
      await doOption(option, hasValueAsResponse, doneOptions, xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport)
    }

    for (const option of POST_QUERY_OPTIONS_FLOW) { // do post flow order
      await doOption(option, hasValueAsResponse, doneOptions, xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport)
    }


    if (hasValueAsResponse || xGenerated.has === enums.has.one || xGenerated.x?.$o?.limit?.count === 1 || xGenerated.x?.$o?.findByUid || xGenerated.x?.$o?.findBy_Uid || xGenerated.x?.$o?.findByUnique || xGenerated.x?.$o?.findByOr || xGenerated.x?.$o?.findByAnd || xGenerated.x?.$o?.findByDefined || xGenerated.x?.$o?.findByUndefined || xGenerated.x?.$o?.findByPropValue || xGenerated.x?.$o?.findByPropProp || xGenerated.x?.$o?.findByPropRes) {
      res.now[xGenerated.propName] = typeof res.now[xGenerated.propName]?.[0] === 'undefined' ? null : res.now[xGenerated.propName][0]
      res.original[xGenerated.propName] = typeof res.original[xGenerated.propName]?.[0] === 'undefined' ? null : res.original[xGenerated.propName][0]
    }
  }
}



/**
 * @param { string } option
 * @param { boolean } hasValueAsResponse
 * @param { Set<string> } doneOptions
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { boolean } isUsingSortIndex 
 * @param { string[] } uids 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 * @returns { Promise<void> }
 */
async function doOption (option, hasValueAsResponse, doneOptions, xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport) {
  if (!hasValueAsResponse && !doneOptions.has(option) && xGenerated.x?.$o?.[/** @type { keyof td.AceQueryRequestItemNodeOptions } */(option)]) {
    switch (option) {
      case enums.queryOptions.findByOr:
      case enums.queryOptions.findByAnd:
      case enums.queryOptions.findByDefined:
      case enums.queryOptions.findByUndefined:
      case enums.queryOptions.findByPropValue:
      case enums.queryOptions.findByPropProp:
      case enums.queryOptions.findByPropRes:
      case enums.queryOptions.filterByOr:
      case enums.queryOptions.filterByAnd:
      case enums.queryOptions.filterByDefined:
      case enums.queryOptions.filterByUndefined:
      case enums.queryOptions.filterByPropValue:
      case enums.queryOptions.filterByPropProp:
      case enums.queryOptions.filterByPropRes:
        await queryWhere(xGenerated, res, option, publicJWKs, passport)
        break

      case enums.queryOptions.limit:
        doLimit(xGenerated, res)
        break

      case enums.queryOptions.sort:
        doSort(xGenerated, res, isUsingSortIndex)
        break

      case enums.queryOptions.newProps:
        doNewProps(xGenerated, res, passport)
        break

      case enums.queryOptions.sumAsProp:
        doSumAsProp(xGenerated, res)
        break

      case enums.queryOptions.avgAsProp:
        doAvgAsProp(xGenerated, res)
        break

      case enums.postQueryOptions.avgAsRes:
        hasValueAsResponse = true
        doAvgAsRes(xGenerated, res)
        break

      case enums.queryOptions.minAmtAsProp:
        doMinAmtAsProp(xGenerated, res)
        break

      case enums.postQueryOptions.minAmtAsRes:
        hasValueAsResponse = true
        doMinAmtAsRes(xGenerated, res)
        break

      case enums.postQueryOptions.minNodeAsRes:
        hasValueAsResponse = true
        doMinNodeAsRes(xGenerated, res)
        break

      case enums.queryOptions.maxAmtAsProp:
        doMaxAmtAsProp(xGenerated, res)
        break

      case enums.postQueryOptions.maxAmtAsRes:
        hasValueAsResponse = true
        doMaxAmtAsRes(xGenerated, res)
        break

      case enums.postQueryOptions.maxNodeAsRes:
        hasValueAsResponse = true
        doMaxNodeAsRes(xGenerated, res)
        break

      case enums.queryOptions.countAsProp:
        doCountAsProp(xGenerated, res, uids)
        break

      case enums.postQueryOptions.countAsRes:
        hasValueAsResponse = true
        doCountAsRes(xGenerated, res, uids)
        break

      case enums.postQueryOptions.propAsRes:
        hasValueAsResponse = true
        doPropAsRes(xGenerated, res, passport)
        break

      case enums.postQueryOptions.sumAsRes:
        hasValueAsResponse = true
        doSumAsRes(xGenerated, res)
        break

      case enums.queryOptions.propAdjToRes:
        doPropAdjacentToRes(xGenerated, res, passport)
        break
    }
  }

  doneOptions.add(option)
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doLimit (xGenerated, res) {
  if (xGenerated.x?.$o?.limit) {
    const limit = xGenerated.x?.$o.limit

    if (limit.skip && limit.count) {
      res.now[xGenerated.propName] = res.now[xGenerated.propName].slice(limit.skip, limit.skip + limit.count)
      res.original[xGenerated.propName] = res.original[xGenerated.propName].slice(limit.skip, limit.skip + limit.count)
    } else if (limit.skip) {
      res.now[xGenerated.propName] = res.now[xGenerated.propName].slice(limit.skip)
      res.original[xGenerated.propName] = res.original[xGenerated.propName].slice(limit.skip)
    } else if (limit.count) {
      res.now[xGenerated.propName] = res.now[xGenerated.propName].slice(0, limit.count)
      res.original[xGenerated.propName] = res.original[xGenerated.propName].slice(0, limit.count)
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { boolean } isUsingSortIndex 
 * @returns { void }
 */
function doSort (xGenerated, res, isUsingSortIndex) {
  if (!isUsingSortIndex && xGenerated.x?.$o?.sort) { // IF not using a sorted index array => sort items
    const combined = []
    const sort = xGenerated.x?.$o.sort

    for (let i = 0; i < res.original[xGenerated.propName].length; i++) {
      combined.push({
        now: res.now[xGenerated.propName][i],
        original: res.original[xGenerated.propName][i],
      })
    }

    combined.sort((a, b) => {
      let rSort = 0
      let x = a.now[sort.prop]
      let y = b.now[sort.prop]

      if (x < y) rSort = (sort.how === enums.sortHow.dsc) ? 1 : -1
      if (x > y) rSort = (sort.how === enums.sortHow.dsc) ? -1 : 1

      return rSort
    })

    res.now[xGenerated.propName] = combined.map((value) => value.now)
    res.original[xGenerated.propName] = combined.map((value) => value.original)
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @returns { void }
 */
function doNewProps (xGenerated, res, passport) {
  const newPropKeys = Object.keys(xGenerated.x?.$o?.newProps || {})

  if (newPropKeys.length) {
    for (let i = 0; i < res.original[xGenerated.propName].length; i++) { // looping graph nodes
      for (const prop of newPropKeys) {
        const derivedGroup = /** @type { td.AceQueryDerivedGroup } */ (xGenerated.x?.$o?.newProps?.[prop])
        const derivedValue = getDerivedValue(xGenerated, res.original[xGenerated.propName][i], derivedGroup, passport)

        res.original[xGenerated.propName][i][prop] = derivedValue
        if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[xGenerated.propName][i][prop] = derivedValue
      }
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doSumAsProp (xGenerated, res) {
  if (xGenerated.x?.$o?.sumAsProp) {
    let sum = 0
    const sumAsProp = xGenerated.x?.$o.sumAsProp

    for (let arrayItem of res.original[xGenerated.propName]) {
      sum += arrayItem[sumAsProp.computeProp]
    }

    for (let i = 0; i < res.original[xGenerated.propName].length; i++) {
      res.original[xGenerated.propName][i][sumAsProp.newProp] = sum
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[xGenerated.propName][i][sumAsProp.newProp] = sum
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doSumAsRes (xGenerated, res) {
  if (xGenerated.x?.$o?.sumAsRes) {
    let sum = 0
    const sumAsRes = xGenerated.x?.$o.sumAsRes

    for (let arrayItem of res.original[xGenerated.propName]) {
      sum += arrayItem[sumAsRes]
    }

    res.original[xGenerated.propName] = [sum]
    if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[xGenerated.propName] = [ sum ]
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doAvgAsProp (xGenerated, res) {
  if (xGenerated.x?.$o?.avgAsProp) {
    let sum = 0

    const avgAsProp = xGenerated.x?.$o.avgAsProp
    const original = res.original[xGenerated.propName]

    for (let arrayItem of original) {
      sum += arrayItem[avgAsProp.computeProp]
    }

    const average = original.length ? sum / original.length : 0

    for (let i = 0; i < original.length; i++) {
      original[i][avgAsProp.newProp] = average
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[xGenerated.propName][i][avgAsProp.newProp] = average
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doAvgAsRes (xGenerated, res) {
  if (xGenerated.x?.$o?.avgAsRes) {
    let sum = 0

    const avgAsRes = xGenerated.x?.$o.avgAsRes
    const original = res.original[xGenerated.propName]

    for (let arrayItem of original) {
      sum += arrayItem[avgAsRes]
    }

    const average = original.length ? sum / original.length : 0

    res.now[xGenerated.propName] = [average]
    res.original[xGenerated.propName] = [average]
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doMinAmtAsProp (xGenerated, res) {
  if (xGenerated.x?.$o?.minAmtAsProp) {
    let amount = 0

    const minAmtAsProp = xGenerated.x?.$o.minAmtAsProp
    const original = res.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[minAmtAsProp.computeProp] < amount) amount = arrayItem[minAmtAsProp.computeProp]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][minAmtAsProp.newProp] = amount
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[xGenerated.propName][i][minAmtAsProp.newProp] = amount
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doMinAmtAsRes (xGenerated, res) {
  if (xGenerated.x?.$o?.minAmtAsRes) {
    let amount = 0

    const minAmtAsRes = xGenerated.x?.$o.minAmtAsRes
    const original = res.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[minAmtAsRes] < amount) amount = arrayItem[minAmtAsRes]
    }

    res.now[xGenerated.propName] = [amount]
    res.original[xGenerated.propName] = [amount]
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doMinNodeAsRes (xGenerated, res) {
  if (xGenerated.x?.$o?.minNodeAsRes) {
    let node = null
    let amount = 0

    const minNodeAsRes = xGenerated.x?.$o.minNodeAsRes
    const original = res.original[xGenerated.propName]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][minNodeAsRes] < amount) {
        amount = original[i][minNodeAsRes]
        node = res.now[xGenerated.propName][i]
      }
    }

    res.now[xGenerated.propName] = [node]
    res.original[xGenerated.propName] = [node]
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doMaxNodeAsRes (xGenerated, res) {
  if (xGenerated.x?.$o?.maxNodeAsRes) {
    let node = null
    let amount = 0

    const maxNodeAsRes = xGenerated.x?.$o.maxNodeAsRes
    const original = res.original[xGenerated.propName]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][maxNodeAsRes] > amount) {
        amount = original[i][maxNodeAsRes]
        node = res.now[xGenerated.propName][i]
      }
    }

    res.now[xGenerated.propName] = [node]
    res.original[xGenerated.propName] = [node]
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doMaxAmtAsProp (xGenerated, res) {
  if (xGenerated.x?.$o?.maxAmtAsProp) {
    let amount = 0

    const maxAmtAsProp = xGenerated.x?.$o?.maxAmtAsProp
    const original = res.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[maxAmtAsProp.computeProp] > amount) amount = arrayItem[maxAmtAsProp.computeProp]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][maxAmtAsProp.newProp] = amount
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[xGenerated.propName][i][maxAmtAsProp.newProp] = amount
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @returns { void }
 */
function doMaxAmtAsRes (xGenerated, res) {
  if (xGenerated.x?.$o?.maxAmtAsRes) {
    let amount = 0

    const maxAmtAsRes = xGenerated.x?.$o.maxAmtAsRes
    const original = res.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[maxAmtAsRes] > amount) amount = arrayItem[maxAmtAsRes]
    }

    res.now[xGenerated.propName] = [amount]
    res.original[xGenerated.propName] = [amount]
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { string[] } uids 
 * @returns { void }
 */
function doCountAsProp (xGenerated, res, uids) {
  if (xGenerated.x?.$o?.countAsProp) {
    const count = getCount(xGenerated, res, uids)
    const countAsProp = xGenerated.x?.$o.countAsProp

    for (let i = 0; i < count; i++) {
      res.now[xGenerated.propName][i][countAsProp] = count
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.original[xGenerated.propName][i][countAsProp] = count
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { string[] } uids 
 * @returns { void }
 */
function doCountAsRes (xGenerated, res, uids) {
  if (xGenerated.x?.$o?.countAsRes) {
    const count = getCount(xGenerated, res, uids)

    res.now[xGenerated.propName] = [count]
    res.original[xGenerated.propName] = [count]
  }
}



/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { string[] } uids 
 * @returns { number }
 */
function getCount (xGenerated, res, uids) {
  let count

  if (!xGenerated.props.size) count = uids.length // IF x has no props, which means original is an empty aray, which means counting the uids length is optimal
  else count = res.original[xGenerated.propName].length

  return count
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @returns { void }
 */
function doPropAsRes (xGenerated, res, passport) {
  if (xGenerated.x?.$o?.propAsRes) {
    let value
    let original = res.original[xGenerated.propName]

    const propAsRes = xGenerated.x?.$o.propAsRes

    if (!propAsRes.relationships?.length) value = original?.[0]?.[propAsRes.prop]
    else {
      const rRelationshipNode = getRelationshipNode(xGenerated, original[0], passport, propAsRes.relationships)
      value = rRelationshipNode?.node?.[propAsRes.prop]
    }

    if (typeof value !== 'undefined') {
      res.now[xGenerated.propName] = [ value ]
      original = [ value ]
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @returns { void }
 */
function doPropAdjacentToRes (xGenerated, res, passport) {
  if (xGenerated.x?.$o?.propAdjToRes) {
    let value
    let original = res.original[xGenerated.propName]

    const propAdjToRes = xGenerated.x?.$o.propAdjToRes

    if (!propAdjToRes.relationships?.length) value = original?.[0]?.[propAdjToRes.sourceProp]
    else {
      const rRelationshipNode = getRelationshipNode(xGenerated, original[0], passport, propAdjToRes.relationships)
      value = rRelationshipNode?.node?.[propAdjToRes.sourceProp]
    }

    if (typeof value !== 'undefined') {
      res.now[propAdjToRes.adjacentProp] = value
      res.original[propAdjToRes.adjacentProp] = value
    }
  }
}
