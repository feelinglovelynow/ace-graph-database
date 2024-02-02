import { getRelationshipNode } from './getRelationshipNode.js'
import { td, enums, Schema, QueryWhere, QueryWhereGroup } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { any } queryFormatSection
 * @param { any[] } array 
 * @param { td.QueryWhere } $where 
 * @param { string } nodeName
 */
export function queryWhere (schema, queryFormatSection, array, $where, nodeName) {
  for (let iArray = array.length - 1; iArray >= 0; iArray--) {
    if ($where.is.str === 'QueryWhere') preSplice(/** @type { QueryWhere } */($where), iArray, true)
    else if ($where.is.str === 'QueryWhereGroup') loopGroupQueries(/** @type { QueryWhereGroup } */($where), iArray, true)
  }

    
  /**
   * @param { QueryWhereGroup } queryWhereGroup 
   * @param { number } iArray 
   * @param { boolean } doSplice 
   */
  function loopGroupQueries (queryWhereGroup, iArray, doSplice) {
    let spliced = false

    switch (queryWhereGroup.symbol) {
      case enums.queryWhereGroupSymbol.or:
        let keepArrayItem = false

        for (const query of queryWhereGroup.queries) {
          if (innerLoopGroupQueries(query) === false) { // on first splice false => keepArrayItem <- true
            keepArrayItem = true
            break
          }
        }

        if (!keepArrayItem) {
          spliced = true
          if (doSplice) array.splice(iArray, 1)			
        }
        break
      case enums.queryWhereGroupSymbol.and:
        let removeArrayItem = false

        for (const query of queryWhereGroup.queries) {
          if (innerLoopGroupQueries(query) === true) { // on first splice true => removeArrayItem <- true
            removeArrayItem = true
            break
          }
        }

        if (removeArrayItem) {
          spliced = true
          if (doSplice) array.splice(iArray, 1)
        }
        break
    }


    /**
     * @param { QueryWhereGroup | QueryWhere } query 
     * @returns { boolean | undefined }
     */
    function innerLoopGroupQueries (query) {
      let r

      if (query.is.str === 'QueryWhere') {
        const queryWhere = /** @type { QueryWhere } */ (query)
        r = preSplice(queryWhere, iArray, false)
      } else if (query.is.str === 'QueryWhereGroup') {
        const qwg = /** @type { QueryWhereGroup } */ (query)
        r = loopGroupQueries(qwg, iArray, false)
      }

      return r
    }

    return spliced
  }


  /**
   * @param { QueryWhere } queryWhere 
   * @param { number } iArray 
   * @param { boolean } doSplice 
   */
  function preSplice (queryWhere, iArray, doSplice) {
    if (!queryWhere.relationships?.length) return splice(queryWhere, iArray, array[iArray], doSplice)
    else {
      const relationshipNode = getRelationshipNode(schema, queryWhere.relationships, nodeName, queryFormatSection, array[iArray])
      return splice(queryWhere, iArray, relationshipNode, doSplice)
    }
  }


  /**
   * @param { QueryWhere } queryWhere 
   * @param { number } arrayIndex 
   * @param { any } obj 
   * @param { boolean } doSplice 
   * @returns { boolean }
   */
  function splice (queryWhere, arrayIndex, obj, doSplice) {
    let spliced = false
    const isUndefined = typeof obj?.[queryWhere.property] === 'undefined'

    const bye = () => {
      if (doSplice) array.splice(arrayIndex, 1)
      spliced = true
    }

    switch (queryWhere.symbol) {
      case enums.queryWhereSymbol.equals:
        if (isUndefined || obj?.[queryWhere.property] !== queryWhere.value) bye()
        break
      case enums.queryWhereSymbol.doesNotEqual:
        if (isUndefined || obj?.[queryWhere.property] === queryWhere.value) bye()
        break
      case enums.queryWhereSymbol.greaterThan:
        if (isUndefined || obj?.[queryWhere.property] <= Number(queryWhere.value)) bye()
        break
      case enums.queryWhereSymbol.lessThan:
        if (isUndefined || obj?.[queryWhere.property] >= Number(queryWhere.value)) bye()
        break
      case enums.queryWhereSymbol.greaterThanOrEqualTo:
        if (isUndefined || obj?.[queryWhere.property] < Number(queryWhere.value)) bye()
        break
      case enums.queryWhereSymbol.lessThanOrEqualTo:
        if (isUndefined || obj?.[queryWhere.property] > Number(queryWhere.value)) bye()
        break
      case enums.queryWhereSymbol.startsWith:
        if (isUndefined || typeof obj?.[queryWhere.property] !== 'string' || !obj[queryWhere.property].startsWith(String(queryWhere.value))) bye()
        break
      case enums.queryWhereSymbol.endsWith:
        if (isUndefined || typeof obj?.[queryWhere.property] !== 'string' || !obj[queryWhere.property].endsWith(String(queryWhere.value))) bye()
        break
      case enums.queryWhereSymbol.isDefined:
        if (isUndefined) bye()
        break
      case enums.queryWhereSymbol.isUndefined:
        if (typeof obj?.[queryWhere.property] !== 'undefined') bye()
        break
    }

    return spliced
  }
}
