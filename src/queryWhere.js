import { getRelationshipNode } from './getRelationshipNode.js'
import { td, enums, Schema, QueryWhere, QueryWhereDefined, QueryWhereUndefined, QueryWhereGroup, QueryProperty, QueryValue } from '#manifest'


/**
 * @param { Schema } schema 
 * @param { td.QueryRequestFormat } queryFormatSection
 * @param { any[] } array 
 * @param { string } nodeName
 * @param { QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup } $where 
 */
export function queryWhere (schema, queryFormatSection, array, nodeName, $where) {
  for (let iArray = array.length - 1; iArray >= 0; iArray--) {
    if ($where.info.name === enums.classInfoNames.QueryWhere) splice(/** @type { QueryWhere } */($where), iArray, array[iArray], true)
    else if ($where.info.name === enums.classInfoNames.QueryWhereDefined) splice(/** @type { QueryWhereDefined } */($where), iArray, array[iArray], true)
    else if ($where.info.name === enums.classInfoNames.QueryWhereUndefined) splice(/** @type { QueryWhereUndefined } */($where), iArray, array[iArray], true)
    else if ($where.info.name === enums.classInfoNames.QueryWhereGroup) loopGroupQueries(/** @type { QueryWhereGroup } */($where), iArray, true)
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

        for (const query of queryWhereGroup.items) {
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

        for (const query of queryWhereGroup.items) {
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
     * @param { QueryWhereGroup | QueryWhere | QueryWhereDefined | QueryWhereUndefined } query 
     * @returns { boolean | undefined }
     */
    function innerLoopGroupQueries (query) {
      let r

      switch (query.info.name) {
        case enums.classInfoNames.QueryWhere:
        case enums.classInfoNames.QueryWhereDefined:
        case enums.classInfoNames.QueryWhereUndefined:
          r = splice(/** @type { QueryWhere | QueryWhereDefined | QueryWhereUndefined } */(query), iArray, array[iArray], false)
          break
        case enums.classInfoNames.QueryWhereGroup:
          r = loopGroupQueries(/** @type { QueryWhereGroup } */(query), iArray, false)
          break
      }

      return r
    }

    return spliced
  }


  /**
   * @param { QueryWhere | QueryWhereDefined | QueryWhereUndefined } $where 
   * @param { number } arrayIndex 
   * @param { any } graphNode 
   * @param { boolean } doSplice 
   * @returns { boolean }
   */
  function splice ($where, arrayIndex, graphNode, doSplice) {
    let spliced = false

    const bye = () => {
      if (doSplice) array.splice(arrayIndex, 1)
      spliced = true
    }

    if ($where.info.name === enums.classInfoNames.QueryWhereDefined) {
      if (typeof getValue(/** @type { QueryWhereDefined } */($where).property, graphNode) === 'undefined') bye()
    } else if ($where.info.name === enums.classInfoNames.QueryWhereUndefined) {
      if (typeof getValue(/** @type { QueryWhereDefined } */($where).property, graphNode) !== 'undefined') bye()
    } else {
      const queryWhere = /** @type { QueryWhere } */ ($where)
      const leftValue = getValue(queryWhere.items[0], graphNode)
      const rightValue = getValue(queryWhere.items[1], graphNode)
      const isUndefined = typeof leftValue === 'undefined' || typeof rightValue === 'undefined'

      switch (queryWhere.symbol) {
        case enums.queryWhereSymbol.equals:
          if (isUndefined || leftValue !== rightValue) bye()
          break
        case enums.queryWhereSymbol.doesNotEqual:
          if (isUndefined || leftValue === rightValue) bye()
          break
        case enums.queryWhereSymbol.greaterThan:
          if (isUndefined || leftValue <= Number(rightValue)) bye()
          break
        case enums.queryWhereSymbol.lessThan:
          if (isUndefined || leftValue >= Number(rightValue)) bye()
          break
        case enums.queryWhereSymbol.greaterThanOrEqualTo:
          if (isUndefined || leftValue < Number(rightValue)) bye()
          break
        case enums.queryWhereSymbol.lessThanOrEqualTo:
          if (isUndefined || leftValue > Number(rightValue)) bye()
          break
        case enums.queryWhereSymbol.startsWith:
          if (isUndefined || typeof leftValue !== 'string' || !leftValue.startsWith(String(rightValue))) bye()
          break
        case enums.queryWhereSymbol.endsWith:
          if (isUndefined || typeof leftValue !== 'string' || !leftValue.endsWith(String(rightValue))) bye()
          break
      }
    }

    return spliced
  }


  /**
   * @param { QueryProperty | QueryValue } propertyOrValue 
   * @param { any } graphNode
   * @returns { any }
   */
  function getValue (propertyOrValue, graphNode) {
    let value

    switch (propertyOrValue.info.name) {
      case enums.classInfoNames.QueryValue:
        const queryValue = /** @type { QueryValue } */ (propertyOrValue)
        value = queryValue.value
        break
      case enums.classInfoNames.QueryProperty:
        const queryProperty = /** @type { QueryProperty } */ (propertyOrValue)

        if (!queryProperty.relationships?.length) value = graphNode[queryProperty.property]
        else {
          const relationshipNode = getRelationshipNode(schema, queryProperty.relationships, queryFormatSection, graphNode)
          if (relationshipNode?.[queryProperty.property]) value = relationshipNode[queryProperty.property]
        }
        break
    }

    return value
  }
}
