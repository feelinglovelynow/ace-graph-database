import { td, enums } from '#ace'
import { verify } from '../../security/hash.js'
import { AceError } from '../../objects/AceError.js'
import { getRelationshipNode } from './getRelationshipNode.js'


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { enums.queryOptions } option 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @param { td.AcePassport } passport 
 */
export async function queryWhere (xGenerated, res, option, publicJWKs, passport) {
  if (Array.isArray(res.original[xGenerated.propName])) {
    /** @type { any[] } To avoid splicing the orignal till we have validated what we have done, copy original */
    const ogCopy = JSON.parse(JSON.stringify(res.original[xGenerated.propName]))

    /** Because we can splice the ogCopy array but we are looping forwards iCopy is not the index we want to use when wanting to know at what index of original are we at now. We loop forwards so that we can find the first occurence of something from the beginning.  */
    let iOriginal = 0

    /** The current where (find/filter) we are applying */
    const $where = xGenerated.x?.$o?.[option]

    /** @type { Set<string> } If we did not splice that means we found a match. If we found a match for any findOptions we can break the loop */
    const findOptions = new Set([
      enums.queryOptions.findByOr,
      enums.queryOptions.findByAnd,
      enums.queryOptions.findByDefined,
      enums.queryOptions.findByUndefined,
      enums.queryOptions.findByPropValue,
      enums.queryOptions.findByPropProp,
      enums.queryOptions.findByPropRes,
    ])

    /** @type { Set<string> } If the option is a group option => loopGroupQueries() */
    const groupOptions = new Set([
      enums.queryOptions.findByOr,
      enums.queryOptions.findByAnd,
      enums.queryOptions.filterByOr,
      enums.queryOptions.filterByAnd,
    ])

    for (let iCopy = 0; iCopy < ogCopy.length; iCopy++) {
      let spliced = false

      if (groupOptions.has(/** @type {*} */ (option))) spliced = await loopGroupQueries(/** @type { td.AceQueryFindGroup | td.AceQueryFilterGroup } */($where), option, iOriginal, true, xGenerated, res, passport, publicJWKs)
      else spliced = await verifySplice($where, option, iOriginal, ogCopy[iCopy], true, xGenerated, res, passport, publicJWKs)

      if (!spliced && findOptions.has(option)) { // If we did not splice that means we found a match. If we found a match for any findOptions we can break the loop
        res.now[xGenerated.propName] = [ res.now[xGenerated.propName][iOriginal] ]
        res.original[xGenerated.propName] = [ res.original[xGenerated.propName][iOriginal] ]
        break
      }

      if (!spliced) iOriginal++
    }

    if (Array.isArray(res.original[xGenerated.propName]) && !res.original[xGenerated.propName].length) {
      res.now[xGenerated.propName] = null
      res.original[xGenerated.propName] = null
    }
  }
}


/**
 * @param { td.AceQueryFindGroup | td.AceQueryFilterGroup } $where 
 * @param { enums.queryOptions} option 
 * @param { number } iOriginal 
 * @param { boolean } doSplice 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @returns { Promise<boolean> }
 */
async function loopGroupQueries ($where, option, iOriginal, doSplice, xGenerated, res, passport, publicJWKs) {
  let spliced = false

  switch (option) {
    case enums.queryOptions.findByOr:
    case enums.queryOptions.filterByOr:
      let keepArrayItem = false

      for (const $whereItem of $where) {
        if ((await innerLoopGroupQueries(/** @type { td.AceQueryWherePropValue | td.AceQueryWherePropProp | td.AceQueryWherePropRes | td.AceQueryWhereDefined | td.AceQueryWhereUndefined | td.AceQueryFindGroup | td.AceQueryFilterGroup } */($whereItem), getGroupItemOption(option, $where, $whereItem), iOriginal, xGenerated, res, passport, publicJWKs)) === false) { // on first splice false => keepArrayItem <- true
          keepArrayItem = true
          break
        }
      }

      if (!keepArrayItem) {
        spliced = true
        if (doSplice) {
          splice(xGenerated, res, iOriginal)		
        }
      }
      break
    case enums.queryOptions.findByAnd:
    case enums.queryOptions.filterByAnd:
      let removeArrayItem = false

      for (const $whereItem of $where) {
        if ((await innerLoopGroupQueries(/** @type { td.AceQueryWherePropValue | td.AceQueryWherePropProp | td.AceQueryWherePropRes | td.AceQueryWhereDefined | td.AceQueryWhereUndefined | td.AceQueryFindGroup | td.AceQueryFilterGroup } */($whereItem), getGroupItemOption(option, $where, $whereItem), iOriginal, xGenerated, res, passport, publicJWKs)) === true) { // on first splice true => removeArrayItem <- true
          removeArrayItem = true
          break
        }
      }

      if (removeArrayItem) {
        spliced = true
        if (doSplice) splice(xGenerated, res, iOriginal)
      }
      break
  }

  return spliced
}


