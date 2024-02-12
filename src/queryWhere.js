import { verify } from './hash.js'
import { error } from './throw.js'
import { getRelationshipNode } from './getRelationshipNode.js'
import { td, enums, Schema, QueryWhere, QueryWhereDefined, QueryWhereUndefined, QueryWhereGroup, QueryProperty, QueryValue, SchemaProp } from '#manifest'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'


/**
 * @param { Schema } schema 
 * @param { td.QueryRequestFormat } queryFormatSection
 * @param { any[] } array 
 * @param { td.HashPublicKeys | null } hashPublicKeys 
 * @param { QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup } $where 
 */
export async function queryWhere (schema, queryFormatSection, array, hashPublicKeys, $where) {
  for (let iArray = array.length - 1; iArray >= 0; iArray--) {
    if ($where.info.name === enums.classInfoNames.QueryWhere) await splice(/** @type { QueryWhere } */($where), iArray, array[iArray], true)
    else if ($where.info.name === enums.classInfoNames.QueryWhereDefined) await splice(/** @type { QueryWhereDefined } */($where), iArray, array[iArray], true)
    else if ($where.info.name === enums.classInfoNames.QueryWhereUndefined) await splice(/** @type { QueryWhereUndefined } */($where), iArray, array[iArray], true)
    else if ($where.info.name === enums.classInfoNames.QueryWhereGroup) await loopGroupQueries(/** @type { QueryWhereGroup } */($where), iArray, true)
  }
    
  /**
   * @param { QueryWhereGroup } queryWhereGroup 
   * @param { number } iArray 
   * @param { boolean } doSplice 
   */
  async function loopGroupQueries (queryWhereGroup, iArray, doSplice) {
    let spliced = false

    switch (queryWhereGroup.symbol) {
      case enums.queryWhereGroupSymbol.or:
        let keepArrayItem = false

        for (const query of queryWhereGroup.items) {
          if ((await innerLoopGroupQueries(query)) === false) { // on first splice false => keepArrayItem <- true
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
          if ((await innerLoopGroupQueries(query)) === true) { // on first splice true => removeArrayItem <- true
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
     * @returns { Promise<boolean | undefined> }
     */
    async function innerLoopGroupQueries (query) {
      let r

      switch (query.info.name) {
        case enums.classInfoNames.QueryWhere:
        case enums.classInfoNames.QueryWhereDefined:
        case enums.classInfoNames.QueryWhereUndefined:
          r = await splice(/** @type { QueryWhere | QueryWhereDefined | QueryWhereUndefined } */(query), iArray, array[iArray], false)
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
   * @returns { Promise<boolean> }
   */
  async function splice ($where, arrayIndex, graphNode, doSplice) {
    let spliced = false

    const bye = () => {
      if (doSplice) array.splice(arrayIndex, 1)
      spliced = true
    }

    if ($where.info.name === enums.classInfoNames.QueryWhereDefined) {
      if (typeof getValue(/** @type { QueryWhereDefined } */($where).property, graphNode).value === 'undefined') bye()
    } else if ($where.info.name === enums.classInfoNames.QueryWhereUndefined) {
      if (typeof getValue(/** @type { QueryWhereDefined } */($where).property, graphNode).value !== 'undefined') bye()
    } else {
      const qw = /** @type { QueryWhere } */ ($where)
      const left = getValue(qw.items[0], graphNode)
      const right = getValue(qw.items[1], graphNode)
      const isUndefined = typeof left.value === 'undefined' || typeof right.value === 'undefined'

      switch (qw.symbol) {
        case enums.queryWhereSymbol.equals:
          if (isUndefined) bye()
          else if (isLeftOrRightHash(qw, left, right, 0)) { if (!(await isHashValid(qw, left, right, 0))) bye() }
          else if (isLeftOrRightHash(qw, left, right, 1)) { if (!(await isHashValid(qw, left, right, 1))) bye() }
          else if (left.value !== right.value) bye()
          break
        case enums.queryWhereSymbol.doesNotEqual:
          if (isUndefined || left.value === right.value) bye()
          break
        case enums.queryWhereSymbol.greaterThan:
          if (isUndefined || left.value <= Number(right.value)) bye()
          break
        case enums.queryWhereSymbol.lessThan:
          if (isUndefined || left.value >= Number(right.value)) bye()
          break
        case enums.queryWhereSymbol.greaterThanOrEqualTo:
          if (isUndefined || left.value < Number(right.value)) bye()
          break
        case enums.queryWhereSymbol.lessThanOrEqualTo:
          if (isUndefined || left.value > Number(right.value)) bye()
          break
        case enums.queryWhereSymbol.startsWith:
          if (isUndefined || typeof left.value !== 'string' || !left.value.startsWith(String(right.value))) bye()
          break
        case enums.queryWhereSymbol.endsWith:
          if (isUndefined || typeof left.value !== 'string' || !left.value.endsWith(String(right.value))) bye()
          break
        case enums.queryWhereSymbol.contains:
          if (isUndefined || typeof left.value !== 'string' || !left.value.includes(String(right.value))) bye()
          break
        case enums.queryWhereSymbol.doesNotContain:
          if (isUndefined || typeof left.value !== 'string' || left.value.includes(String(right.value.value))) bye()
          break
      }
    }

    return spliced
  }


  /**
   * @typedef { { type: null | 'QueryValue' | 'QueryProperty', value: any, qfs: null | td.QueryRequestFormat } } GetValueResponse
   * 
   * @param { QueryProperty | QueryValue } propertyOrValue 
   * @param { any } graphNode
   * @returns { GetValueResponse }
   */
  function getValue (propertyOrValue, graphNode) {
    let response = /** @type { GetValueResponse } */ ({
      type: null,
      value: null,
      qfs: null
    })

    switch (propertyOrValue.info.name) {
      case enums.classInfoNames.QueryValue:
        const queryValue = /** @type { QueryValue } */ (propertyOrValue)

        response.value = queryValue.value
        response.type = 'QueryValue'
        response.qfs = queryFormatSection
        break
      case enums.classInfoNames.QueryProperty:
        const queryProperty = /** @type { QueryProperty } */ (propertyOrValue)

        if (!queryProperty.relationships?.length) {
          response.value = graphNode[queryProperty.property]
          response.qfs = queryFormatSection
        } else {
          const rRelationshipNode = getRelationshipNode(schema, queryProperty.relationships, queryFormatSection, graphNode)

          if (rRelationshipNode?.node?.[queryProperty.property]) {
            response.qfs = rRelationshipNode.qfs
            response.value = rRelationshipNode.node[queryProperty.property]
          }
        }

        response.type = 'QueryProperty'
        break
    }

    return response
  }


  /**
   * @param { QueryWhere } qw 
   * @param { GetValueResponse } left
   * @param { GetValueResponse } right
   * @param { number } sideIndex 
   * @returns { boolean }
   */
  function isLeftOrRightHash (qw, left, right, sideIndex) {
    const side = sideIndex === 0 ? left : right
    return Boolean(side.type === 'QueryProperty' && side.qfs && /** @type { SchemaProp } */ (schema.nodes?.[side.qfs.$info.nodeName]?.[/** @type { QueryProperty } */(qw.items[sideIndex]).property])?.dataType === enums.dataTypes.hash)
  }

  /**
   * @param { QueryWhere } qw 
   * @param { GetValueResponse } left
   * @param { GetValueResponse } right
   * @param { number } base64Index
   * @returns { Promise<boolean> }
   */
  async function isHashValid (qw, left, right, base64Index) {
    if (!qw.hashPublicKey) throw error('query__falsy-hash-public-key', 'The request is invalid because qw.hashPublicKey is falsy', { qw })
    if (!hashPublicKeys?.[qw.hashPublicKey]) throw error('query__invalid-hash-public-key', 'The request is invalid because qw.hashPublicKey does not match request.hashPublicKeys', { qw })

    return base64Index ?
      await verify(hashPublicKeys[qw.hashPublicKey], left.value, right.value) :
      await verify(hashPublicKeys[qw.hashPublicKey], right.value, left.value)
  }
}
