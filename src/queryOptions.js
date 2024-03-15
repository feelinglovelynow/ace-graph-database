import { td, enums } from '#manifest'
import { Passport } from './Passport.js'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.QueryRequestItemGeneratedXSection } generatedXQuerySection 
 * @param { td.QueryResponse } response 
 * @param { boolean } isUsingSortIndexNodes 
 * @param { td.QueryPublicJWKs | null } publicJWKs 
 * @param { Passport } passport 
 * @returns { Promise<void> }
 */
export async function implementQueryOptions (generatedXQuerySection, response, isUsingSortIndexNodes, publicJWKs, passport) {
  if (generatedXQuerySection.x.$options) {
    for (let option of generatedXQuerySection.x.$options) {
      switch (option.id) {
        case enums.idsQueryOptions.Find:
        case enums.idsQueryOptions.Filter:
        case enums.idsQueryOptions.FindGroup:
        case enums.idsQueryOptions.FilterGroup:
        case enums.idsQueryOptions.FindDefined:
        case enums.idsQueryOptions.FindUndefined:
        case enums.idsQueryOptions.FilterDefined:
        case enums.idsQueryOptions.FilterUndefined:
          await queryWhere(generatedXQuerySection, response, option, publicJWKs, passport)
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

  if (generatedXQuerySection.has === enums.has.one || generatedXQuerySection.hasOptionsFind || generatedXQuerySection.hasValueAsResponse || generatedXQuerySection.hasCountOne) {
    response.now[generatedXQuerySection.property] = typeof response.now[generatedXQuerySection.property]?.[0] === 'undefined' ? null : response.now[generatedXQuerySection.property][0]
    response.original[generatedXQuerySection.property] = typeof response.original[generatedXQuerySection.property]?.[0] === 'undefined' ? null : response.original[generatedXQuerySection.property][0]
  }


  /** @param { td.QueryLimit } option */
  function doLimit (option) {
    if (option.x.skip && option.x.count) {
      response.now[generatedXQuerySection.property] = response.now[generatedXQuerySection.property].slice(option.x.skip, option.x.skip + option.x.count)
      response.original[generatedXQuerySection.property] = response.original[generatedXQuerySection.property].slice(option.x.skip, option.x.skip + option.x.count)
    } else if (option.x.skip) {
      response.now[generatedXQuerySection.property] = response.now[generatedXQuerySection.property].slice(option.x.skip)
      response.original[generatedXQuerySection.property] = response.original[generatedXQuerySection.property].slice(option.x.skip)
    } else if (option.x.count) {
      response.now[generatedXQuerySection.property] = response.now[generatedXQuerySection.property].slice(0, option.x.count)
      response.original[generatedXQuerySection.property] = response.original[generatedXQuerySection.property].slice(0, option.x.count)
    }
  }


  /** @param { td.QuerySort } option */
  function doSort (option) {
    if (!isUsingSortIndexNodes) { // IF not using a sorted index array => sort items
      const property = option.x.property

      const combined = []

      for (let i = 0; i < response.original[generatedXQuerySection.property].length; i++) {
        combined.push({
          now: response.now[generatedXQuerySection.property][i],
          original: response.original[generatedXQuerySection.property][i],
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


  /** @param { td.QueryDerivedProperty } option */
  function doDerivedProperty (option) {
    for (let i = 0; i < response.original[generatedXQuerySection.property].length; i++) {
      const derivedValue = getDerivedValue(generatedXQuerySection, response.original[generatedXQuerySection.property][i], option.x.symbol, option.x.items, passport)

      response.original[generatedXQuerySection.property][i][option.x.newProperty] = derivedValue
      if (!option.x.isResponseHidden) response.now[generatedXQuerySection.property][i][option.x.newProperty] = derivedValue
    }
  }


  /** @param { td.QuerySumAsProperty } option */
  function doSumAsProperty (option) {
    let sum = 0

    for (let arrayItem of response.original[generatedXQuerySection.property]) {
      sum += arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < response.original[generatedXQuerySection.property].length; i++) {
      response.original[generatedXQuerySection.property][i][option.x.newProperty] = sum
      if (!option.x.isResponseHidden) response.now[generatedXQuerySection.property][i][option.x.newProperty] = sum
    }
  }


  /** @param { td.QuerySumAsResponse } option */
  function doSumAsResponse (option) {
    let sum = 0

    for (let arrayItem of response.original[generatedXQuerySection.property]) {
      sum += arrayItem[option.x.property]
    }

    response.now[generatedXQuerySection.property] = [sum]
    response.original[generatedXQuerySection.property] = [sum]
  }


  /** @param { td.QueryAverageAsProperty } option */
  function doAverageAsProperty (option) {
    let sum = 0

    const original = response.original[generatedXQuerySection.property]

    for (let arrayItem of original) {
      sum += arrayItem[option.x.computeProperty]
    }

    const average = original.length ? sum / original.length : 0

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = average
      if (!option.x.isResponseHidden) response.now[generatedXQuerySection.property][i][option.x.newProperty] = average
    }
  }


  /** @param { td.QueryAverageAsResponse } option */
  function doAverageAsResponse (option) {
    let sum = 0

    const original = response.original[generatedXQuerySection.property]

    for (let arrayItem of original) {
      sum += arrayItem[option.x.property]
    }

    const average = original.length ? sum / original.length : 0

    response.now[generatedXQuerySection.property] = [average]
    response.original[generatedXQuerySection.property] = [average]
  }


  /** @param { td.QueryMinAmountAsProperty } option */
  function doMinAmountAsProperty (option) {
    let amount = 0

    const original = response.original[generatedXQuerySection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.computeProperty] < amount) amount = arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = amount
      if (!option.x.isResponseHidden) response.now[generatedXQuerySection.property][i][option.x.newProperty] = amount
    }
  }


  /** @param { td.QueryMinAmountAsResponse } option */
  function doMinAmountAsResponse (option) {
    let amount = 0

    const original = response.original[generatedXQuerySection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.property] < amount) amount = arrayItem[option.x.property]
    }

    response.now[generatedXQuerySection.property] = [amount]
    response.original[generatedXQuerySection.property] = [amount]
  }


  /** @param { td.QueryMinNodeAsResponse } option */
  function doMinNodeAsResponse (option) {
    let node = null
    let amount = 0

    const original = response.original[generatedXQuerySection.property]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][option.x.property] < amount) {
        amount = original[i][option.x.property]
        node = response.now[generatedXQuerySection.property][i]
      }
    }

    response.now[generatedXQuerySection.property] = [node]
    response.original[generatedXQuerySection.property] = [node]
  }


  /** @param { td.QueryMaxNodeAsResponse } option */
  function doMaxNodeAsResponse (option) {
    let node = null
    let amount = 0

    const original = response.original[generatedXQuerySection.property]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][option.x.property] > amount) {
        amount = original[i][option.x.property]
        node = response.now[generatedXQuerySection.property][i]
      }
    }

    response.now[generatedXQuerySection.property] = [node]
    response.original[generatedXQuerySection.property] = [node]
  }


  /** @param { td.QueryMaxAmountAsProperty } option */
  function doMaxAmountAsProperty (option) {
    let amount = 0

    const original = response.original[generatedXQuerySection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.computeProperty] > amount) amount = arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = amount
      if (!option.x.isResponseHidden) response.now[generatedXQuerySection.property][i][option.x.newProperty] = amount
    }
  }


  /** @param { td.QueryMaxAmountAsResponse } option */
  function doMaxAmountAsResponse (option) {
    let amount = 0

    const original = response.original[generatedXQuerySection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.property] > amount) amount = arrayItem[option.x.property]
    }

    response.now[generatedXQuerySection.property] = [amount]
    response.original[generatedXQuerySection.property] = [amount]
  }


  /** @param { td.QueryCountAsProperty } option */
  function doCountAsProperty (option) {
    const count = response.original[generatedXQuerySection.property].length

    for (let i = 0; i < response.original[generatedXQuerySection.property].length; i++) {
      if (!option.x.isResponseHidden) response.now[generatedXQuerySection.property][i][option.x.newProperty] = count
      response.original[generatedXQuerySection.property][i][option.x.newProperty] = count
    }
  }


  function doCountAsResponse () {
    if (response.original[generatedXQuerySection.property].length) {
      response.now[generatedXQuerySection.property] = [response.original[generatedXQuerySection.property].length]
      response.original[generatedXQuerySection.property] = [response.original[generatedXQuerySection.property].length]
    }
  }


  /** @param { td.QueryPropertyAsResponse } option */
  function doPropertyAsResponse (option) {
    let value

    let original = response.original[generatedXQuerySection.property]

    if (!option.x.relationships?.length) value = original?.[0]?.[option.x.property]
    else {
      const rRelationshipNode = getRelationshipNode(generatedXQuerySection, original[0], passport, option.x.relationships)
      value = rRelationshipNode?.node?.[option.x.property]
    }

    if (typeof value !== 'undefined') {
      response.now[generatedXQuerySection.property] = [ value ]
      original = [ value ]
    }
  }


  /** @param { td.QueryPropertyAdjacentToResponse } option */
  function doPropertyAdjacentToResponse (option) {
    let value

    let original = response.original[generatedXQuerySection.property]

    if (!option.x.relationships?.length) value = original?.[0]?.[option.x.sourceProperty]
    else {
      const rRelationshipNode = getRelationshipNode(generatedXQuerySection, original[0], passport, option.x.relationships)
      value = rRelationshipNode?.node?.[option.x.sourceProperty]
    }

    if (typeof value !== 'undefined') {
      response.now[option.x.adjacentProperty] = value
      response.original[option.x.adjacentProperty] = value
    }
  }
}
