import { td, enums } from '#ace'
import { verify } from '../../security/hash.js'
import { AceError } from '../../objects/AceError.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { td.AceQueryFindGroup | td.AceQueryFilterGroup | td.AceQueryFind | td.AceQueryFilter | td.AceQueryFindDefined | td.AceQueryFindUndefined | td.AceQueryFilterDefined | td.AceQueryFilterUndefined } $where 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 */
export async function queryWhere (xGenerated, response, $where, publicJWKs, passport) {
  if (Array.isArray(response.original[xGenerated.propName])) {
    let iOrignal = 0
    const clone = [ ...(response.original[xGenerated.propName]) ]

    for (let iClone = 0; iClone < clone.length; iClone++) {
      let spliced = false

      if ($where.id === enums.idsQueryOptions.FindGroup || $where.id === enums.idsQueryOptions.FilterGroup) spliced = await loopGroupQueries(($where), iOrignal, true)
      else spliced = await verifySplice($where, iOrignal, clone[iClone], true)

      if (!spliced && ($where.id === enums.idsQueryOptions.Find || $where.id === enums.idsQueryOptions.FindDefined || $where.id === enums.idsQueryOptions.FindUndefined)) {
        response.now[xGenerated.propName] = [response.now[xGenerated.propName][iOrignal] ]
        response.original[xGenerated.propName] = [ response.original[xGenerated.propName][iOrignal] ]
        break
      }

      if (!spliced) iOrignal++
    }

    if (Array.isArray(response.original[xGenerated.propName]) && !response.original[xGenerated.propName].length) {
      response.now[xGenerated.propName] = null
      response.original[xGenerated.propName] = null
    }
  }


  /**
   * @typedef { object } GetValueResponse
   * @property { null | 'Value' | 'Property' } id
   * @property { any } value
   * @property { null | td.AceQueryRequestItemGeneratedXSection } xGenerated
   */


  /**
   * @param { td.AceQueryFindGroup | td.AceQueryFilterGroup } group 
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
     * @param { td.AceQueryFindGroup | td.AceQueryFilterGroup | td.AceQueryFind | td.AceQueryFilter | td.AceQueryFindDefined | td.AceQueryFindUndefined | td.AceQueryFilterDefined | td.AceQueryFilterUndefined } query 
     * @returns { Promise<boolean | undefined> }
     */
    async function innerLoopGroupQueries (query) {
      let r

      switch (query.id) {
        case enums.idsQueryOptions.Find:
        case enums.idsQueryOptions.Filter:
        case enums.idsQueryOptions.FindDefined:
        case enums.idsQueryOptions.FindUndefined:
        case enums.idsQueryOptions.FilterDefined:
        case enums.idsQueryOptions.FilterUndefined:
          r = await verifySplice(query, i, response.original[xGenerated.propName][i], false)
          break
        case enums.idsQueryOptions.FindGroup:
        case enums.idsQueryOptions.FilterGroup:
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
    response.now[xGenerated.propName].splice(i, 1)
    response.original[xGenerated.propName].splice(i, 1)
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

    if ($where.id === enums.idsQueryOptions.FilterDefined || $where.id === enums.idsQueryOptions.FindDefined) {
      if (typeof getValue($where.x.property, graphNode).value === 'undefined') bye()
    } else if ($where.id === enums.idsQueryOptions.FilterUndefined || $where.id === enums.idsQueryOptions.FindUndefined) {
      if (typeof getValue($where.x.property, graphNode).value !== 'undefined') bye()
    } else {
      const qw = /** @type { td.AceQueryFilter | td.AceQueryFind } */ ($where)

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
   * @param { td.AceQueryProperty | td.AceQueryValue } propertyOrValue 
   * @param { any } graphNode
   * @returns { GetValueResponse }
   */
  function getValue (propertyOrValue, graphNode) {
    let response = /** @type { GetValueResponse } */ ({
      id: null,
      value: null,
      xGenerated: null
    })

    switch (propertyOrValue.id) {
      case enums.idsQueryOptions.Value:
        const queryValue = /** @type { td.AceQueryValue } */ (propertyOrValue)

        response.value = queryValue.x.value
        response.id = propertyOrValue.id
        response.xGenerated = xGenerated
        break
      case enums.idsQueryOptions.Property:
        const queryProperty = /** @type { td.AceQueryProperty } */ (propertyOrValue)

        if (!queryProperty.x.relationships?.length) {
          response.value = graphNode[queryProperty.x.property]
          response.xGenerated = xGenerated
        } else {
          const rRelationshipNode = getRelationshipNode(xGenerated, graphNode, passport, queryProperty.x.relationships)

          if (rRelationshipNode?.node?.[queryProperty.x.property]) {
            response.xGenerated = rRelationshipNode.xGenerated
            response.value = rRelationshipNode.node[queryProperty.x.property]
          }
        }

        response.id = propertyOrValue.id
        break
    }

    return response
  }


  /**
   * @param { td.AceQueryFind | td.AceQueryFilter } qw 
   * @param { GetValueResponse } left
   * @param { GetValueResponse } right
   * @param { number } sideIndex 
   * @returns { boolean }
   */
  function isLeftOrRightHash (qw, left, right, sideIndex) {
    const side = sideIndex === 0 ? left : right
    return Boolean(side.id === 'Property' && side.xGenerated && /** @type { td.AceSchemaProp } */ (passport.schema?.nodes?.[side.xGenerated.nodeName || '']?.[/** @type { td.AceQueryProperty } */(qw.x.items[sideIndex]).x.property])?.x?.dataType === enums.dataTypes.hash)
  }


  /**
   * @param { td.AceQueryFind | td.AceQueryFilter } qw 
   * @param { GetValueResponse } left
   * @param { GetValueResponse } right
   * @param { number } base64Index
   * @returns { Promise<boolean> }
   */
  async function isHashValid (qw, left, right, base64Index) {
    if (!qw.x.publicJWK) throw AceError('query__falsy-hash-public-key', 'The request is invalid because qw.x.hashPublicKey is falsy', { qw })
    if (!publicJWKs?.[qw.x.publicJWK]) throw AceError('query__invalid-hash-public-key', 'The request is invalid because qw.x.hashPublicKey does not match request.publicJWKs', { qw })

    return base64Index ?
      await verify(publicJWKs[qw.x.publicJWK], left.value, right.value) :
      await verify(publicJWKs[qw.x.publicJWK], right.value, left.value)
  }
}
