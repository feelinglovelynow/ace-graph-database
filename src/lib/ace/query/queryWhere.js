import { td, enums } from '#ace'
import { verify } from '../../security/hash.js'
import { AceError } from '../../objects/AceError.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { enums.queryOptions} option 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 */
export async function queryWhere (xGenerated, response, option, publicJWKs, passport) {
  if (Array.isArray(response.original[xGenerated.propName])) {
    let iOrignal = 0
    const clone = [ ...(response.original[xGenerated.propName]) ]
    const $where = xGenerated.x.$o?.[option]

    /** @type { Set<string> } If we did not splice that means we found a match. If we found a match for any findOptions we can break the loop */
    const findOptions = new Set([
      enums.queryOptions.findByOr,
      enums.queryOptions.findByAnd,
      enums.queryOptions.findByDefined,
      enums.queryOptions.findByUndefined,
      enums.queryOptions.findByPropValue,
      enums.queryOptions.findByPropProp,
    ])

    for (let iClone = 0; iClone < clone.length; iClone++) {
      let spliced = false

      if (option === enums.queryOptions.findByOr || option === enums.queryOptions.findByAnd || option === enums.queryOptions.filterByOr || option === enums.queryOptions.filterByAnd) spliced = await loopGroupQueries(/** @type { td.AceQueryFindGroup | td.AceQueryFilterGroup } */($where), option, iOrignal, true)
      else spliced = await verifySplice($where, option, iOrignal, clone[iClone], true)

      if (!spliced && findOptions.has(option)) { // If we did not splice that means we found a match. If we found a match for any findOptions we can break the loop
        response.now[xGenerated.propName] = [ response.now[xGenerated.propName][iOrignal] ]
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
   * @property { any } value
   * @property { 'value' | 'prop' } is
   * @property { null | td.AceQueryRequestItemGeneratedXSection } xGenerated
   */


  /**
   * @param { td.AceQueryFindGroup | td.AceQueryFilterGroup } group 
   * @param { enums.queryOptions} option 
   * @param { number } i 
   * @param { boolean } doSplice 
   * @returns { Promise<boolean> }
   */
  async function loopGroupQueries (group, option, i, doSplice) {
    let spliced = false

    switch (option) {
      case enums.queryOptions.findByOr:
      case enums.queryOptions.filterByOr:
        let keepArrayItem = false

        for (const groupItem of group) {
          if ((await innerLoopGroupQueries(/** @type { td.AceQueryWherePropValue | td.AceQueryWherePropProp | td.AceQueryWhereDefined | td.AceQueryWhereUndefined | td.AceQueryFindGroup | td.AceQueryFilterGroup } */(groupItem), option)) === false) { // on first splice false => keepArrayItem <- true
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
      case enums.queryOptions.findByAnd:
      case enums.queryOptions.filterByAnd:
        let removeArrayItem = false

        for (const groupItem of group) {
          if ((await innerLoopGroupQueries(/** @type { td.AceQueryWherePropValue | td.AceQueryWherePropProp | td.AceQueryWhereDefined | td.AceQueryWhereUndefined | td.AceQueryFindGroup | td.AceQueryFilterGroup } */(groupItem), option)) === true) { // on first splice true => removeArrayItem <- true
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
     * @param { td.AceQueryWherePropValue | td.AceQueryWherePropProp | td.AceQueryWhereDefined | td.AceQueryWhereUndefined | td.AceQueryFindGroup | td.AceQueryFilterGroup } groupItem
     * @param { enums.queryOptions} option 
     * @returns { Promise<boolean | undefined> }
     */
    async function innerLoopGroupQueries(groupItem, option) {
      let r

      switch (option) {
        case enums.queryOptions.findByDefined:
        case enums.queryOptions.findByUndefined:
        case enums.queryOptions.findByPropValue:
        case enums.queryOptions.findByPropProp:
        case enums.queryOptions.filterByDefined:
        case enums.queryOptions.filterByUndefined:
        case enums.queryOptions.filterByPropValue:
        case enums.queryOptions.filterByPropProp:
          r = await verifySplice(groupItem, option, i, response.original[xGenerated.propName][i], false)
          break
        case enums.queryOptions.findByOr:
        case enums.queryOptions.findByAnd:
        case enums.queryOptions.filterByOr:
        case enums.queryOptions.filterByAnd:
          let innerOption
          const startsWith = option.startsWith('find') ? 'find' : 'filter'

          if (/** @type {*} */(groupItem).or) innerOption = startsWith + 'ByOr'
          else if (/** @type {*} */(groupItem).and) innerOption = startsWith + 'ByAnd'
          else if (/** @type { td.AceQueryWherePropProp } */(groupItem)?.length === 3 && /** @type { td.AceQueryWherePropProp } */(groupItem)?.[0]?.prop) innerOption = (/** @type { td.AceQueryWherePropProp } */(groupItem)[2].prop) ? (startsWith + 'PropProp') : (startsWith + 'PropValue')
          else if (/** @type { td.AceQueryWhereDefined } */(groupItem)?.isPropDefined) innerOption = startsWith + 'ByDefined'
          else if (/** @type { td.AceQueryWhereUndefined } */(groupItem)?.isPropUndefined) innerOption = startsWith + 'ByUndefined'

          r = loopGroupQueries(/** @type { td.AceQueryFindGroup | td.AceQueryFilterGroup } */(groupItem), /** @type { enums.queryOptions } */ (innerOption), i, false)
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
   * @param { enums.queryOptions} option 
   * @param { number } arrayIndex 
   * @param { any } graphNode 
   * @param { boolean } doSplice 
   * @returns { Promise<boolean> }
   */
  async function verifySplice ($where, option, arrayIndex, graphNode, doSplice) {
    let spliced = false

    const bye = () => {
      if (doSplice) splice(arrayIndex)
      spliced = true
    }

    if (option === enums.queryOptions.findByDefined || option === enums.queryOptions.filterByDefined) {
      if (typeof getValue($where.x.property, 'prop', graphNode).value === 'undefined') bye()
    } else if (option === enums.queryOptions.findByUndefined || option === enums.queryOptions.filterByUndefined) {
      if (typeof getValue($where.x.property, 'prop', graphNode).value !== 'undefined') bye()
    } else {
      const qw = /** @type { td.AceQueryWherePropProp | td.AceQueryWherePropValue } */ ($where)
      const left = getValue(qw[0], 'prop', graphNode)
      const right = getValue(qw[2], option === 'findByPropProp' ? 'prop' : 'value', graphNode)
      const isUndefined = typeof left.value === 'undefined' || typeof right.value === 'undefined'

      switch (qw[1]) {
        case enums.queryWhereSymbol.equals:
          if (isUndefined) bye()
          // else if (isLeftOrRightHash(qw, left, right, 0)) { if (!(await isHashValid(qw, left, right, 0))) bye() }
          // else if (isLeftOrRightHash(qw, left, right, 1)) { if (!(await isHashValid(qw, left, right, 1))) bye() }
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
   * @param { td.AceQueryWhereItemProp | td.AceQueryWhereItemValue } propertyOrValue 
   * @param { 'prop' | 'value' } is
   * @param { any } graphNode
   * @returns { GetValueResponse }
   */
  function getValue (propertyOrValue, is, graphNode) {
    let response = /** @type { GetValueResponse } */ ({ is, value: null, xGenerated: null })

    switch (is) {
      case 'value':
        const queryValue = /** @type { td.AceQueryWhereItemValue } */ (propertyOrValue)

        response.value = queryValue.value
        response.xGenerated = xGenerated
        break
      case 'prop':
        const queryProp = /** @type { td.AceQueryWhereItemProp } */ (propertyOrValue)

        if (!queryProp.relationships?.length) {
          response.value = graphNode[queryProp.prop]
          response.xGenerated = xGenerated
        } else {
          const rRelationshipNode = getRelationshipNode(xGenerated, graphNode, passport, queryProp.relationships)

          if (rRelationshipNode?.node?.[queryProp.prop]) {
            response.xGenerated = rRelationshipNode.xGenerated
            response.value = rRelationshipNode.node[queryProp.prop]
          }
        }
        break
    }

    return response
  }


  // /**
  //  * @param { td.AceQueryFind | td.AceQueryFilter } qw 
  //  * @param { GetValueResponse } left
  //  * @param { GetValueResponse } right
  //  * @param { number } sideIndex 
  //  * @returns { boolean }
  //  */
  // function isLeftOrRightHash (qw, left, right, sideIndex) {
  //   const side = sideIndex === 0 ? left : right
  //   return Boolean(side.id === 'Property' && side.xGenerated && /** @type { td.AceSchemaProp } */ (passport.schema?.nodes?.[side.xGenerated.nodeName || '']?.[/** @type { td.AceQueryProperty } */(qw.x.items[sideIndex]).x.property])?.x?.dataType === enums.dataTypes.hash)
  // }


  // /**
  //  * @param { td.AceQueryFind | td.AceQueryFilter } qw 
  //  * @param { GetValueResponse } left
  //  * @param { GetValueResponse } right
  //  * @param { number } base64Index
  //  * @returns { Promise<boolean> }
  //  */
//   async function isHashValid (qw, left, right, base64Index) {
//     if (!qw.x.publicJWK) throw AceError('query__falsy-hash-public-key', 'The request is invalid because qw.x.hashPublicKey is falsy', { qw })
//     if (!publicJWKs?.[qw.x.publicJWK]) throw AceError('query__invalid-hash-public-key', 'The request is invalid because qw.x.hashPublicKey does not match request.publicJWKs', { qw })

//     return base64Index ?
//       await verify(publicJWKs[qw.x.publicJWK], left.value, right.value) :
//       await verify(publicJWKs[qw.x.publicJWK], right.value, left.value)
//   }
}
