import { td, enums } from '#ace'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { getRelationshipNode } from './getRelationshipNode.js'
import { DEFAULT_QUERY_OPTIONS_FLOW, POST_QUERY_OPTIONS_FLOW } from '../../variables.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { boolean } isUsingSortIndex 
 * @param { string[] } uids 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 * @returns { Promise<void> }
 */
export async function doQueryOptions (xGenerated, response, isUsingSortIndex, uids, publicJWKs, passport) {
  if (xGenerated.x?.$o) {
    /** @type { boolean } Set to true when ...AsRes is used */
    let hasValueAsResponse = false

    /** @type { Set<string> } If we have completed an option put it in done */
    const doneOptions = new Set()

    if (xGenerated.x?.$o.flow) { // do in requested flow order
      for (const option of xGenerated.x?.$o.flow) {
        await doOption(option)
      }
    }

    for (const option of DEFAULT_QUERY_OPTIONS_FLOW) { // do in default flow order
      await doOption(option)
    }

    for (const option of POST_QUERY_OPTIONS_FLOW) { // do post flow order
      await doOption(option)
    }


    if (hasValueAsResponse || xGenerated.has === enums.has.one || xGenerated.x?.$o?.limit?.count === 1 || xGenerated.x?.$o?.findByUid || xGenerated.x?.$o?.findBy_Uid || xGenerated.x?.$o?.findByUnique || xGenerated.x?.$o?.findByOr || xGenerated.x?.$o?.findByAnd || xGenerated.x?.$o?.findByDefined || xGenerated.x?.$o?.findByUndefined || xGenerated.x?.$o?.findByPropValue || xGenerated.x?.$o?.findByPropProp || xGenerated.x?.$o?.findByPropRes) {
      response.now[xGenerated.propName] = typeof response.now[xGenerated.propName]?.[0] === 'undefined' ? null : response.now[xGenerated.propName][0]
      response.original[xGenerated.propName] = typeof response.original[xGenerated.propName]?.[0] === 'undefined' ? null : response.original[xGenerated.propName][0]
    }


    /** @param { string } option */
    async function doOption (option) {
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
            await queryWhere(xGenerated, response, option, publicJWKs, passport)
            break

          case enums.queryOptions.limit:
            doLimit()
            break

          case enums.queryOptions.sort:
            doSort()
            break

          case enums.queryOptions.newProps:
            doNewProps()
            break

          case enums.queryOptions.sumAsProp:
            doSumAsProp()
            break

          case enums.queryOptions.avgAsProp:
            doAvgAsProp()
            break

          case enums.postQueryOptions.avgAsRes:
            hasValueAsResponse = true
            doAvgAsRes()
            break

          case enums.queryOptions.minAmtAsProp:
            doMinAmtAsProp()
            break

          case enums.postQueryOptions.minAmtAsRes:
            hasValueAsResponse = true
            doMinAmtAsRes()
            break

          case enums.postQueryOptions.minNodeAsRes:
            hasValueAsResponse = true
            doMinNodeAsRes()
            break

          case enums.queryOptions.maxAmtAsProp:
            doMaxAmtAsProp()
            break

          case enums.postQueryOptions.maxAmtAsRes:
            hasValueAsResponse = true
            doMaxAmtAsRes()
            break

          case enums.postQueryOptions.maxNodeAsRes:
            hasValueAsResponse = true
            doMaxNodeAsRes()
            break

          case enums.queryOptions.countAsProp:
            doCountAsProp()
            break

          case enums.postQueryOptions.countAsRes:
            hasValueAsResponse = true
            doCountAsRes()
            break

          case enums.postQueryOptions.propAsRes:
            hasValueAsResponse = true
            doPropAsRes()
            break

          case enums.postQueryOptions.sumAsRes:
            hasValueAsResponse = true
            doSumAsRes()
            break

          case enums.queryOptions.propAdjToRes:
            doPropAdjacentToRes()
            break
        }
      }

      doneOptions.add(option)
    }
 

    function doLimit () {
      if (xGenerated.x?.$o?.limit) {
        const limit = xGenerated.x?.$o.limit

        if (limit.skip && limit.count) {
          response.now[xGenerated.propName] = response.now[xGenerated.propName].slice(limit.skip, limit.skip + limit.count)
          response.original[xGenerated.propName] = response.original[xGenerated.propName].slice(limit.skip, limit.skip + limit.count)
        } else if (limit.skip) {
          response.now[xGenerated.propName] = response.now[xGenerated.propName].slice(limit.skip)
          response.original[xGenerated.propName] = response.original[xGenerated.propName].slice(limit.skip)
        } else if (limit.count) {
          response.now[xGenerated.propName] = response.now[xGenerated.propName].slice(0, limit.count)
          response.original[xGenerated.propName] = response.original[xGenerated.propName].slice(0, limit.count)
        }
      }
    }


    function doSort () {
      if (!isUsingSortIndex && xGenerated.x?.$o?.sort) { // IF not using a sorted index array => sort items
        const combined = []
        const sort = xGenerated.x?.$o.sort

        for (let i = 0; i < response.original[xGenerated.propName].length; i++) {
          combined.push({
            now: response.now[xGenerated.propName][i],
            original: response.original[xGenerated.propName][i],
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

        response.now[xGenerated.propName] = combined.map((value) => value.now)
        response.original[xGenerated.propName] = combined.map((value) => value.original)
      }
    }


    function doNewProps () {
      const newPropKeys = Object.keys(xGenerated.x?.$o?.newProps || {})

      if (newPropKeys.length) {
        for (let i = 0; i < response.original[xGenerated.propName].length; i++) { // looping graph nodes
          for (const prop of newPropKeys) {
            const derivedGroup = /** @type { td.AceQueryDerivedGroup } */ (xGenerated.x?.$o?.newProps?.[prop])
            const derivedValue = getDerivedValue(xGenerated, response.original[xGenerated.propName][i], derivedGroup, passport)

            response.original[xGenerated.propName][i][prop] = derivedValue
            if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.now[xGenerated.propName][i][prop] = derivedValue
          }
        }
      }
    }


    function doSumAsProp () {
      if (xGenerated.x?.$o?.sumAsProp) {
        let sum = 0
        const sumAsProp = xGenerated.x?.$o.sumAsProp

        for (let arrayItem of response.original[xGenerated.propName]) {
          sum += arrayItem[sumAsProp.computeProp]
        }

        for (let i = 0; i < response.original[xGenerated.propName].length; i++) {
          response.original[xGenerated.propName][i][sumAsProp.newProp] = sum
          if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.now[xGenerated.propName][i][sumAsProp.newProp] = sum
        }
      }
    }


    function doSumAsRes () {
      if (xGenerated.x?.$o?.sumAsRes) {
        let sum = 0
        const sumAsRes = xGenerated.x?.$o.sumAsRes

        for (let arrayItem of response.original[xGenerated.propName]) {
          sum += arrayItem[sumAsRes]
        }

        response.original[xGenerated.propName] = [sum]
        if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.now[xGenerated.propName] = [ sum ]
      }
    }


    function doAvgAsProp () {
      if (xGenerated.x?.$o?.avgAsProp) {
        let sum = 0

        const avgAsProp = xGenerated.x?.$o.avgAsProp
        const original = response.original[xGenerated.propName]

        for (let arrayItem of original) {
          sum += arrayItem[avgAsProp.computeProp]
        }

        const average = original.length ? sum / original.length : 0

        for (let i = 0; i < original.length; i++) {
          original[i][avgAsProp.newProp] = average
          if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.now[xGenerated.propName][i][avgAsProp.newProp] = average
        }
      }
    }


    function doAvgAsRes () {
      if (xGenerated.x?.$o?.avgAsRes) {
        let sum = 0

        const avgAsRes = xGenerated.x?.$o.avgAsRes
        const original = response.original[xGenerated.propName]

        for (let arrayItem of original) {
          sum += arrayItem[avgAsRes]
        }

        const average = original.length ? sum / original.length : 0

        response.now[xGenerated.propName] = [average]
        response.original[xGenerated.propName] = [average]
      }
    }


    function doMinAmtAsProp () {
      if (xGenerated.x?.$o?.minAmtAsProp) {
        let amount = 0

        const minAmtAsProp = xGenerated.x?.$o.minAmtAsProp
        const original = response.original[xGenerated.propName]

        for (let arrayItem of original) {
          if (!amount || arrayItem[minAmtAsProp.computeProp] < amount) amount = arrayItem[minAmtAsProp.computeProp]
        }

        for (let i = 0; i < original.length; i++) {
          original[i][minAmtAsProp.newProp] = amount
          if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.now[xGenerated.propName][i][minAmtAsProp.newProp] = amount
        }
      }
    }


    function doMinAmtAsRes () {
      if (xGenerated.x?.$o?.minAmtAsRes) {
        let amount = 0

        const minAmtAsRes = xGenerated.x?.$o.minAmtAsRes
        const original = response.original[xGenerated.propName]

        for (let arrayItem of original) {
          if (!amount || arrayItem[minAmtAsRes] < amount) amount = arrayItem[minAmtAsRes]
        }

        response.now[xGenerated.propName] = [amount]
        response.original[xGenerated.propName] = [amount]
      }
    }


    function doMinNodeAsRes () {
      if (xGenerated.x?.$o?.minNodeAsRes) {
        let node = null
        let amount = 0

        const minNodeAsRes = xGenerated.x?.$o.minNodeAsRes
        const original = response.original[xGenerated.propName]

        for (let i = 0; i < original.length; i++) {
          if (!node || original[i][minNodeAsRes] < amount) {
            amount = original[i][minNodeAsRes]
            node = response.now[xGenerated.propName][i]
          }
        }

        response.now[xGenerated.propName] = [node]
        response.original[xGenerated.propName] = [node]
      }
    }


    function doMaxNodeAsRes () {
      if (xGenerated.x?.$o?.maxNodeAsRes) {
        let node = null
        let amount = 0

        const maxNodeAsRes = xGenerated.x?.$o.maxNodeAsRes
        const original = response.original[xGenerated.propName]

        for (let i = 0; i < original.length; i++) {
          if (!node || original[i][maxNodeAsRes] > amount) {
            amount = original[i][maxNodeAsRes]
            node = response.now[xGenerated.propName][i]
          }
        }

        response.now[xGenerated.propName] = [node]
        response.original[xGenerated.propName] = [node]
      }
    }


    function doMaxAmtAsProp () {
      if (xGenerated.x?.$o?.maxAmtAsProp) {
        let amount = 0

        const maxAmtAsProp = xGenerated.x?.$o?.maxAmtAsProp
        const original = response.original[xGenerated.propName]

        for (let arrayItem of original) {
          if (!amount || arrayItem[maxAmtAsProp.computeProp] > amount) amount = arrayItem[maxAmtAsProp.computeProp]
        }

        for (let i = 0; i < original.length; i++) {
          original[i][maxAmtAsProp.newProp] = amount
          if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.now[xGenerated.propName][i][maxAmtAsProp.newProp] = amount
        }
      }
    }


    function doMaxAmtAsRes () {
      if (xGenerated.x?.$o?.maxAmtAsRes) {
        let amount = 0

        const maxAmtAsRes = xGenerated.x?.$o.maxAmtAsRes
        const original = response.original[xGenerated.propName]

        for (let arrayItem of original) {
          if (!amount || arrayItem[maxAmtAsRes] > amount) amount = arrayItem[maxAmtAsRes]
        }

        response.now[xGenerated.propName] = [amount]
        response.original[xGenerated.propName] = [amount]
      }
    }


    function doCountAsProp () {
      if (xGenerated.x?.$o?.countAsProp) {
        const count = getCount()
        const countAsProp = xGenerated.x?.$o.countAsProp

        for (let i = 0; i < count; i++) {
          response.now[xGenerated.propName][i][countAsProp] = count
          if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) response.original[xGenerated.propName][i][countAsProp] = count
        }
      }
    }


    function doCountAsRes () {
      if (xGenerated.x?.$o?.countAsRes) {
        const count = getCount()

        response.now[xGenerated.propName] = [count]
        response.original[xGenerated.propName] = [count]
      }
    }

    /** @returns { number } */
    function getCount () {
      let count

      if (!xGenerated.props.size) count = uids.length // IF x has no props, which means original is an empty aray, which means counting the uids length is optimal
      else count = response.original[xGenerated.propName].length

      return count
    }


    function doPropAsRes () {
      if (xGenerated.x?.$o?.propAsRes) {
        let value
        let original = response.original[xGenerated.propName]

        const propAsRes = xGenerated.x?.$o.propAsRes

        if (!propAsRes.relationships?.length) value = original?.[0]?.[propAsRes.prop]
        else {
          const rRelationshipNode = getRelationshipNode(xGenerated, original[0], passport, propAsRes.relationships)
          value = rRelationshipNode?.node?.[propAsRes.prop]
        }

        if (typeof value !== 'undefined') {
          response.now[xGenerated.propName] = [ value ]
          original = [ value ]
        }
      }
    }


    function doPropAdjacentToRes () {
      if (xGenerated.x?.$o?.propAdjToRes) {
        let value
        let original = response.original[xGenerated.propName]

        const propAdjToRes = xGenerated.x?.$o.propAdjToRes

        if (!propAdjToRes.relationships?.length) value = original?.[0]?.[propAdjToRes.sourceProp]
        else {
          const rRelationshipNode = getRelationshipNode(xGenerated, original[0], passport, propAdjToRes.relationships)
          value = rRelationshipNode?.node?.[propAdjToRes.sourceProp]
        }

        if (typeof value !== 'undefined') {
          response.now[propAdjToRes.adjacentProp] = value
          response.original[propAdjToRes.adjacentProp] = value
        }
      }
    }
  }
}