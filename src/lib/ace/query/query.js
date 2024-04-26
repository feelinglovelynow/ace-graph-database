import { td, enums } from '#ace'
import { doQueryOptions } from './doQueryOptions.js'
import { AceAuthError } from '../../objects/AceError.js'
import { getXGeneratedByParent, getXGeneratedById } from './getXGenerated.js'
import { getRelationshipProp, getSortIndexKey, getRevokesKey, getUniqueIndexKey, getNodeUidsKey, getRelationshipUidsKey } from '../../variables.js'


/**
 * @param { td.AceQueryRequestItemNode } requestItem 
 * @param { td.AcePassport } passport
 * @param { td.AceFnFullResponse } response
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iRequest
 * @returns { Promise<void> }
 */
export async function queryNode (requestItem, passport, response, publicJWKs, iRequest) {
  if (passport.schemaDataStructures?.nodeNamesSet?.has(requestItem.node)) {
    const { uids, xGenerated, isUsingSortIndex } = await getInitialUids(requestItem, passport)
    await addNodesToResponse(xGenerated, response, uids, null, isUsingSortIndex, passport, publicJWKs, iRequest)
  }
}


/**
 * @param { td.AceQueryRequestItemRelationship } requestItem 
 * @param { td.AcePassport } passport
 * @param { td.AceFnFullResponse } response
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iRequest
 * @returns { Promise<void> }
 */
export async function queryRelationship (requestItem, passport, response, publicJWKs, iRequest) {
  if (passport.schemaDataStructures?.relationshipNamesSet?.has(requestItem.relationship)) {
    const { uids, xGenerated, isUsingSortIndex } = await getInitialUids(requestItem, passport)

    await addRelationshipsToResponse(xGenerated, response, uids, isUsingSortIndex, passport, publicJWKs, iRequest)
  }
}


/**
 * @param { td.AceQueryRequestItemNode | td.AceQueryRequestItemRelationship } requestItem
 * @param { td.AcePassport } passport
 * @returns { Promise<{ uids: any, isUsingSortIndex: any, xGenerated: td.AceQueryRequestItemGeneratedXSection }> }
 */
