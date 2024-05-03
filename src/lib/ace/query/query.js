import { td, enums } from '#ace'
import { doQueryOptions } from './doQueryOptions.js'
import { isObjPopulated } from '../../isObjPopulated.js'
import { AceAuthError } from '../../objects/AceError.js'
import { getXGeneratedByParent, getXGeneratedById } from './getXGenerated.js'
import { getRelationshipProp, getSortIndexKey, getRevokesKey, getUniqueIndexKey, getNodeUidsKey, getRelationshipUidsKey } from '../../variables.js'


/**
 * @param { td.AcePassport } passport
 * @param { td.AceFnFullResponse } res
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iReq
 * @param { td.AceQueryRequestItemNode } reqItem 
 * @returns { Promise<void> }
 */
export async function queryNode (passport, res, publicJWKs, iReq, reqItem) {
  const { uids, xGenerated, isUsingSortIndex } = await getInitialUids(reqItem, passport)
  
  if (uids.length) await addNodesToResponse(xGenerated, res, uids, null, isUsingSortIndex, passport, publicJWKs, iReq)
  else {
    res.now[xGenerated.propName] = null
    res.original[xGenerated.propName] = null
  }
}


/**
 * @param { td.AcePassport } passport
 * @param { td.AceFnFullResponse } res
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iReq
 * @param { td.AceQueryRequestItemRelationship } reqItem 
 * @returns { Promise<void> }
 */
export async function queryRelationship (passport, res, publicJWKs, iReq, reqItem) {
  const { uids, xGenerated, isUsingSortIndex } = await getInitialUids(reqItem, passport)

  if (uids.length) await addRelationshipsToResponse(xGenerated, res, uids, isUsingSortIndex, passport, publicJWKs, iReq)
  else {
    res.now[xGenerated.propName] = null
    res.original[xGenerated.propName] = null
  }
}


/**
 * @param { td.AceQueryRequestItemNode | td.AceQueryRequestItemRelationship } reqItem
 * @param { td.AcePassport } passport
 * @returns { Promise<{ uids: any, isUsingSortIndex: any, xGenerated: td.AceQueryRequestItemGeneratedXSection }> }
 */
