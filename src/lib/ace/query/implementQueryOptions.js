import { td, enums } from '#manifest'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { boolean } isUsingSortIndex 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 * @returns { Promise<void> }
 */
export async function implementQueryOptions (xGenerated, response, isUsingSortIndex, publicJWKs, passport) {
  if (xGenerated.x.$options) {
    for (let option of xGenerated.x.$options) {
      switch (option.id) {
        case enums.idsQueryOptions.Find:
        case enums.idsQueryOptions.Filter:
        case enums.idsQueryOptions.FindGroup:
        case enums.idsQueryOptions.FilterGroup:
        case enums.idsQueryOptions.FindDefined:
        case enums.idsQueryOptions.FindUndefined:
        case enums.idsQueryOptions.FilterDefined:
        case enums.idsQueryOptions.FilterUndefined:
          await queryWhere(xGenerated, response, option, publicJWKs, passport)
          break

        case enums.idsQueryOptions.Limit:
          doLimit(option)
          break

        case enums.idsQueryOptions.Sort:
          doSort(option)
          break

        case enums.idsQueryOptions.DerivedProperty:
          doDerivedProperty(option)
          break

        case enums.idsQueryOptions.SumAsProperty:
          doSumAsProperty(option) 
          break

        case enums.idsQueryOptions.AverageAsProperty:
          doAverageAsProperty(option)
          break

        case enums.idsQueryOptions.AverageAsResponse:
          doAverageAsResponse(option)
          break

        case enums.idsQueryOptions.MinAmountAsProperty:
          doMinAmountAsProperty(option)
          break

        case enums.idsQueryOptions.MinAmountAsResponse:
          doMinAmountAsResponse(option)
          break

        case enums.idsQueryOptions.MinNodeAsResponse:
          doMinNodeAsResponse(option)
          break

        case enums.idsQueryOptions.MaxAmountAsProperty:
          doMaxAmountAsProperty(option)
          break

        case enums.idsQueryOptions.MaxAmountAsResponse:
          doMaxAmountAsResponse(option)
          break

        case enums.idsQueryOptions.MaxNodeAsResponse:
          doMaxNodeAsResponse(option)
          break

        case enums.idsQueryOptions.CountAsProperty:
          doCountAsProperty(option)
          break

        case enums.idsQueryOptions.CountAsResponse:
          doCountAsResponse()
          break

        case enums.idsQueryOptions.PropertyAsResponse:
          doPropertyAsResponse(option)
          break

        case enums.idsQueryOptions.SumAsResponse:
          doSumAsResponse(option)
          break

        case enums.idsQueryOptions.PropertyAdjacentToResponse:
          doPropertyAdjacentToResponse(option)
          break
      }
    }
  }

  if (xGenerated.has === enums.has.one || xGenerated.hasOptionsFind || xGenerated.hasValueAsResponse || xGenerated.hasCountOne) {
    response.now[xGenerated.propName] = typeof response.now[xGenerated.propName]?.[0] === 'undefined' ? null : response.now[xGenerated.propName][0]
    response.original[xGenerated.propName] = typeof response.original[xGenerated.propName]?.[0] === 'undefined' ? null : response.original[xGenerated.propName][0]
  }


  /** @param { td.AceQueryLimit } option */
  function doLimit (option) {
    if (option.x.skip && option.x.count) {
      response.now[xGenerated.propName] = response.now[xGenerated.propName].slice(option.x.skip, option.x.skip + option.x.count)
      response.original[xGenerated.propName] = response.original[xGenerated.propName].slice(option.x.skip, option.x.skip + option.x.count)
    } else if (option.x.skip) {
      response.now[xGenerated.propName] = response.now[xGenerated.propName].slice(option.x.skip)
      response.original[xGenerated.propName] = response.original[xGenerated.propName].slice(option.x.skip)
    } else if (option.x.count) {
      response.now[xGenerated.propName] = response.now[xGenerated.propName].slice(0, option.x.count)
      response.original[xGenerated.propName] = response.original[xGenerated.propName].slice(0, option.x.count)
    }
  }


  /** @param { td.AceQuerySort } option */
  function doSort (option) {
    if (!isUsingSortIndex) { // IF not using a sorted index array => sort items
      const property = option.x.property

      const combined = []

      for (let i = 0; i < response.original[xGenerated.propName].length; i++) {
        combined.push({
          now: response.now[xGenerated.propName][i],
          original: response.original[xGenerated.propName][i],
        })
      }

      combined.sort((a, b) => {
        let rSort = 0
        let x = a.original[property]
        let y = b.original[property]

        if (x < y) rSort = (option.x.direction === enums.sortOptions.dsc) ? 1 : -1
        if (x > y) rSort = (option.x.direction === enums.sortOptions.dsc) ? -1 : 1

        return rSort
      })

      response.now = combined.map((value) => value.now)
      response.original = combined.map((value) => value.original)
    }
  }


  /** @param { td.AceQueryDerivedProperty } option */
  function doDerivedProperty (option) {
    for (let i = 0; i < response.original[xGenerated.propName].length; i++) {
      const derivedValue = getDerivedValue(xGenerated, response.original[xGenerated.propName][i], option.x.symbol, option.x.items, passport)

      response.original[xGenerated.propName][i][option.x.newProperty] = derivedValue
      if (!option.x.isResponseHidden) response.now[xGenerated.propName][i][option.x.newProperty] = derivedValue
    }
  }


  /** @param { td.AceQuerySumAsProperty } option */
  function doSumAsProperty (option) {
    let sum = 0

    for (let arrayItem of response.original[xGenerated.propName]) {
      sum += arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < response.original[xGenerated.propName].length; i++) {
      response.original[xGenerated.propName][i][option.x.newProperty] = sum
      if (!option.x.isResponseHidden) response.now[xGenerated.propName][i][option.x.newProperty] = sum
    }
  }


  /** @param { td.AceQuerySumAsResponse } option */
  function doSumAsResponse (option) {
    let sum = 0

    for (let arrayItem of response.original[xGenerated.propName]) {
      sum += arrayItem[option.x.property]
    }

    response.now[xGenerated.propName] = [sum]
    response.original[xGenerated.propName] = [sum]
  }


  /** @param { td.AceQueryAverageAsProperty } option */
  function doAverageAsProperty (option) {
    let sum = 0

    const original = response.original[xGenerated.propName]

    for (let arrayItem of original) {
      sum += arrayItem[option.x.computeProperty]
    }

    const average = original.length ? sum / original.length : 0

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = average
      if (!option.x.isResponseHidden) response.now[xGenerated.propName][i][option.x.newProperty] = average
    }
  }


  /** @param { td.AceQueryAverageAsResponse } option */
  function doAverageAsResponse (option) {
    let sum = 0

    const original = response.original[xGenerated.propName]

    for (let arrayItem of original) {
      sum += arrayItem[option.x.property]
    }

    const average = original.length ? sum / original.length : 0

    response.now[xGenerated.propName] = [average]
    response.original[xGenerated.propName] = [average]
  }


  /** @param { td.AceQueryMinAmountAsProperty } option */
  function doMinAmountAsProperty (option) {
    let amount = 0

    const original = response.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.computeProperty] < amount) amount = arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = amount
      if (!option.x.isResponseHidden) response.now[xGenerated.propName][i][option.x.newProperty] = amount
    }
  }


  /** @param { td.AceQueryMinAmountAsResponse } option */
  function doMinAmountAsResponse (option) {
    let amount = 0

    const original = response.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.property] < amount) amount = arrayItem[option.x.property]
    }

    response.now[xGenerated.propName] = [amount]
    response.original[xGenerated.propName] = [amount]
  }


  /** @param { td.AceQueryMinNodeAsResponse } option */
  function doMinNodeAsResponse (option) {
    let node = null
    let amount = 0

    const original = response.original[xGenerated.propName]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][option.x.property] < amount) {
        amount = original[i][option.x.property]
        node = response.now[xGenerated.propName][i]
      }
    }

    response.now[xGenerated.propName] = [node]
    response.original[xGenerated.propName] = [node]
  }


  /** @param { td.AceQueryMaxNodeAsResponse } option */
  function doMaxNodeAsResponse (option) {
    let node = null
    let amount = 0

    const original = response.original[xGenerated.propName]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][option.x.property] > amount) {
        amount = original[i][option.x.property]
        node = response.now[xGenerated.propName][i]
      }
    }

    response.now[xGenerated.propName] = [node]
    response.original[xGenerated.propName] = [node]
  }


  /** @param { td.AceQueryMaxAmountAsProperty } option */
  function doMaxAmountAsProperty (option) {
    let amount = 0

    const original = response.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.computeProperty] > amount) amount = arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = amount
      if (!option.x.isResponseHidden) response.now[xGenerated.propName][i][option.x.newProperty] = amount
    }
  }


  /** @param { td.AceQueryMaxAmountAsResponse } option */
  function doMaxAmountAsResponse (option) {
    let amount = 0

    const original = response.original[xGenerated.propName]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.property] > amount) amount = arrayItem[option.x.property]
    }

    response.now[xGenerated.propName] = [amount]
    response.original[xGenerated.propName] = [amount]
  }


  /** @param { td.AceQueryCountAsProperty } option */
  function doCountAsProperty (option) {
    const count = response.original[xGenerated.propName].length

    for (let i = 0; i < response.original[xGenerated.propName].length; i++) {
      if (!option.x.isResponseHidden) response.now[xGenerated.propName][i][option.x.newProperty] = count
      response.original[xGenerated.propName][i][option.x.newProperty] = count
    }
  }


  function doCountAsResponse () {
    if (response.original[xGenerated.propName].length) {
      response.now[xGenerated.propName] = [response.original[xGenerated.propName].length]
      response.original[xGenerated.propName] = [response.original[xGenerated.propName].length]
    }
  }


  /** @param { td.AceQueryPropertyAsResponse } option */
  function doPropertyAsResponse (option) {
    let value

    let original = response.original[xGenerated.propName]

    if (!option.x.relationships?.length) value = original?.[0]?.[option.x.property]
    else {
      const rRelationshipNode = getRelationshipNode(xGenerated, original[0], passport, option.x.relationships)
      value = rRelationshipNode?.node?.[option.x.property]
    }

    if (typeof value !== 'undefined') {
      response.now[xGenerated.propName] = [ value ]
      original = [ value ]
    }
  }


  /** @param { td.AceQueryPropertyAdjacentToResponse } option */
  function doPropertyAdjacentToResponse (option) {
    let value

    let original = response.original[xGenerated.propName]

    if (!option.x.relationships?.length) value = original?.[0]?.[option.x.sourceProperty]
    else {
      const rRelationshipNode = getRelationshipNode(xGenerated, original[0], passport, option.x.relationships)
      value = rRelationshipNode?.node?.[option.x.sourceProperty]
    }

    if (typeof value !== 'undefined') {
      response.now[option.x.adjacentProperty] = value
      response.original[option.x.adjacentProperty] = value
    }
  }
}