async function getInitialUids (requestItem, passport) {
  let uids

  const xGenerated = getXGeneratedById(requestItem, passport)

  if (xGenerated.x.$o?.sort) {
    const indexKey = getSortIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', xGenerated.x.$o?.sort.prop) // IF sorting by an property requested => see if property is a sort index
    if (indexKey) uids = await passport.storage.get(indexKey)
  }

  let isUsingSortIndex = false

  if (uids) isUsingSortIndex = true // IF property is a sort index => tip flag to true
  else {
    let isValid = true

    if (xGenerated.x.$o?.findByUid) uids = [ xGenerated.x.$o.findByUid ]
    else if (xGenerated.x.$o?.filterByUids) {
      uids = xGenerated.x.$o.filterByUids
      if (!uids.length) isValid = false
    } else if (xGenerated.x.$o?.findByUnique) {
      const key = getUniqueIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', xGenerated.x.$o.findByUnique.prop, xGenerated.x.$o?.findByUnique.value)
      const uid = await passport.storage.get(key)
      uids = uid ? [ uid ] : []
      if (!uids.length) isValid = false
    } else if (xGenerated.x.$o?.filterByUniques) {
      const keys = xGenerated.x.$o.filterByUniques.uniques.map(unique => {
        return getUniqueIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', unique.prop, unique.value)
      })

      const map = await passport.storage.get(keys)
      uids = [...(map.values()) ]
      if (!uids.length) isValid = false
    }

    if (isValid && !uids?.length) {
      uids = requestItem.id === 'QueryByNode' ?
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
 * @param { td.AceFnFullResponse } response 
 * @param { string[] } uids 
 * @param { any[] | null } graphRelationships
 * @param { boolean } isUsingSortIndex
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iRequest
 * @returns { Promise<void> }
 */
async function addNodesToResponse (xGenerated, response, uids, graphRelationships, isUsingSortIndex, passport, publicJWKs, iRequest) {
  const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', node: xGenerated.nodeName, prop: '*' }))

  if (permission && !permission.allowPropName) throw AceAuthError(enums.permissionActions.read, passport, { node: xGenerated.nodeName })

  const rCache = await passport.storage.get(uids)

  for (let i = 0; i < uids.length; i++) {
    const node = rCache.get(uids[i])
    if (isRevokesAllowing(node.x, { permission }, passport)) await addPropsToResponse(xGenerated, response, { node }, graphRelationships?.[i] || null, passport, publicJWKs, iRequest) // call desired function on each node
  }

  await doQueryOptions(xGenerated, response, isUsingSortIndex, uids, publicJWKs, passport)
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
 * @param { any } responseOriginalItem 
 * @param { td.AcePassport } passport 
 * @returns 
 */
function validateAddProps (item, xGenerated, prop, responseOriginalItem, passport) {
  const revokesOptions = item.relationship ?
    { key: getRevokesKey({ action: 'read', relationship: xGenerated.relationshipName, prop }) } :
    { key: getRevokesKey({ action: 'read', node: xGenerated.nodeName, prop }) }

  return isRevokesAllowing(responseOriginalItem, revokesOptions, passport)
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { td.AceQueryAddPropsItem } item 
 * @param { { key: string, value: any } | null } graphRelationship
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iRequest
 * @returns { Promise<void> }
 */
async function addPropsToResponse (xGenerated, response, item, graphRelationship, passport, publicJWKs, iRequest) {
  let graphItem, _uid = '', uid = ''

  if (item.node) {
    graphItem = item.node
    uid = item.node?.x?.uid
  } else if (item.relationship) {
    graphItem = item.relationship
    _uid = item.relationship?.x?._uid
  } else if (item.uid) {
    uid = item.uid
    graphItem = await passport.storage.get(uid)
  }

  if (!graphItem) {
    response.now[ xGenerated.propName ] = null
    response.original[ xGenerated.propName ] = null
  } else {
    const responseOriginalItem = graphItem.x
    const responseNowItem = /** @type { { [propertyName: string]: any } } */ ({})

    if (graphRelationship?.value) {
      for (const prop in graphRelationship.value) {
        if (prop.startsWith('_')) responseOriginalItem[prop] = graphRelationship.value[prop]
      }
    }

    /** @type { Map<string, td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp> | undefined } */
    const relationshipPropsMap = (item.relationship && passport.schemaDataStructures?.relationshipPropsMap) ? passport.schemaDataStructures.relationshipPropsMap.get(xGenerated.relationshipName || '') : undefined

    if (xGenerated.x.$o?.all) { // show all not relationship props
      for (const prop in responseOriginalItem) {
        if ((!item.relationship || (prop !== 'a' && prop !== 'b')) && validateAddProps(item, xGenerated, prop, responseOriginalItem, passport)) { // on relationships, skip the a and b props AND ensure this user may query this data
          responseNowItem[xGenerated.x?.[prop]?.alias || prop] = responseOriginalItem[prop]
        }
      }
    }

    for (const xKey in xGenerated.x) { // loop a section of query.x object
      if (validateAddProps(item, xGenerated, xKey, responseOriginalItem, passport)) {
        const xValue = xGenerated.x[xKey]
        const isTruthy = xValue === true
        const alias = xValue?.alias

        /** @type { { schemaNodeProp?: td.AceSchemaProp | td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp, schemaRelationshipProp?: td.AceSchemaRelationshipProp } } - If graphItemType is node, add node info to this object  */
        const parentNodeOptions = {}

        if (!item.relationship) {
          parentNodeOptions.schemaNodeProp = passport.schema?.nodes[xGenerated.nodeName || '']?.[xKey]
          parentNodeOptions.schemaRelationshipProp = (xGenerated.relationshipName) ? passport.schema?.relationships?.[xGenerated.relationshipName]?.x?.props?.[xKey] : undefined
        }

        if (typeof responseOriginalItem[xKey] !== 'undefined') {
          if (isTruthy) responseNowItem[xKey] = responseOriginalItem[xKey]
          else if (alias) responseNowItem[alias] = responseOriginalItem[xKey]
        } else if (parentNodeOptions.schemaRelationshipProp?.id === enums.idsSchema.RelationshipProp && typeof graphRelationship?.value[xKey] !== 'undefined') { // this prop is defined @ schema.relationships
          if (isTruthy) responseNowItem[xKey] = graphRelationship.value[xKey]
          else if (alias) responseNowItem[alias] = graphRelationship?.value[xKey]
        } else if (parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.ForwardRelationshipProp || parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.ReverseRelationshipProp || parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.BidirectionalRelationshipProp) { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
          const relationshipUids = graphItem[getRelationshipProp(parentNodeOptions.schemaNodeProp.x.relationship)]
          await addRelationshipPropsToResponse(uid, relationshipUids, parentNodeOptions.schemaNodeProp, xKey, xValue, xGenerated, responseNowItem, responseOriginalItem, passport, publicJWKs, iRequest)
        } else if (item.relationship && xKey !== '$o' && relationshipPropsMap) {
          const schemaNodeProp = relationshipPropsMap.get(xKey)
          const relationshipGeneratedQueryXSection = getXGeneratedByParent(xValue, xKey, passport, xGenerated)  

          if (schemaNodeProp?.id === 'BidirectionalRelationshipProp') {
            const uids = [ responseOriginalItem.a, responseOriginalItem.b ]
            const graphRelationship = { key: responseOriginalItem._uid, value: responseOriginalItem }
            const graphRelationships = [ graphRelationship, graphRelationship ]
            await addNodesToResponse(relationshipGeneratedQueryXSection, { now: responseNowItem, original: responseOriginalItem }, uids, graphRelationships, false, passport, publicJWKs, iRequest)
          } else {
            let uid

            if (schemaNodeProp?.id === 'ForwardRelationshipProp') uid = responseOriginalItem.b
            else if (schemaNodeProp?.id === 'ReverseRelationshipProp') uid = responseOriginalItem.a

            if (uid) {
              await addPropsToResponse(relationshipGeneratedQueryXSection, { now: responseNowItem, original: responseOriginalItem }, { uid }, null, passport, publicJWKs, iRequest)
              
              if (responseNowItem[relationshipGeneratedQueryXSection.propName]?.length) responseNowItem[relationshipGeneratedQueryXSection.propName] = responseNowItem[relationshipGeneratedQueryXSection.propName][0]
              if (responseOriginalItem[relationshipGeneratedQueryXSection.propName]?.length) responseOriginalItem[relationshipGeneratedQueryXSection.propName] = responseOriginalItem[relationshipGeneratedQueryXSection.propName][0]
            }
          }
        }
      }
    }

    if (Object.keys(responseNowItem).length) {
      if (response.now[ xGenerated.propName ]?.length) {
        response.now[ xGenerated.propName ].push(responseNowItem)
        response.original[ xGenerated.propName ].push(responseOriginalItem)
      } else {
        response.now[ xGenerated.propName ] = [ responseNowItem ]
        response.original[ xGenerated.propName ] = [ responseOriginalItem ]
      }
    }
  }
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { string[] } uids 
 * @param { boolean } isUsingSortIndex
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iRequest
 * @returns { Promise<void> }
 */
async function addRelationshipsToResponse (xGenerated, response, uids, isUsingSortIndex, passport, publicJWKs, iRequest) {
  const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', relationship: xGenerated.relationshipName, prop: '*' }))

  if (permission && !permission.allowPropName) throw AceAuthError(enums.permissionActions.read, passport, { relationship: xGenerated.relationshipName })

  if (xGenerated.x.$o?.findBy_Uid) {
    if (uids.includes(xGenerated.x.$o.findBy_Uid)) uids = [ xGenerated.x.$o.findBy_Uid ]
  } else {
    if (xGenerated.x.$o?.filterBy_Uids?.length) {
      const set = new Set(xGenerated.x.$o.filterBy_Uids)

      for (let i = uids.length - 1; i >= 0; i--) {
        if (!set.has(uids[i])) uids.splice(i, 1)
      }
    }
  }

  const rCache = await passport.storage.get(uids)

  for (let i = 0; i < uids.length; i++) {
    const relationship = rCache.get(uids[i])

    if (isRevokesAllowing(relationship.x, { permission }, passport)) await addPropsToResponse(xGenerated, response, { relationship }, null, passport, publicJWKs, iRequest)
  }

  await doQueryOptions(xGenerated, response, isUsingSortIndex, uids, publicJWKs, passport)
}


 /**
 * @param { string } uid
 * @param { string[] } relationshipUids
 * @param { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp | td.AceSchemaProp } schemaNodeProp
 * @param { string } xKey 
 * @param { any } xValue 
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { { [propertyName: string]: any } } responseNowItem 
 * @param { any } responseOriginalItem 
 * @param { td.AcePassport } passport
 * @param { td.AceFnCryptoJWKs } publicJWKs
 * @param { number } iRequest
 */
async function addRelationshipPropsToResponse (uid, relationshipUids, schemaNodeProp, xKey, xValue, xGenerated, responseNowItem, responseOriginalItem, passport, publicJWKs, iRequest) {
  if (uid && schemaNodeProp && relationshipUids?.length) {
    let findByUidFound = false
    let findBy_UidFound = false
    let findByUniqueFound = false
    let nodeUids = /** @type { string[] } */ ([])
    const graphRelationships = /** @type { any[] } */ ([])
    const relationshipGeneratedQueryXSection = getXGeneratedByParent(xValue, xKey, passport, xGenerated)  

    const uniqueKeys = /** @type { string[] } */ ([])

    if (xGenerated.x.$o?.findByUnique) uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.relationshipName || '', xGenerated.x.$o.findByUnique.prop, xGenerated.x.$o.findByUnique.value))
    else if (xGenerated.x.$o?.filterByUniques) {
      for (const unique of xGenerated.x.$o.filterByUniques.uniques) {
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
          if (uid === graphRelationship?.x.a) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.b, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
        })
        break
      case enums.idsSchema.ReverseRelationshipProp:
        graphRelationshipsMap.forEach((graphRelationship, graphRelationshipKey) => {
          if (uid === graphRelationship?.x.b) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
        })
        break
      case enums.idsSchema.BidirectionalRelationshipProp:
        graphRelationshipsMap.forEach((graphRelationship, graphRelationshipKey) => {
          validateAndPushUids(relationshipGeneratedQueryXSection, uid === graphRelationship?.x.a ? graphRelationship?.x.b : graphRelationship?.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
        })
        break
    }

    let isValid = true

    if (xGenerated.x.$o?.findByUid) {
      if (findByUidFound) nodeUids = [ xGenerated.x.$o.findByUid ]
      else isValid = false
    }

    if (xGenerated.x.$o?.findByUnique) {
      if (findByUniqueFound) nodeUids = [ uniqueUids[0] ]
      else isValid = false
    }

    if (xGenerated.x.$o?.findBy_Uid) {
      if (findBy_UidFound) nodeUids = [xGenerated.x.$o.findBy_Uid ]
      else isValid = false
    }

    if (isValid) await addNodesToResponse(relationshipGeneratedQueryXSection, { now: responseNowItem, original: responseOriginalItem }, nodeUids, graphRelationships, false, passport, publicJWKs, iRequest)
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
}
