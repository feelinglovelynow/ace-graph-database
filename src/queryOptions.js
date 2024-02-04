import { getAlias } from './getAlias.js'
import { queryWhere } from './queryWhere.js'
import { getDerivedValue } from './getDerivedValue.js'
import { td, enums, Schema, QueryWhere, QueryWhereGroup, QueryLimit, QuerySort, QueryDerivedProperty, QueryWhereDefined, QueryWhereUndefined, QueryAliasProperty, QuerySumAsProperty, QueryAverageAsProperty } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { any[] } array 
 * @param { boolean } isUsingSortIndexNodes 
 * @returns { any[] }
 */
export function queryOptionsArray (schema, queryFormatSection, array, isUsingSortIndexNodes) {
  if (queryFormatSection.$options) {
    for (let option of queryFormatSection.$options) {
      let sum = 0

      switch (option.info.name) {
        case enums.classInfoNames.QueryWhere:
        case enums.classInfoNames.QueryWhereDefined:
        case enums.classInfoNames.QueryWhereUndefined:
        case enums.classInfoNames.QueryWhereGroup:
          queryWhere(schema, queryFormatSection, array, queryFormatSection.$info.nodeName, /** @type { QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup } */(option))
          break


        case enums.classInfoNames.QueryLimit:
          const queryLimit = /** @type { QueryLimit } */ (option)

          if (queryLimit.skip && queryLimit.count) array = array.slice(queryLimit.skip, queryLimit.skip + queryLimit.count)
          else if (queryLimit.skip) array = array.slice(queryLimit.skip)
          else if (queryLimit.count) array = array.slice(0, queryLimit.count)
          break


        case enums.classInfoNames.QuerySort:
          const querySort = /** @type { QuerySort } */ (option)

          if (!isUsingSortIndexNodes) { // IF not using a sorted index array => sort items
            const property = querySort.property
            array = array.sort((a, b) => Number(a[property] > b[property]) - Number(a[property] < b[property])) // order ascending
          }

          if (querySort.direction === enums.sortOptions.dsc) array.reverse() // order descending
          break


        case enums.classInfoNames.QueryDerivedProperty:
          const queryDerivedProperty = /** @type { QueryDerivedProperty } */ (option)

          for (let arrayItem of array) {
            arrayItem[queryDerivedProperty.property] = getDerivedValue(schema, queryDerivedProperty.items, queryDerivedProperty.symbol, queryFormatSection, queryFormatSection.$info.nodeName, arrayItem)
          }

          break


        case enums.classInfoNames.QuerySumAsProperty:
          const querySumAsProperty = /** @type { QuerySumAsProperty } */ (option)

          for (let arrayItem of array) {
            sum += arrayItem[querySumAsProperty.sumProperty]
          }

          for (let arrayItem of array) {
            arrayItem[querySumAsProperty.newProperty] = sum
          }

          break


        case enums.classInfoNames.QueryAverageAsProperty:
          const queryAverageAsProperty = /** @type { QueryAverageAsProperty } */ (option)

          for (let arrayItem of array) {
            sum += arrayItem[queryAverageAsProperty.averageProperty]
          }

          const average = array.length ? sum / array.length : 0

          for (let arrayItem of array) {
            arrayItem[queryAverageAsProperty.newProperty] = average
          }

          break
      }
    }
  }

  applyOptionsToRelationships(schema, queryFormatSection, { array })
  return array
}


/**
 * @param { Schema } schema 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { any } graphNode 
 */
export function queryOptionsObject (schema, queryFormatSection, graphNode) {
  if (queryFormatSection.$options) {
    for (let option of queryFormatSection.$options) {
      switch (option.info.name) {
        case enums.classInfoNames.QueryDerivedProperty:
          const queryDerivedProperty = /** @type { QueryDerivedProperty } */ (option)
          graphNode[queryDerivedProperty.property] = getDerivedValue(schema, queryDerivedProperty.items, queryDerivedProperty.symbol, queryFormatSection, queryFormatSection.$info.nodeName, graphNode)
          break
      }
    }
  }

  applyOptionsToRelationships(schema, queryFormatSection, { graphNode })
}


/**
 * @param { Schema } schema 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { { array?: any[], graphNode?: any } } request
 */
function applyOptionsToRelationships (schema, queryFormatSection, request) {
  const map = /** @type { Map<string, { classInfoName: enums.classInfoNames, qfs: td.QueryRequestFormat }> } */ (new Map())

  for (const property in queryFormatSection) {
    const qfs = queryFormatSection[property]
    const classInfoName = qfs?.$info?.name 

    if (classInfoName === enums.classInfoNames.One || classInfoName === enums.classInfoNames.Many) {
      const optionsCount = Object.keys(qfs?.$options || {}).length
      if (optionsCount) map.set(property, { classInfoName, qfs: queryFormatSection[property] })
    }
  }

  if (map.size) {
    if (request.graphNode) apply(request.graphNode)
    else if (request.array) {
      for (const arrayItem of request.array) {
        apply(arrayItem)
      }
    }
  }


  /**
   * @param { any } graphNode 
   */
  function apply (graphNode) {
    map.forEach((value, property) => {
      const key = getAlias(value.qfs) || property

      if (graphNode[key]) {
        if (value.classInfoName === enums.classInfoNames.One) queryOptionsObject(schema, value.qfs, graphNode[key])
        else queryOptionsArray(schema, value.qfs, graphNode[key], false)
      }
    })
  }
}
