import { td, enums } from '#ace'
import { many, one } from '../../objects/AceCache.js'
import { AceAuthError, AceError } from '../../objects/AceError.js'
import { implementQueryOptions } from './implementQueryOptions.js'
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
  if (passport.schemaDataStructures?.nodeNamesSet?.has(requestItem.nodeName)) {
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
  if (passport.schemaDataStructures?.relationshipNamesSet?.has(requestItem.relationshipName)) {
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

  const xGenerated = getXGeneratedById (requestItem, passport)
  const sortOptions = /** @type { td.AceQuerySort } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.Sort))
  const findByUid = /** @type { td.AceQueryFindByUid } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FindByUid))
  const findByUnique = /** @type { td.AceQueryFindByUnique } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FindByUnique))
  const filterByUids = /** @type { td.AceQueryFilterByUids } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FilterByUids))
  const filterByUniques = /** @type { td.AceQueryFilterByUniques } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FilterByUniques))

  if (sortOptions) {
    const indexKey = getSortIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', sortOptions.x.property) // IF sorting by an property requested => see if property is a sort index
    if (indexKey) uids = await one(indexKey, passport.cache)
  }

  let isUsingSortIndex = false

  if (uids) isUsingSortIndex = true // IF property is a sort index => tip flag to true
  else {
    let isValid = true

    if (findByUid) uids = [ findByUid.x.uid ]
    else if (filterByUids) {
      uids = filterByUids.x.uids
      if (!uids.length) isValid = false
    } else if (findByUnique) {
      const key = getUniqueIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', findByUnique.x.property, findByUnique.x.value)
      const rCache = await one(key, passport.cache)
      const uid = rCache.get(key)
      uids = uid ? [uid ] : []
      if (!uids.length) isValid = false
    } else if (filterByUniques) {
      const keys = filterByUniques.x.uniques.map(value => {
        return getUniqueIndexKey(xGenerated.nodeName || xGenerated.relationshipName || '', value.property, value.value)
      })

      const rCache = await many(keys, passport.cache)
      uids = [ ...(rCache.values()) ]
      if (!uids.length) isValid = false
    }

    if (isValid && !uids?.length) {
      uids = requestItem.id === 'QueryNode' ?
        await one(getNodeUidsKey(xGenerated.nodeName || ''), passport.cache) || [] :
        await one(getRelationshipUidsKey(xGenerated.relationshipName || ''), passport.cache) || []
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
  const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', nodeName: xGenerated.nodeName, propName: '*' }))

  if (permission && !permission.allowPropName) throw AceAuthError(enums.permissionActions.read, passport, { nodeName: xGenerated.nodeName })

  const rCache = await many(uids, passport.cache)

  for (let i = 0; i < uids.length; i++) {
    const node = rCache.get(uids[i])
    if (isRevokesAllowed(node.x, { permission }, passport)) await addPropsToResponse(xGenerated, response, { node }, graphRelationships?.[i] || null, passport, publicJWKs, iRequest) // call desired function on each node
  }

  await implementQueryOptions(xGenerated, response, isUsingSortIndex, publicJWKs, passport)
}


/**
 * @param { { [propName: string]: any; } } node
 * @param { { key?: string, permission?: any } } options
 * @param { td.AcePassport } passport
 * @returns { boolean }
 */
function isRevokesAllowed (node, options, passport) {
  let revokesValue
  let isAllowed = false

  if (options.key) revokesValue = passport.revokesAcePermissions?.get(options.key)
  if (options.permission) revokesValue = options.permission

  if (!revokesValue) isAllowed = true
  else if (passport?.user?.uid && node?.[revokesValue?.allowPropName] && passport.user.uid === node[revokesValue.allowPropName]) isAllowed = true

  return isAllowed
}


/**
 * @param { td.AceQueryRequestItemGeneratedXSection } xGenerated 
 * @param { td.AceFnFullResponse } response 
 * @param { { node?: any, relationship?: any, uid?: string } } item 
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
    graphItem = await one(uid, passport.cache)
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

    for (const xKey in xGenerated.x) { // loop a section of query.x object
      const revokesOptions = item.relationship ?
        { key: getRevokesKey({ action: 'read', relationshipName: xGenerated.relationshipName, propName: xKey }) } :
        { key: getRevokesKey({ action: 'read', nodeName: xGenerated.nodeName, propName: xKey }) }

      if (isRevokesAllowed(responseOriginalItem, revokesOptions, passport)) {
        const xValue = xGenerated.x[xKey]
        const isTruthy = xValue === true
        const alias = xValue?.id === enums.idsQueryOptions.Alias ? xValue.property : null

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
          const relationshipUids = graphItem[getRelationshipProp(parentNodeOptions.schemaNodeProp.x.relationshipName)]
          await addRelationshipPropsToResponse(uid, relationshipUids, parentNodeOptions.schemaNodeProp, xKey, xValue, xGenerated, responseNowItem, responseOriginalItem, passport, publicJWKs, iRequest)
        } else if (item.relationship && xKey !== '$options' && relationshipPropsMap) {
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
        response.now[ xGenerated.propName ] = [responseNowItem]
        response.original[ xGenerated.propName ] = [responseOriginalItem]
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
  const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', relationshipName: xGenerated.relationshipName, propName: '*' }))

  if (permission && !permission.allowPropName) throw AceAuthError(enums.permissionActions.read, passport, { relationshipName: xGenerated.relationshipName })

  const findBy_Uid = /** @type { td.AceQueryFindBy_Uid } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FindBy_Uid))

  if (findBy_Uid) {
    if (uids.includes(findBy_Uid.x._uid) ) uids = [ findBy_Uid.x._uid ]
  } else {
    const filterBy_Uids = /** @type { td.AceQueryFilterBy_Uids } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FilterBy_Uids))

    if (filterBy_Uids) {
      if (xGenerated.sets.get(enums.idsQueryOptions.FilterBy_Uids)?.size) {
        for (let i = uids.length - 1; i >= 0; i--) {
          if (!xGenerated.sets.get(enums.idsQueryOptions.FilterBy_Uids)?.has(uids[i])) uids.splice(i, 1)
        }
      }
    }
  }

  const rCache = await many(uids, passport.cache)

  for (let i = 0; i < uids.length; i++) {
    const relationship = rCache.get(uids[i])
    if (isRevokesAllowed(relationship.x, { permission }, passport)) await addPropsToResponse(xGenerated, response, { relationship }, null, passport, publicJWKs, iRequest)
  }

  await implementQueryOptions(xGenerated, response, isUsingSortIndex, publicJWKs, passport)
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

    const findByUid = /** @type { td.AceQueryFindByUid } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindByUid))
    const findBy_Uid = /** @type { td.AceQueryFindBy_Uid } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindBy_Uid))
    const findByUnique = /** @type { td.AceQueryFindByUnique } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindByUnique))
    const filterByUniques = /** @type { td.AceQueryFilterByUniques } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterByUniques))
    
    const uniqueKeys = /** @type { string[] } */ ([])

    if (findByUnique) uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.relationshipName || '', findByUnique.x.property, findByUnique.x.value))
    else if (filterByUniques) {
      for (const unique of filterByUniques.x.uniques) {
        uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.relationshipName || '', unique.property, unique.value))
      }
    }

    const uniqueUids = /** @type { string[] } */ ([])

    if (uniqueKeys.length) {
      (await many(uniqueKeys, passport.cache)).forEach(value => {
        uniqueUids.push(value)
      })
    }

    const rCache = await many(relationshipUids, passport.cache)

    switch (schemaNodeProp.id) {
      case enums.idsSchema.ForwardRelationshipProp:
        rCache.forEach((graphRelationship, graphRelationshipKey) => {
          if (uid === graphRelationship?.x.a) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.b, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
        })
        break
      case enums.idsSchema.ReverseRelationshipProp:
        rCache.forEach((graphRelationship, graphRelationshipKey) => {
          if (uid === graphRelationship?.x.b) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
        })
        break
      case enums.idsSchema.BidirectionalRelationshipProp:
        rCache.forEach((graphRelationship, graphRelationshipKey) => {
          validateAndPushUids(relationshipGeneratedQueryXSection, uid === graphRelationship?.x.a ? graphRelationship?.x.b : graphRelationship?.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
        })
        break
    }

    let isValid = true

    if (findByUid) {
      if (findByUidFound) nodeUids = [ findByUid.x.uid ]
      else isValid = false
    }

    if (findByUnique) {
      if (findByUniqueFound) nodeUids = [ uniqueUids[0] ]
      else isValid = false
    }

    if (findBy_Uid) {
      if (findBy_UidFound) nodeUids = [ findBy_Uid.x._uid ]
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
 * @param { td.AceQueryFindByUid } findByUid 
 * @param { td.AceQueryFindBy_Uid } findBy_Uid 
 * @param { td.AceQueryFindByUnique } findByUnique
 * @param { td.AceQueryFilterByUniques } filterByUniques 
 * @param { string[] } uniqueUids 
 * @param { boolean } findByUidFound 
 * @param { boolean } findByUniqueFound 
 * @param { boolean } findBy_UidFound 
 */
function validateAndPushUids (relationshipGeneratedQueryXSection, uid, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound) {
  const filterByUids = /** @type { td.AceQueryFilterByUids } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterByUids))
  const filterBy_Uids = /** @type { td.AceQueryFilterBy_Uids } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterBy_Uids))

  if (!filterByUids || relationshipGeneratedQueryXSection.sets.get(enums.idsQueryOptions.FilterByUids)?.has(uid)) {
    if (!filterBy_Uids || relationshipGeneratedQueryXSection.sets.get(enums.idsQueryOptions.FilterBy_Uids)?.has(graphRelationshipKey)) {
      if (!filterByUniques || relationshipGeneratedQueryXSection.sets.get(enums.idsQueryOptions.FilterByUniques)?.has(uid)) {
        nodeUids.push(uid)
        graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship.x })

        if (findByUid && findByUid.x.uid === uid) findByUidFound = true
        else if (findBy_Uid && findBy_Uid.x._uid === graphRelationshipKey) findBy_UidFound = true
        else if (findByUnique && uniqueUids.length && uniqueUids[0] === uid) findByUniqueFound = true
      }
    }
  }
}
