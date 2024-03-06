import { td, enums } from '#manifest'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
 * @param { td.QueryResponse } response 
 * @param { boolean } isUsingSortIndexNodes 
 * @param { td.QueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 * @returns { Promise<void> }
 */
export async function implementQueryOptions (generatedQueryFormatSection, response, isUsingSortIndexNodes, publicJWKs, passport) {
  if (generatedQueryFormatSection.x.$options) {
    for (let option of generatedQueryFormatSection.x.$options) {
      switch (option.id) {
        case enums.idsQuery.Find:
        case enums.idsQuery.Filter:
        case enums.idsQuery.FindGroup:
        case enums.idsQuery.FilterGroup:
        case enums.idsQuery.FindDefined:
        case enums.idsQuery.FindUndefined:
        case enums.idsQuery.FilterDefined:
        case enums.idsQuery.FilterUndefined:
          await queryWhere(generatedQueryFormatSection, response, option, publicJWKs, passport)
          break

        case enums.idsQuery.Limit:
          doLimit(option)
          break

        case enums.idsQuery.Sort:
          doSort(option)
          break

        case enums.idsQuery.DerivedProperty:
          doDerivedProperty(option)
          break

        case enums.idsQuery.SumAsProperty:
          doSumAsProperty(option) 
          break

        case enums.idsQuery.AverageAsProperty:
          doAverageAsProperty(option)
          break

        case enums.idsQuery.AverageAsResponse:
          doAverageAsResponse(option)
          break

        case enums.idsQuery.MinAmountAsProperty:
          doMinAmountAsProperty(option)
          break

        case enums.idsQuery.MinAmountAsResponse:
          doMinAmountAsResponse(option)
          break

        case enums.idsQuery.MinNodeAsResponse:
          doMinNodeAsResponse(option)
          break

        case enums.idsQuery.MaxAmountAsProperty:
          doMaxAmountAsProperty(option)
          break

        case enums.idsQuery.MaxAmountAsResponse:
          doMaxAmountAsResponse(option)
          break

        case enums.idsQuery.MaxNodeAsResponse:
          doMaxNodeAsResponse(option)
          break

        case enums.idsQuery.CountAsProperty:
          doCountAsProperty(option)
          break

        case enums.idsQuery.CountAsResponse:
          doCountAsResponse()
          break

        case enums.idsQuery.PropertyAsResponse:
          doPropertyAsResponse(option)
          break

        case enums.idsQuery.SumAsResponse:
          doSumAsResponse(option)
          break

        case enums.idsQuery.PropertyAdjacentToResponse:
          doPropertyAdjacentToResponse(option)
          break
      }
    }
  }

  if (generatedQueryFormatSection.has === enums.has.one || generatedQueryFormatSection.hasOptionsFind || generatedQueryFormatSection.hasValueAsResponse || generatedQueryFormatSection.hasCountOne) {
    response.current[generatedQueryFormatSection.property] = typeof response.current[generatedQueryFormatSection.property]?.[0] === 'undefined' ? null : response.current[generatedQueryFormatSection.property][0]
    response.original[generatedQueryFormatSection.property] = typeof response.original[generatedQueryFormatSection.property]?.[0] === 'undefined' ? null : response.original[generatedQueryFormatSection.property][0]
  }


  /** @param { td.QueryLimit } option */
  function doLimit (option) {
    if (option.x.skip && option.x.count) {
      response.current[generatedQueryFormatSection.property] = response.current[generatedQueryFormatSection.property].slice(option.x.skip, option.x.skip + option.x.count)
      response.original[generatedQueryFormatSection.property] = response.original[generatedQueryFormatSection.property].slice(option.x.skip, option.x.skip + option.x.count)
    } else if (option.x.skip) {
      response.current[generatedQueryFormatSection.property] = response.current[generatedQueryFormatSection.property].slice(option.x.skip)
      response.original[generatedQueryFormatSection.property] = response.original[generatedQueryFormatSection.property].slice(option.x.skip)
    } else if (option.x.count) {
      response.current[generatedQueryFormatSection.property] = response.current[generatedQueryFormatSection.property].slice(0, option.x.count)
      response.original[generatedQueryFormatSection.property] = response.original[generatedQueryFormatSection.property].slice(0, option.x.count)
    }
  }


  /** @param { td.QuerySort } option */
  function doSort (option) {
    if (!isUsingSortIndexNodes) { // IF not using a sorted index array => sort items
      const property = option.x.property

      const combined = []

      for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
        combined.push({
          current: response.current[generatedQueryFormatSection.property][i],
          original: response.original[generatedQueryFormatSection.property][i],
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

      response.current = combined.map((value) => value.current)
      response.original = combined.map((value) => value.original)
    }
  }


  /** @param { td.QueryDerivedProperty } option */
  function doDerivedProperty (option) {
    for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
      const derivedValue = getDerivedValue(generatedQueryFormatSection, response.original[generatedQueryFormatSection.property][i], option.x.symbol, option.x.items, passport)

      response.original[generatedQueryFormatSection.property][i][option.x.newProperty] = derivedValue
      if (!option.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][option.x.newProperty] = derivedValue
    }
  }


  /** @param { td.QuerySumAsProperty } option */
  function doSumAsProperty (option) {
    let sum = 0

    for (let arrayItem of response.original[generatedQueryFormatSection.property]) {
      sum += arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
      response.original[generatedQueryFormatSection.property][i][option.x.newProperty] = sum
      if (!option.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][option.x.newProperty] = sum
    }
  }


  /** @param { td.QuerySumAsResponse } option */
  function doSumAsResponse (option) {
    let sum = 0

    for (let arrayItem of response.original[generatedQueryFormatSection.property]) {
      sum += arrayItem[option.x.property]
    }

    response.current[generatedQueryFormatSection.property] = [sum]
    response.original[generatedQueryFormatSection.property] = [sum]
  }


  /** @param { td.QueryAverageAsProperty } option */
  function doAverageAsProperty (option) {
    let sum = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let arrayItem of original) {
      sum += arrayItem[option.x.computeProperty]
    }

    const average = original.length ? sum / original.length : 0

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = average
      if (!option.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][option.x.newProperty] = average
    }
  }


  /** @param { td.QueryAverageAsResponse } option */
  function doAverageAsResponse (option) {
    let sum = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let arrayItem of original) {
      sum += arrayItem[option.x.property]
    }

    const average = original.length ? sum / original.length : 0

    response.current[generatedQueryFormatSection.property] = [average]
    response.original[generatedQueryFormatSection.property] = [average]
  }


  /** @param { td.QueryMinAmountAsProperty } option */
  function doMinAmountAsProperty (option) {
    let amount = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.computeProperty] < amount) amount = arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = amount
      if (!option.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][option.x.newProperty] = amount
    }
  }


  /** @param { td.QueryMinAmountAsResponse } option */
  function doMinAmountAsResponse (option) {
    let amount = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.property] < amount) amount = arrayItem[option.x.property]
    }

    response.current[generatedQueryFormatSection.property] = [amount]
    response.original[generatedQueryFormatSection.property] = [amount]
  }


  /** @param { td.QueryMinNodeAsResponse } option */
  function doMinNodeAsResponse (option) {
    let node = null
    let amount = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][option.x.property] < amount) {
        amount = original[i][option.x.property]
        node = response.current[generatedQueryFormatSection.property][i]
      }
    }

    response.current[generatedQueryFormatSection.property] = [node]
    response.original[generatedQueryFormatSection.property] = [node]
  }


  /** @param { td.QueryMaxNodeAsResponse } option */
  function doMaxNodeAsResponse (option) {
    let node = null
    let amount = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let i = 0; i < original.length; i++) {
      if (!node || original[i][option.x.property] > amount) {
        amount = original[i][option.x.property]
        node = response.current[generatedQueryFormatSection.property][i]
      }
    }

    response.current[generatedQueryFormatSection.property] = [node]
    response.original[generatedQueryFormatSection.property] = [node]
  }


  /** @param { td.QueryMaxAmountAsProperty } option */
  function doMaxAmountAsProperty (option) {
    let amount = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.computeProperty] > amount) amount = arrayItem[option.x.computeProperty]
    }

    for (let i = 0; i < original.length; i++) {
      original[i][option.x.newProperty] = amount
      if (!option.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][option.x.newProperty] = amount
    }
  }


  /** @param { td.QueryMaxAmountAsResponse } option */
  function doMaxAmountAsResponse (option) {
    let amount = 0

    const original = response.original[generatedQueryFormatSection.property]

    for (let arrayItem of original) {
      if (!amount || arrayItem[option.x.property] > amount) amount = arrayItem[option.x.property]
    }

    response.current[generatedQueryFormatSection.property] = [amount]
    response.original[generatedQueryFormatSection.property] = [amount]
  }


  /** @param { td.QueryCountAsProperty } option */
  function doCountAsProperty (option) {
    const count = response.original[generatedQueryFormatSection.property].length

    for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
      if (!option.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][option.x.newProperty] = count
      response.original[generatedQueryFormatSection.property][i][option.x.newProperty] = count
    }
  }


  function doCountAsResponse () {
    if (response.original[generatedQueryFormatSection.property].length) {
      response.current[generatedQueryFormatSection.property] = [response.original[generatedQueryFormatSection.property].length]
      response.original[generatedQueryFormatSection.property] = [response.original[generatedQueryFormatSection.property].length]
    }
  }


  /** @param { td.QueryPropertyAsResponse } option */
  function doPropertyAsResponse (option) {
    let value

    let original = response.original[generatedQueryFormatSection.property]

    if (!option.x.relationships?.length) value = original?.[0]?.[option.x.property]
    else {
      const rRelationshipNode = getRelationshipNode(generatedQueryFormatSection, original[0], passport, option.x.relationships)
      value = rRelationshipNode?.node?.[option.x.property]
    }

    if (typeof value !== 'undefined') {
      response.current[generatedQueryFormatSection.property] = [ value ]
      original = [ value ]
    }
  }


  /** @param { td.QueryPropertyAdjacentToResponse } option */
  function doPropertyAdjacentToResponse (option) {
    let value

    let original = response.original[generatedQueryFormatSection.property]

    if (!option.x.relationships?.length) value = original?.[0]?.[option.x.sourceProperty]
    else {
      const rRelationshipNode = getRelationshipNode(generatedQueryFormatSection, original[0], passport, option.x.relationships)
      value = rRelationshipNode?.node?.[option.x.sourceProperty]
    }

    if (typeof value !== 'undefined') {
      response.current[option.x.adjacentProperty] = value
      response.original[option.x.adjacentProperty] = value
    }
  }
}
