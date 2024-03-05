import { verify } from './hash.js'
import { error } from './throw.js'
import { td, enums } from '#manifest'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
 * @param { td.QueryResponse } response 
 * @param { td.QueryFindGroup | td.QueryFilterGroup | td.QueryFind | td.QueryFilter | td.QueryFindDefined | td.QueryFindUndefined | td.QueryFilterDefined | td.QueryFilterUndefined } $where 
 * @param { td.QueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 */
export async function queryWhere (generatedQueryFormatSection, response, $where, publicJWKs, passport) {
  if (Array.isArray(response.original[generatedQueryFormatSection.property])) {
    let iOrignal = 0
    const clone = [ ...(response.original[generatedQueryFormatSection.property]) ]

    for (let iClone = 0; iClone < clone.length; iClone++) {
      let spliced = false

      if ($where.id === enums.idsQuery.FindGroup || $where.id === enums.idsQuery.FilterGroup) spliced = await loopGroupQueries(($where), iOrignal, true)
      else spliced = await verifySplice($where, iOrignal, clone[iClone], true)

      if (!spliced && ($where.id === enums.idsQuery.Find || $where.id === enums.idsQuery.FindDefined || $where.id === enums.idsQuery.FindUndefined)) {
        response.current[generatedQueryFormatSection.property] = [ response.current[generatedQueryFormatSection.property][iOrignal] ]
        response.original[generatedQueryFormatSection.property] = [ response.original[generatedQueryFormatSection.property][iOrignal] ]
        break
      }

      if (!spliced) iOrignal++
    }

    if (Array.isArray(response.original[generatedQueryFormatSection.property]) && !response.original[generatedQueryFormatSection.property].length) {
      response.current[generatedQueryFormatSection.property] = null
      response.original[generatedQueryFormatSection.property] = null
    }
  }


  /**
   * @typedef { object } GetValueResponse
   * @property { null | 'QueryValue' | 'QueryProperty' } type
   * @property { any } value
   * @property { null | td.QueryRequestFormatGenerated } generatedQueryFormatSection
   */


  /**
   * @param { td.QueryFindGroup | td.QueryFilterGroup } group 
   * @param { number } i 
   * @param { boolean } doSplice 
   */
  async function loopGroupQueries (group, i, doSplice) {
    let spliced = false

    switch (group.x.symbol) {
      case enums.queryWhereGroupSymbol.or:
        let keepArrayItem = false

        for (const query of group.x.items) {
          if ((await innerLoopGroupQueries(query)) === false) { // on first splice false => keepArrayItem <- true
            keepArrayItem = true
            break
          }
        }

        if (!keepArrayItem) {
          spliced = true
          if (doSplice) {
            splice(i)		
          }	
        }
        break
      case enums.queryWhereGroupSymbol.and:
        let removeArrayItem = false

        for (const query of group.x.items) {
          if ((await innerLoopGroupQueries(query)) === true) { // on first splice true => removeArrayItem <- true
            removeArrayItem = true
            break
          }
        }

        if (removeArrayItem) {
          spliced = true
          if (doSplice) splice(i)
        }
        break
    }


    /**
     * @param { td.QueryFindGroup | td.QueryFilterGroup | td.QueryFind | td.QueryFilter | td.QueryFindDefined | td.QueryFindUndefined | td.QueryFilterDefined | td.QueryFilterUndefined } query 
     * @returns { Promise<boolean | undefined> }
     */
    async function innerLoopGroupQueries (query) {
      let r

      switch (query.id) {
        case enums.idsQuery.Find:
        case enums.idsQuery.Filter:
        case enums.idsQuery.FindDefined:
        case enums.idsQuery.FindUndefined:
        case enums.idsQuery.FilterDefined:
        case enums.idsQuery.FilterUndefined:
          r = await verifySplice(query, i, response.original[generatedQueryFormatSection.property][i], false)
          break
        case enums.idsQuery.FindGroup:
        case enums.idsQuery.FilterGroup:
          r = loopGroupQueries(query, i, false)
          break
      }

      return r
    }

    return spliced
  }


  /**
   * @param { number } i 
   */
  function splice (i) {
    response.current[generatedQueryFormatSection.property].splice(i, 1)
    response.original[generatedQueryFormatSection.property].splice(i, 1)
  }


  /**
   * @param { any } $where 
   * @param { number } arrayIndex 
   * @param { any } graphNode 
   * @param { boolean } doSplice 
   * @returns { Promise<boolean> }
   */
  async function verifySplice ($where, arrayIndex, graphNode, doSplice) {
    let spliced = false

    const bye = () => {
      if (doSplice) splice(arrayIndex)
      spliced = true
    }

    if ($where.id === enums.idsQuery.FilterDefined || $where.id === enums.idsQuery.FindDefined) {
      if (typeof getValue($where.x.property, graphNode).value === 'undefined') bye()
    } else if ($where.id === enums.idsQuery.FilterUndefined || $where.id === enums.idsQuery.FindUndefined) {
      if (typeof getValue($where.x.property, graphNode).value !== 'undefined') bye()
    } else {
      const qw = /** @type { td.QueryFilter | td.QueryFind } */ ($where)

      const left = getValue(qw.x.items[0], graphNode)
      const right = getValue(qw.x. items[1], graphNode)
      const isUndefined = typeof left.value === 'undefined' || typeof right.value === 'undefined'

      switch (qw.x.symbol) {
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
        case enums.queryWhereSymbol.isoIsBefore:
          if (isUndefined || new Date(left.value) >= new Date(right.value)) bye()
          break
        case enums.queryWhereSymbol.isoIsAfter:
          if (isUndefined || new Date(left.value) <= new Date(right.value)) bye()
          break
      }
    }

    return spliced
  }


  /**
   * @param { td.QueryProperty | td.QueryValue } propertyOrValue 
   * @param { any } graphNode
   * @returns { GetValueResponse }
   */
  function getValue (propertyOrValue, graphNode) {
    let response = /** @type { GetValueResponse } */ ({
      type: null,
      value: null,
      generatedQueryFormatSection: null
    })

    switch (propertyOrValue.id) {
      case enums.idsQuery.Value:
        const queryValue = /** @type { td.QueryValue } */ (propertyOrValue)

        response.value = queryValue.x.value
        response.type = 'QueryValue'
        response.generatedQueryFormatSection = generatedQueryFormatSection
        break
      case enums.idsQuery.Property:
        const queryProperty = /** @type { td.QueryProperty } */ (propertyOrValue)

        if (!queryProperty.x.relationships?.length) {
          response.value = graphNode[queryProperty.x.property]
          response.generatedQueryFormatSection = generatedQueryFormatSection
        } else {
          const rRelationshipNode = getRelationshipNode(generatedQueryFormatSection, graphNode, null, passport, queryProperty.x.relationships)

          if (rRelationshipNode?.node?.[queryProperty.x.property]) {
            response.generatedQueryFormatSection = rRelationshipNode.generatedQueryFormatSection
            response.value = rRelationshipNode.node[queryProperty.x.property]
          }
        }

        response.type = 'QueryProperty'
        break
    }

    return response
  }


  /**
   * @param { td.QueryFind | td.QueryFilter } qw 
   * @param { GetValueResponse } left
   * @param { GetValueResponse } right
   * @param { number } sideIndex 
   * @returns { boolean }
   */
  function isLeftOrRightHash (qw, left, right, sideIndex) {
    const side = sideIndex === 0 ? left : right
    return Boolean(side.type === 'QueryProperty' && side.generatedQueryFormatSection && /** @type { td.SchemaProp } */ (passport.schema?.nodes?.[side.generatedQueryFormatSection.nodeName]?.[/** @type { td.QueryProperty } */(qw.x.items[sideIndex]).x.property])?.x?.dataType === enums.dataTypes.hash)
  }


  /**
   * @param { td.QueryFind | td.QueryFilter } qw 
   * @param { GetValueResponse } left
   * @param { GetValueResponse } right
   * @param { number } base64Index
   * @returns { Promise<boolean> }
   */
  async function isHashValid (qw, left, right, base64Index) {
    if (!qw.x.publicJWK) throw error('query__falsy-hash-public-key', 'The request is invalid because qw.x.hashPublicKey is falsy', { qw })
    if (!publicJWKs?.[qw.x.publicJWK]) throw error('query__invalid-hash-public-key', 'The request is invalid because qw.x.hashPublicKey does not match request.publicJWKs', { qw })

    return base64Index ?
      await verify(publicJWKs[qw.x.publicJWK], left.value, right.value) :
      await verify(publicJWKs[qw.x.publicJWK], right.value, left.value)
  }
}
