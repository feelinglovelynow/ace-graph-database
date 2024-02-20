import { td, enums } from '#manifest'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
 * @param { td.QueryResponse } response 
 * @param { boolean } isUsingSortIndexNodes 
 * @param { td.PublicJWKs | null } publicJWKs 
 * @param { td.Schema } schema 
 * @returns { Promise<void> }
 */
export async function implementQueryOptions (generatedQueryFormatSection, response, isUsingSortIndexNodes, publicJWKs, schema) {
  if (generatedQueryFormatSection.x.$options) {
    for (let option of generatedQueryFormatSection.x.$options) {
      let sum = 0
      let amount = 0

      switch (option.id) {
        case enums.idsQuery.Find:
        case enums.idsQuery.Filter:
        case enums.idsQuery.WhereDefined:
        case enums.idsQuery.WhereUndefined:
        case enums.idsQuery.WhereGroup:
          await queryWhere(generatedQueryFormatSection, response, /** @type { td.QueryFilter | td.QueryWhereDefined | td.QueryWhereUndefined | td.QueryWhereGroup } */(option), publicJWKs, schema)
          break


        case enums.idsQuery.Limit:
          const queryLimit = /** @type { td.QueryLimit } */ (option)

          if (queryLimit.x.skip && queryLimit.x.count) {
            response.current[generatedQueryFormatSection.property] = response.current[generatedQueryFormatSection.property].slice(queryLimit.x.skip, queryLimit.x.skip + queryLimit.x.count)
            response.original[generatedQueryFormatSection.property] = response.original[generatedQueryFormatSection.property].slice(queryLimit.x.skip, queryLimit.x.skip + queryLimit.x.count)
          } else if (queryLimit.x.skip) {
            response.current[generatedQueryFormatSection.property] = response.current[generatedQueryFormatSection.property].slice(queryLimit.x.skip)
            response.original[generatedQueryFormatSection.property] = response.original[generatedQueryFormatSection.property].slice(queryLimit.x.skip)
          } else if (queryLimit.x.count) {
            response.current[generatedQueryFormatSection.property] = response.current[generatedQueryFormatSection.property].slice(0, queryLimit.x.count)
            response.original[generatedQueryFormatSection.property] = response.original[generatedQueryFormatSection.property].slice(0, queryLimit.x.count)
          }
          break


        case enums.idsQuery.Sort:
          const querySort = /** @type { td.QuerySort } */ (option)

          if (!isUsingSortIndexNodes) { // IF not using a sorted index array => sort items
            const property = querySort.x.property

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

              if (x < y) rSort = (querySort.x.direction === enums.sortOptions.dsc) ? 1 : -1
              if (x > y) rSort = (querySort.x.direction === enums.sortOptions.dsc) ? -1 : 1

              return rSort
            })

            response.current = combined.map((value) => value.current)
            response.original = combined.map((value) => value.original)
          }
          break


        case enums.idsQuery.DerivedProperty:
          const queryDerivedProperty = /** @type { td.QueryDerivedProperty } */ (option)

          for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
            const derivedValue = getDerivedValue(generatedQueryFormatSection, response.original[generatedQueryFormatSection.property][i], queryDerivedProperty.x.symbol, queryDerivedProperty.x.items, schema)

            response.original[generatedQueryFormatSection.property][i][queryDerivedProperty.x.newProperty] = derivedValue
            if (!queryDerivedProperty.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][queryDerivedProperty.x.newProperty] = derivedValue
          }

          break


        case enums.idsQuery.SumAsProperty:
          const querySumAsProperty = /** @type { td.QuerySumAsProperty } */ (option)

          for (let arrayItem of response.original[generatedQueryFormatSection.property]) {
            sum += arrayItem[querySumAsProperty.x.computeProperty]
          }

          for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
            response.original[generatedQueryFormatSection.property][i][querySumAsProperty.x.newProperty] = sum
            if (!querySumAsProperty.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][querySumAsProperty.x.newProperty] = sum
          }

          break


        case enums.idsQuery.AverageAsProperty:
          const originalAvg = response.original[generatedQueryFormatSection.property]
          const queryAverageAsProperty = /** @type { td.QueryAverageAsProperty } */ (option)

          for (let arrayItem of originalAvg) {
            sum += arrayItem[queryAverageAsProperty.x.computeProperty]
          }

          const average = originalAvg.length ? sum / originalAvg.length : 0

          for (let i = 0; i < originalAvg.length; i++) {
            originalAvg[i][queryAverageAsProperty.x.newProperty] = average
            if (!queryAverageAsProperty.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][queryAverageAsProperty.x.newProperty] = average
          }
          break


        case enums.idsQuery.MinAmountAsProperty:
          const originalMin = response.original[generatedQueryFormatSection.property]
          const queryMinAmountAsProperty = /** @type { td.QueryMinAmountAsProperty } */ (option)

          for (let arrayItem of originalMin) {
            if (!amount || arrayItem[queryMinAmountAsProperty.x.computeProperty] < amount) amount = arrayItem[queryMinAmountAsProperty.x.computeProperty]
          }

          for (let i = 0; i < originalMin.length; i++) {
            originalMin[i][queryMinAmountAsProperty.x.newProperty] = amount
            if (!queryMinAmountAsProperty.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][queryMinAmountAsProperty.x.newProperty] = amount
          }
          break


        case enums.idsQuery.MaxAmountAsProperty:
          const originalMax = response.original[generatedQueryFormatSection.property]
          const queryMaxAmountAsProperty = /** @type { td.QueryMaxAmountAsProperty } */ (option)

          for (let arrayItem of originalMax) {
            if (!amount || arrayItem[queryMaxAmountAsProperty.x.computeProperty] > amount) amount = arrayItem[queryMaxAmountAsProperty.x.computeProperty]
          }

          for (let i = 0; i < originalMax.length; i++) {
            originalMax[i][queryMaxAmountAsProperty.x.newProperty] = amount
            if (!queryMaxAmountAsProperty.x.isResponseHidden) response.current[generatedQueryFormatSection.property][i][queryMaxAmountAsProperty.x.newProperty] = amount
          }
          break


        case enums.idsQuery.CountAsProperty:
          const count = response.original[generatedQueryFormatSection.property].length
          const queryCountAsProperty = /** @type { td.QueryCountAsProperty } */ (option)

          for (let i = 0; i < response.original[generatedQueryFormatSection.property].length; i++) {
            response.current[generatedQueryFormatSection.property][i][queryCountAsProperty.x.newProperty] = count
            if (!queryCountAsProperty.x.isResponseHidden) response.original[generatedQueryFormatSection.property][i][queryCountAsProperty.x.newProperty] = count
          }
          break


        case enums.idsQuery.PropertyAsResponse:
          let value
          const propertyAsResponse = /** @type { td.QueryPropertyAsResponse } */ (option)

          if (!propertyAsResponse.x.relationships?.length) value = response.original[generatedQueryFormatSection.property][0][propertyAsResponse.x.property]
          else {
            const rRelationshipNode = getRelationshipNode(generatedQueryFormatSection, response.original[generatedQueryFormatSection.property][0], null, schema, propertyAsResponse.x.relationships)
            value = rRelationshipNode?.node?.[propertyAsResponse.x.property]
          }

          if (value) {
            response.current[generatedQueryFormatSection.property] = [value]
            response.original[generatedQueryFormatSection.property] = [value]
          }
          break        
      }
    }
  }

  if (generatedQueryFormatSection.has === enums.has.one || generatedQueryFormatSection.hasOptionsFind || generatedQueryFormatSection.hasPropAsResponse || generatedQueryFormatSection.hasCountOne) {
    response.current[generatedQueryFormatSection.property] = typeof response.current[generatedQueryFormatSection.property]?.[0] === 'undefined' ? null : response.current[generatedQueryFormatSection.property]?.[0]
    response.original[generatedQueryFormatSection.property] = typeof response.original[generatedQueryFormatSection.property]?.[0] === 'undefined' ? null : response.original[generatedQueryFormatSection.property]?.[0]
  }
}