/**
 * @param { td.AceQueryWherePropValue | td.AceQueryWherePropProp | td.AceQueryWherePropRes | td.AceQueryWhereDefined | td.AceQueryWhereUndefined | td.AceQueryFindGroup | td.AceQueryFilterGroup } $where
 * @param { enums.queryOptions } option 
 * @param { number } iOriginal 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @returns { Promise<boolean | undefined> }
 */
async function innerLoopGroupQueries ($where, option, iOriginal, xGenerated, res, passport, publicJWKs) {
  let r

  switch (option) {
    case enums.queryOptions.findByDefined:
    case enums.queryOptions.findByUndefined:
    case enums.queryOptions.findByPropValue:
    case enums.queryOptions.findByPropProp:
    case enums.queryOptions.findByPropRes:
    case enums.queryOptions.filterByDefined:
    case enums.queryOptions.filterByUndefined:
    case enums.queryOptions.filterByPropValue:
    case enums.queryOptions.filterByPropProp:
    case enums.queryOptions.filterByPropRes:
      r = await verifySplice($where, option, iOriginal, res.original[xGenerated.propName][iOriginal], false, xGenerated, res, passport, publicJWKs)
      break
    case enums.queryOptions.findByOr:
    case enums.queryOptions.findByAnd:
    case enums.queryOptions.filterByOr:
    case enums.queryOptions.filterByAnd:
      r = loopGroupQueries(/** @type { td.AceQueryFindGroup | td.AceQueryFilterGroup } */($where), /** @type { enums.queryOptions } */(option), iOriginal, false, xGenerated, res, passport, publicJWKs)
      break
  }

  return r
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { number } iOriginal 
 */
function splice (xGenerated, res, iOriginal) {
  res.now[xGenerated.propName].splice(iOriginal, 1)
  res.original[xGenerated.propName].splice(iOriginal, 1)
}


/**
 * @param { any } $where 
 * @param { enums.queryOptions} option 
 * @param { number } iOriginal 
 * @param { any } graphNode 
 * @param { boolean } doSplice 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @returns { Promise<boolean> }
 */
async function verifySplice ($where, option, iOriginal, graphNode, doSplice, xGenerated, res, passport, publicJWKs) {
  let spliced = false

  const bye = () => {
    if (doSplice) splice(xGenerated, res, iOriginal)
    spliced = true
  }

  if (option === enums.queryOptions.findByDefined || option === enums.queryOptions.filterByDefined) {
    if (typeof getValue($where?.isPropDefined ? { prop: $where.isPropDefined } : { prop: $where }, 'prop', graphNode, xGenerated, res, passport).value === 'undefined') bye()
  } else if (option === enums.queryOptions.findByUndefined || option === enums.queryOptions.filterByUndefined) {
    if (typeof getValue($where?.isPropUndefined ? { prop: $where.isPropUndefined } : { prop: $where }, 'prop', graphNode, xGenerated, res, passport).value !== 'undefined') bye()
  } else {
    const qw = /** @type { td.AceQueryWherePropProp | td.AceQueryWherePropRes | td.AceQueryWherePropValue } */ ($where)
    const left = getValue(qw[0], 'prop', graphNode, xGenerated, res, passport)

    /** @type { 'prop' | 'res' | 'value' } */
    let rightIs

    if (option === 'findByPropProp' || option === 'filterByPropProp') rightIs = 'prop'
    else if (option === 'findByPropRes' || option === 'filterByPropRes') rightIs = 'res'
    else rightIs = 'value'

    const right = getValue(qw[2], rightIs, graphNode, xGenerated, res, passport)
    const isUndefined = typeof left.value === 'undefined' || typeof right.value === 'undefined'

    switch (qw[1]) {
      case enums.queryWhereSymbol.equals:
        if (isUndefined) bye()
        else if (isLeftOrRightHash(qw, left, right, 0, passport)) { if (!(await isHashValid(qw, left, right, 0, xGenerated, option, publicJWKs))) bye() }
        else if (isLeftOrRightHash(qw, left, right, 1, passport)) { if (!(await isHashValid(qw, left, right, 1, xGenerated, option, publicJWKs))) bye() }
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
 * @param { td.AceQueryWhereItemProp | td.AceQueryWhereItemValue } item 
 * @param { 'prop' | 'value' | 'res' } is
 * @param { any } graphNode
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @returns { td.AceQueyWhereGetValueResponse }
 */
function getValue (item, is, graphNode, xGenerated, res, passport) {
  let getValueResponse = /** @type { td.AceQueyWhereGetValueResponse } */ ({ is, value: null, xGenerated: null })

  switch (is) {
    case 'value':
      getValueResponse.value = item
      getValueResponse.xGenerated = xGenerated
      break
    case 'res':
      let resValue
      const itemRes = /** @type { td.AceQueryWhereItemRes } */ (item)

      for (let i = 0; i < itemRes.res.length; i++) {
        if (i === 0 && res.now[itemRes.res[i]]) resValue = res.now[itemRes.res[i]]
        else if (i > 0 && resValue[itemRes.res[i]]) resValue = resValue?.[itemRes.res[i]]
      }

      getValueResponse.value = resValue
      getValueResponse.xGenerated = xGenerated
      break
    case 'prop':
      const itemProp = /** @type { td.AceQueryWhereItemProp } */ (item)

      if (!itemProp.relationships?.length) {
        getValueResponse.value = graphNode[itemProp.prop]
        getValueResponse.xGenerated = xGenerated
      } else {
        const rRelationshipNode = getRelationshipNode(xGenerated, graphNode, passport, itemProp.relationships)

        if (rRelationshipNode?.node?.[itemProp.prop]) {
          getValueResponse.xGenerated = rRelationshipNode.xGenerated
          getValueResponse.value = rRelationshipNode.node[itemProp.prop]
        }
      }
      break
  }

  return getValueResponse
}


/**
 * @param { td.AceQueryWherePropProp | td.AceQueryWherePropRes | td.AceQueryWherePropValue } qw 
 * @param { td.AceQueyWhereGetValueResponse } left
 * @param { td.AceQueyWhereGetValueResponse } right
 * @param { number } sideIndex 
 * @param { td.AcePassport } passport 
 * @returns { boolean }
 */
function isLeftOrRightHash (qw, left, right, sideIndex, passport) {
  const side = sideIndex === 0 ? left : right
  return Boolean(side.is === 'prop' && side.xGenerated && /** @type { td.AceSchemaProp } */ (passport.schema?.nodes?.[side.xGenerated.nodeName || '']?.[/** @type { td.AceQueryProp } */(qw[sideIndex]).prop])?.x?.dataType === enums.dataTypes.hash)
}


/**
 * @param { td.AceQueryWherePropProp | td.AceQueryWherePropRes | td.AceQueryWherePropValue } qw 
 * @param { td.AceQueyWhereGetValueResponse } left
 * @param { td.AceQueyWhereGetValueResponse } right
 * @param { number } sideIndex
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { enums.queryOptions } option 
 * @param { td.AceQueryPublicJWKs | null } publicJWKs 
 * @returns { Promise<boolean> }
 */
async function isHashValid (qw, left, right, sideIndex, xGenerated, option, publicJWKs) {
  const jwkProp = xGenerated.x?.$o?.publicJWKs?.[/** @type {'findByOr'} */ (option)]
  const publicJWK = jwkProp ? publicJWKs?.[jwkProp] : null

  if (!jwkProp) throw AceError('aceFn__falsyHashPublicKey', `The request is invalid because $o.publicJWKs.${ option } is falsy`, { $o: xGenerated.x?.$o })
  if (!publicJWK) throw AceError('aceFn__invalidHashPublicKey', `The request is invalid because $o.publicJWKs.${ option } does not match request.publicJWKs`, { qw })

  return sideIndex ?
    await verify(left.value, right.value, publicJWK) :
    await verify(right.value, left.value, publicJWK)
}


/**
 * @param { string } option 
 * @param { td.AceQueryFindGroup | td.AceQueryFilterGroup } group 
 * @param { * } groupItem 
 * @returns { enums.queryOptions }
 */
function getGroupItemOption (option, group, groupItem) {
  let groupItemOption
  const type = option.startsWith('find') ? 'find' : 'filter'
  const startsWith = type + 'By'

  if (/** @type { td.AceQueryWhereOr } */(groupItem).or) groupItemOption = startsWith + 'Or'
  else if (/** @type { td.AceQueryWhereAnd } */(groupItem).and) groupItemOption = startsWith + 'And'
  else if (/** @type { * } */(groupItem)?.length === 3 && /** @type { * } */(groupItem)?.[0]?.prop) {
    if (/** @type { td.AceQueryWherePropProp } */(groupItem)[2]?.prop) groupItemOption = startsWith + 'PropProp'
    else if (/** @type { td.AceQueryWherePropRes } */(groupItem)[2]?.res) groupItemOption = startsWith + 'PropRes'
    else groupItemOption = startsWith + 'PropValue'
  } else if (/** @type { td.AceQueryWhereDefined } */(groupItem)?.isPropDefined) groupItemOption = startsWith + 'Defined'
  else if (/** @type { td.AceQueryWhereUndefined } */(groupItem)?.isPropUndefined) groupItemOption = startsWith + 'Undefined'
  else throw AceError('aceFn__invalidQuerySearch', `This ${ type } is invalid b/c it is not fomatted correctly`, { [type]: group })
  
  return /** @type { enums.queryOptions } */ (groupItemOption)
}