async function getInitialUids (reqItem, passport) {
  let uids

  const xGenerated = getXGeneratedById(reqItem, passport)

  if (xGenerated.x?.$o?.sort) {
    const indexKey = getSortIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', xGenerated.x?.$o?.sort.prop) // IF sorting by an property requested => see if property is a sort index
    if (indexKey) uids = await passport.storage.get(indexKey)
  }

  let isUsingSortIndex = false

  if (uids) isUsingSortIndex = true // IF property is a sort index => tip flag to true
  else {
    let isValid = true

    if (xGenerated.x?.$o?.findByUid) uids = [ xGenerated.x?.$o.findByUid ]
    else if (xGenerated.x?.$o?.filterByUids) {
      uids = xGenerated.x?.$o.filterByUids
      if (!uids.length) isValid = false
    } else if (xGenerated.x?.$o?.findByUnique) {
      const key = getUniqueIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', xGenerated.x?.$o.findByUnique.prop, xGenerated.x?.$o?.findByUnique.value)
      const uid = await passport.storage.get(key)
      uids = uid ? [ uid ] : []
      if (!uids.length) isValid = false
    } else if (xGenerated.x?.$o?.filterByUniques) {
      const keys = xGenerated.x?.$o.filterByUniques.uniques.map(unique => {
        return getUniqueIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', unique.prop, unique.value)
      })

      const map = await passport.storage.get(keys)
      uids = [...(map.values()) ]
      if (!uids.length) isValid = false
    }

    if (isValid && !uids?.length) {
      uids = reqItem.id === 'NodeQuery' ?
        !xGenerated.nodeName ? [] : await passport.storage.get(getNodeUidsKey(xGenerated.nodeName)) :
        !xGenerated.relationshipName ? [] : await passport.storage.get(getRelationshipUidsKey(xGenerated.relationshipName))

      if (!uids) uids = []
    }
  }

  return {
    uids,
    isUsingSortIndex,
    xGenerated
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { string[] } uids 
 * @param { any[] | null } graphRelationships
 * @param { boolean } isUsingSortIndex
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iReq
 * @returns { Promise<void> }
 */
async function addNodesToResponse (xGenerated, res, uids, graphRelationships, isUsingSortIndex, passport, publicJWKs, iReq) {
  const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', node: xGenerated.nodeName, prop: '*' }))

  if (permission && !permission.allowPropName) throw AceAuthError(enums.permissionActions.read, passport, { node: xGenerated.nodeName })

  const graphNodes = await passport.storage.get(uids)

  for (let i = 0; i < uids.length; i++) {
    const node = graphNodes.get(uids[i])
    if (isRevokesAllowing(node.x, { permission }, passport)) await addPropsToResponse(xGenerated, res, { node }, graphRelationships?.[i] || null, passport, publicJWKs, iReq) // call desired function on each node
  }

  await doQueryOptions(xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport)
  removeEmptyObjects(xGenerated, res)
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 */
function removeEmptyObjects (xGenerated, res) {
  if (Array.isArray(res.now[xGenerated.propName])) {
    for (let i = res.now[xGenerated.propName].length - 1; i >= 0; i--) {
      if (!isObjPopulated(res.now[xGenerated.propName][i])) res.now[xGenerated.propName].splice(i, 1)
    }

    if (!res.now[xGenerated.propName].length) res.now[xGenerated.propName] = null
  }
}



/**
 * @param { { [propName: string]: any; } } node
 * @param { { key?: string, permission?: any } } options
 * @param { td.AcePassport } passport
 * @returns { boolean }
 */
function isRevokesAllowing (node, options, passport) {
  let revokesValue
  let isAllowed = false

  if (options.key) revokesValue = passport.revokesAcePermissions?.get(options.key)
  if (options.permission) revokesValue = options.permission

  if (!revokesValue) isAllowed = true
  else if (passport?.user?.uid && node?.[revokesValue?.allowPropName] && passport.user.uid === node[revokesValue.allowPropName]) isAllowed = true

  return isAllowed
}


/**
 * @param { td.AceQueryAddPropsItem } item 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { string } prop 
 * @param { any } resOriginalItem 
 * @param { td.AcePassport } passport 
 * @returns 
 */
function validateAddProps (item, xGenerated, prop, resOriginalItem, passport) {
  const revokesOptions = item.relationship ?
    { key: getRevokesKey({ action: 'read', relationship: xGenerated.relationshipName, prop }) } :
    { key: getRevokesKey({ action: 'read', node: xGenerated.nodeName, prop }) }

  return isRevokesAllowing(resOriginalItem, revokesOptions, passport)
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AceQueryAddPropsItem } item 
 * @param { { key: string, value: any } | null } graphRelationship
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iReq
 * @returns { Promise<void> }
 */
async function addPropsToResponse (xGenerated, res, item, graphRelationship, passport, publicJWKs, iReq) {
  let graphItem, uid = ''

  if (item.node) {
    graphItem = item.node
    uid = item.node?.x?.uid
  } else if (item.relationship) {
    graphItem = item.relationship
  } else if (item.uid) {
    uid = item.uid
    graphItem = await passport.storage.get(uid)
  }

  if (!graphItem) {
    res.now[ xGenerated.propName ] = null
    res.original[ xGenerated.propName ] = null
  } else if (/** @type {*} */(xGenerated.x) !== false) {
    const resOriginalItem = graphItem.x
    const resNowItem = /** @type { { [propName: string]: any } } */ ({})

    if (graphRelationship?.value) {
      for (const prop in graphRelationship.value) {
        if (prop.startsWith('_')) resOriginalItem[prop] = graphRelationship.value[prop]
      }
    }

    /** @type { Map<string, { propNode: string, propValue: td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp }> | undefined } */
    const relationshipPropsMap = (item.relationship && passport.schemaDataStructures?.relationshipPropsMap) ? passport.schemaDataStructures.relationshipPropsMap.get(xGenerated.relationshipName || '') : undefined

    if (xGenerated.x?.$o?.all) { // show all not relationship props
      for (const prop in resOriginalItem) {
        if ((!item.relationship || (prop !== 'a' && prop !== 'b')) && validateAddProps(item, xGenerated, prop, resOriginalItem, passport)) { // on relationships, skip the a and b props AND ensure this user may query this data
          if (!xGenerated.resHide || !xGenerated.resHide?.has(prop)) resNowItem[xGenerated.x?.[prop]?.alias || prop] = resOriginalItem[prop]
        }
      }
    }

    for (const xKey in xGenerated.x) { // loop a section of query.x object
      if (validateAddProps(item, xGenerated, xKey, resOriginalItem, passport)) {
        const xValue = xGenerated.x[xKey]
        const isTruthy = xValue === true
        const alias = xValue?.alias

        /** @type { { schemaNodeProp?: td.AceSchemaProp | td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp, schemaRelationshipProp?: td.AceSchemaRelationshipProp } } - If graphItemType is node, add node info to this object  */
        const parentNodeOptions = {}

        if (!item.relationship) {
          parentNodeOptions.schemaNodeProp = passport.schema?.nodes[xGenerated.nodeName || '']?.[xKey]
          parentNodeOptions.schemaRelationshipProp = (xGenerated.relationshipName) ? passport.schema?.relationships?.[xGenerated.relationshipName]?.props?.[xKey] : undefined
        }

        if (!xGenerated.resHide || !xGenerated.resHide?.has(xKey)) {
          if (typeof resOriginalItem[xKey] !== 'undefined') {
            if (isTruthy) resNowItem[xKey] = resOriginalItem[xKey]
            else if (alias) resNowItem[alias] = resOriginalItem[xKey]
          } else if (parentNodeOptions.schemaRelationshipProp?.id === enums.idsSchema.RelationshipProp && typeof graphRelationship?.value[xKey] !== 'undefined') { // this prop is defined @ schema.relationships
            if (isTruthy) resNowItem[xKey] = graphRelationship.value[xKey]
            else if (alias) resNowItem[alias] = graphRelationship?.value[xKey]
          } else if (parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.ForwardRelationshipProp || parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.ReverseRelationshipProp || parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.BidirectionalRelationshipProp) { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
            const relationshipUids = graphItem[getRelationshipProp(parentNodeOptions.schemaNodeProp.x.relationship)]
            await addRelationshipPropsToResponse(uid, relationshipUids, parentNodeOptions.schemaNodeProp, xKey, xValue, xGenerated, resNowItem, resOriginalItem, passport, publicJWKs, iReq)
          } else if (item.relationship && xKey !== '$o' && relationshipPropsMap) {
            const r = relationshipPropsMap.get(xKey)
            const schemaNodeProp = r?.propValue
            const relationshipGeneratedQueryXSection = getXGeneratedByParent(xValue, xKey, passport, xGenerated)  

            if (schemaNodeProp?.id === 'BidirectionalRelationshipProp') {
              const uids = [ resOriginalItem.a, resOriginalItem.b ]
              const graphRelationship = { key: resOriginalItem._uid, value: resOriginalItem }
              const graphRelationships = [ graphRelationship, graphRelationship ]
              await addNodesToResponse(relationshipGeneratedQueryXSection, { now: resNowItem, original: resOriginalItem }, uids, graphRelationships, false, passport, publicJWKs, iReq)
            } else {
              let uid

              if (schemaNodeProp?.id === 'ForwardRelationshipProp') uid = resOriginalItem.b
              else if (schemaNodeProp?.id === 'ReverseRelationshipProp') uid = resOriginalItem.a

              if (uid) {
                await addPropsToResponse(relationshipGeneratedQueryXSection, { now: resNowItem, original: resOriginalItem }, { uid }, null, passport, publicJWKs, iReq)
                
                if (resNowItem[relationshipGeneratedQueryXSection.propName]?.length) resNowItem[relationshipGeneratedQueryXSection.propName] = resNowItem[relationshipGeneratedQueryXSection.propName][0]
                if (resOriginalItem[relationshipGeneratedQueryXSection.propName]?.length) resOriginalItem[relationshipGeneratedQueryXSection.propName] = resOriginalItem[relationshipGeneratedQueryXSection.propName][0]
              }
            }
          }
        }
      }
    }

    if (res.now[ xGenerated.propName ]?.length) {
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[ xGenerated.propName ].push(resNowItem)
      res.original[ xGenerated.propName ].push(resOriginalItem)
    } else {
      if (!xGenerated.resHide || !xGenerated.resHide.has(xGenerated.propName)) res.now[ xGenerated.propName ] = [ resNowItem ]
      res.original[ xGenerated.propName ] = [ resOriginalItem ]
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } res 
 * @param { string[] } uids 
 * @param { boolean } isUsingSortIndex
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iReq
 * @returns { Promise<void> }
 */
async function addRelationshipsToResponse (xGenerated, res, uids, isUsingSortIndex, passport, publicJWKs, iReq) {
  const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', relationship: xGenerated.relationshipName, prop: '*' }))

  if (permission && !permission.allowPropName) throw AceAuthError(enums.permissionActions.read, passport, { relationship: xGenerated.relationshipName })

  if (xGenerated.x?.$o?.findBy_Uid) {
    if (uids.includes(xGenerated.x?.$o.findBy_Uid)) uids = [ xGenerated.x?.$o.findBy_Uid ]
  } else {
    if (xGenerated.x?.$o?.filterBy_Uids?.length) {
      const set = new Set(xGenerated.x?.$o.filterBy_Uids)

      for (let i = uids.length - 1; i >= 0; i--) {
        if (!set.has(uids[i])) uids.splice(i, 1)
      }
    }
  }

  const rCache = await passport.storage.get(uids)

  for (let i = 0; i < uids.length; i++) {
    const relationship = rCache.get(uids[i])

    if (isRevokesAllowing(relationship.x, { permission }, passport)) await addPropsToResponse(xGenerated, res, { relationship }, null, passport, publicJWKs, iReq)
  }

  await doQueryOptions(xGenerated, res, isUsingSortIndex, uids, publicJWKs, passport)
  removeEmptyObjects(xGenerated, res)
}


 /**
 * @param { string } uid
 * @param { string[] } relationshipUids
 * @param { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp | td.AceSchemaProp } schemaNodeProp
 * @param { string } xKey 
 * @param { any } xValue 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { { [propName: string]: any } } resNowItem 
 * @param { any } resOriginalItem 
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iReq
 */
async function addRelationshipPropsToResponse (uid, relationshipUids, schemaNodeProp, xKey, xValue, xGenerated, resNowItem, resOriginalItem, passport, publicJWKs, iReq) {
  if (uid && schemaNodeProp && relationshipUids?.length) {
    let findByUidFound = false
    let findBy_UidFound = false
    let findByUniqueFound = false
    let nodeUids = /** @type { string[] } */ ([])
    const graphRelationships = /** @type { any[] } */ ([])
    const relationshipGeneratedQueryXSection = getXGeneratedByParent(xValue, xKey, passport, xGenerated)  

    const uniqueKeys = /** @type { string[] } */ ([])

    if (xGenerated.x?.$o?.findByUnique) uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.relationshipName || '', xGenerated.x?.$o.findByUnique.prop, xGenerated.x?.$o.findByUnique.value))
    else if (xGenerated.x?.$o?.filterByUniques) {
      for (const unique of xGenerated.x?.$o.filterByUniques.uniques) {
        uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.relationshipName || '', unique.prop, unique.value))
      }
    }

    const uniqueUids = /** @type { string[] } */ ([])

    if (uniqueKeys.length) {
      (await passport.storage.get(uniqueKeys)).forEach((/** @type {*} */ value) => {
        uniqueUids.push(value)
      })
    }

    const graphRelationshipsMap = /** @type { Map<string, td.AceGraphRelationship> } */ (await passport.storage.get(relationshipUids))

    switch (schemaNodeProp.id) {
      case enums.idsSchema.ForwardRelationshipProp:
        graphRelationshipsMap.forEach((graphRelationship, graphRelationshipKey) => {
          if (uid === graphRelationship?.x.a) {
            const rForward = validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.b, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
            if (rForward.findByUidFound) findByUidFound = true
            if (rForward.findByUniqueFound) findByUniqueFound = true
            if (rForward.findBy_UidFound) findBy_UidFound = true
          }
        })
        break
      case enums.idsSchema.ReverseRelationshipProp:
        graphRelationshipsMap.forEach((graphRelationship, graphRelationshipKey) => {
          if (uid === graphRelationship?.x.b) {
            const rReverse = validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
            if (rReverse.findByUidFound) findByUidFound = true
            if (rReverse.findByUniqueFound) findByUniqueFound = true
            if (rReverse.findBy_UidFound) findBy_UidFound = true
          }
        })
        break
      case enums.idsSchema.BidirectionalRelationshipProp:
        graphRelationshipsMap.forEach((graphRelationship, graphRelationshipKey) => {
          const rBi= validateAndPushUids(relationshipGeneratedQueryXSection, uid === graphRelationship?.x.a ? graphRelationship?.x.b : graphRelationship?.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
          if (rBi.findByUidFound) findByUidFound = true
          if (rBi.findByUniqueFound) findByUniqueFound = true
          if (rBi.findBy_UidFound) findBy_UidFound = true
        })
        break
    }

    let isValid = true

    if (relationshipGeneratedQueryXSection.x?.$o?.findByUid) {
      if (findByUidFound) nodeUids = [relationshipGeneratedQueryXSection.x?.$o.findByUid ]
      else isValid = false
    }

    if (relationshipGeneratedQueryXSection.x?.$o?.findByUnique) {
      if (findByUniqueFound) nodeUids = [ uniqueUids[0] ]
      else isValid = false
    }

    if (relationshipGeneratedQueryXSection.x?.$o?.findBy_Uid) {
      if (findBy_UidFound) nodeUids = [relationshipGeneratedQueryXSection.x?.$o.findBy_Uid ]
      else isValid = false
    }

    if (isValid) await addNodesToResponse(relationshipGeneratedQueryXSection, { now: resNowItem, original: resOriginalItem }, nodeUids, graphRelationships, false, passport, publicJWKs, iReq)
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } relationshipGeneratedQueryXSection 
 * @param { string } uid 
 * @param { any[] } graphRelationships 
 * @param { any } graphRelationship 
 * @param { string } graphRelationshipKey 
 * @param { string[] } nodeUids 
 * @param { string[] } uniqueUids 
 * @param { boolean } findByUidFound 
 * @param { boolean } findByUniqueFound 
 * @param { boolean } findBy_UidFound 
 * @returns { { findByUidFound: boolean, findByUniqueFound: boolean, findBy_UidFound: boolean } } 
 */
function validateAndPushUids (relationshipGeneratedQueryXSection, uid, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound) {
  const filterByUids = new Set(relationshipGeneratedQueryXSection.x.$o?.filterByUids)

  if (!filterByUids.has(uid)) {
    const filterBy_Uids = new Set(relationshipGeneratedQueryXSection.x.$o?.filterBy_Uids)

    if (!filterBy_Uids.has(graphRelationshipKey)) {
      const filterByUniques = relationshipGeneratedQueryXSection.x.$o?.filterByUniques?.uniques?.find((unique => {
        return unique.prop === graphRelationshipKey && unique.value === graphRelationship.x
      }))

      if (!filterByUniques) {
        nodeUids.push(uid)
        graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship.x })

        if (String(relationshipGeneratedQueryXSection.x.$o?.findByUid) === uid) findByUidFound = true
        else if (String(relationshipGeneratedQueryXSection.x.$o?.findBy_Uid) === graphRelationshipKey) findBy_UidFound = true
        else if (String(relationshipGeneratedQueryXSection.x.$o?.findByUnique) && uniqueUids.length && uniqueUids[0] === uid) findByUniqueFound = true
      }
    }
  }

  return { findByUidFound, findByUniqueFound, findBy_UidFound }
}
