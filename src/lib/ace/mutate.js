import { td, enums } from '#ace'
import { getUid } from './getUid.js'
import { delAll, put } from './storage.js'
import { sign } from '../security/hash.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { throwIfAnyGenericRevokes } from './throwIfAnyGenericRevokes.js'
import { deleteUidFromRelationshipProp } from './mutateRelationship.js'
import { validateUpdateOrDeletePermissions } from './validateUpdateOrDeletePermissions.js'
import { REQUEST_UID_PREFIX, ADD_NOW_DATE, DELIMITER, RELATIONSHIP_PREFIX, getUniqueIndexKey, getNow, getRevokesKey, getNodeUidsKey, getRelationshipProp, getRelationshipUidsKey, getRelationshipNameFromProp, getNodeNamePlusRelationshipNameToNodePropNameMapKey } from '../variables.js'



/**
 * Add nodes for insert or update to putEntries
 * @param { td.AcePassport } passport 
 * @param { td.AceFnSortIndexMap } sortIndexMap 
 * @param { { [keyName: string]: CryptoKey } } privateJWKs 
 * @param { td.AceMutateRequestItemNodeInsert | td.AceMutateRequestItemNodeUpdate | td.AceMutateRequestItemNodeUpsert } reqItem 
 */
export async function inupNode (passport, sortIndexMap, privateJWKs, reqItem) {
  const inupNodesArray = /** @type { [ td.AceMutateRequestItemNodeInsert | td.AceMutateRequestItemNodeUpdate, string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate newUidsMap
  await populateInupNodesArray(reqItem, privateJWKs, sortIndexMap, inupNodesArray, passport)
  implementInupNodesArray(inupNodesArray, passport)
}


/**
 * @param { td.AceMutateRequestItemNodeInsert | td.AceMutateRequestItemNodeUpdate | td.AceMutateRequestItemNodeUpsert } reqItem 
 * @param { { [keyName: string]: CryptoKey } } privateJWKs 
 * @param { td.AceFnSortIndexMap } sortIndexMap 
 * @param { [ td.AceMutateRequestItemNodeInsert | td.AceMutateRequestItemNodeUpdate, string ][] } inupNodesArray 
 * @param { td.AcePassport } passport 
 * @returns { Promise<void> }
 */
async function populateInupNodesArray (reqItem, privateJWKs, sortIndexMap, inupNodesArray, passport) {
  if (reqItem && passport.schemaDataStructures?.nodeNamesSet?.has(reqItem.node)) { // IF permission to write this nodeName
    const startsWithUidPrefix = typeof reqItem.x.uid === 'string' && reqItem.x.uid.startsWith(REQUEST_UID_PREFIX)
    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, node: reqItem.node, prop: '*' }))

    let graphNode

    switch (reqItem.id) {
      case 'NodeInsert':
        reqItem = /** @type { td.AceMutateRequestItemNodeInsert } */ (reqItem)
        break
      case 'NodeUpdate':
        reqItem = /** @type { td.AceMutateRequestItemNodeUpdate } */(reqItem)
        break
      case 'NodeUpsert':
        reqItem.x.uid = getUid(passport, { uid: reqItem.x.uid })
        graphNode = await passport.storage.get(reqItem.x.uid)
        reqItem = /** @type { * } */(reqItem)

        if (graphNode) {
          reqItem.id = enums.idsAce.NodeUpdate 
          reqItem = /** @type { td.AceMutateRequestItemNodeUpdate } */(reqItem)
        } else {
          reqItem.id = enums.idsAce.NodeInsert
          reqItem = /** @type { td.AceMutateRequestItemNodeInsert } */(reqItem)
        }
        break
    }

    if (reqItem.id === 'NodeInsert') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { node: reqItem.node })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, node: reqItem.node, prop: '*' }))) throw AceAuthError(enums.permissionActions.insert, passport, { node: reqItem.node })
    }


    if (reqItem.id === 'NodeUpdate') {
      if (!graphNode) {
        reqItem.x.uid = getUid(passport, { uid: reqItem.x.uid })
        graphNode = await passport.storage.get(reqItem.x.uid)
      }

      if (!graphNode) throw AceError('acFn__mutate__invalidUpdateUid', `Please pass a request item uid that is a uid defined in your graph, the uid \`${ reqItem.x.uid }\` is not defined in your graph`, { reqItem })
      if (graphNode.node !== reqItem.node) throw AceError('aceFn__mutate__invalidUpdateNodeName', `Please pass a request item uid that is a uid defined in your graph with a matching graphNode.node: \`${ graphNode.node }\`and reqItem.node: \`${ reqItem.node }\``, { reqItem, graphNodeName: graphNode.node })

      validateUpdateOrDeletePermissions(enums.permissionActions.inup, graphNode, passport, { node: reqItem.node }, inupPermission)
      validateUpdateOrDeletePermissions(enums.permissionActions.update, graphNode, passport, { node: reqItem.node }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, node: reqItem.node, prop: '*' })))

      for (const propName in graphNode) {
        if (propName.startsWith(RELATIONSHIP_PREFIX)) { // transfer all $r from graphNode into reqItem
          /** @type { td.AceMutateRequestItemNodeWithRelationships } */(reqItem)[propName] = graphNode[propName]
        }
      }

      reqItem.x = { ...graphNode.x, ...reqItem.x } // transfer additional graphNode.x props into reqItem.x
    }

    let graphUid

    if (reqItem.id === 'NodeUpdate') graphUid = reqItem.x.uid
    else {
      if (reqItem.x.uid && startsWithUidPrefix) graphUid = getGraphUidAndAddToMapUids(reqItem.x.uid, startsWithUidPrefix, passport)
      else if (!reqItem.x.uid) reqItem.x.uid = graphUid = crypto.randomUUID()
      else graphUid = String(reqItem.x.uid)

      const nodeUids = await passport.storage.get(getNodeUidsKey(reqItem.node)) || []

      nodeUids.push(graphUid)
      put(getNodeUidsKey(reqItem.node), nodeUids, passport)
    }

    for (const nodePropName in reqItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
      const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, node: reqItem.id, prop: nodePropName }))

      if (reqItem.id === 'NodeInsert') {
        if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { node: reqItem.node, prop: nodePropName })
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, node: reqItem.node, prop: nodePropName }))) throw AceAuthError(enums.permissionActions.insert, passport, { node: reqItem.node, prop: nodePropName })
      }

      if (reqItem.id === 'NodeUpdate') {
        validateUpdateOrDeletePermissions(enums.permissionActions.inup, graphNode, passport, { node: reqItem.node, prop: nodePropName }, inupPermission)
        validateUpdateOrDeletePermissions(enums.permissionActions.update, graphNode, passport, { node: reqItem.node, prop: nodePropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, node: reqItem.node, prop: nodePropName })))
      }

      const reqItemX = /** @type { { [k: string]: any } } */ (reqItem.x)
      const nodePropValue = reqItemX[nodePropName]
      const schemaProp = /** @type { td.AceSchemaProp } */ (passport.schema?.nodes?.[reqItem.node][nodePropName])

      if (nodePropName !== '$o' && nodePropName !== 'uid') {
        if (schemaProp?.id !== 'Prop') throw AceError('aceFn__mutate__invalidSchemaProp', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because it is not defined in your schema`, { reqItem, nodePropName })

        const _errorData = { schemaProp, reqItem, nodePropName, nodePropValue }

        if (schemaProp.x.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw AceError('aceFn__mutate__invalidPropValue__string', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
        if (schemaProp.x.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw AceError('aceFn__mutate__invalidPropValue__isoString', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
        if (schemaProp.x.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw AceError('aceFn__mutate__invalidPropValue__number', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "number", the request typeof must be a "number"`, _errorData)
        if (schemaProp.x.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw AceError('aceFn__mutate__invalidPropValue__boolean', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "boolean", the request typeof must be a "boolean"`, _errorData)

        if (schemaProp.x.dataType === enums.dataTypes.hash) {
          const jwkName = reqItem.x.$o?.privateJWK

          if (!jwkName) throw AceError('aceFn__mutate__falsyOptionsPrivateJwk', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because reqItem.x.$o does not have a PrivateJWK. Example: reqItem.$o: { privateJWK: 'password' }`, _errorData)
          if (!privateJWKs?.[jwkName]) throw AceError('aceFn__mutate__falsyRequestItemPrivateJwk', `The node name ${ reqItem.node } with the prop name ${ nodePropName } is invalid because reqItem.x.$o[PrivateJWK].name does not align with any request.privateJWKs. Names must align.`, _errorData)

          reqItemX[nodePropName] = await sign(nodePropValue, privateJWKs[jwkName])
        }

        if (schemaProp.x.uniqueIndex) put(getUniqueIndexKey(reqItem.node, nodePropName, nodePropValue), graphUid, passport)

        if (schemaProp.x.sortIndex) {
          const key = reqItem.node + DELIMITER + nodePropName
          const value = sortIndexMap.get(key) || { nodeName: reqItem.node, nodePropName, uids: /** @type { string[] } */ ([]) }

          value.uids.push(graphUid)
          sortIndexMap.set(key, value)
        }

        if (schemaProp.x.dataType === enums.dataTypes.isoString && nodePropValue === ADD_NOW_DATE) reqItemX[nodePropName] = getNow()
      }
    }

    inupNodesArray.push([reqItem, graphUid]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate newUidsMap
  }
}


/**
 * @param { [ td.AceMutateRequestItemNodeInsert | td.AceMutateRequestItemNodeUpdate, string ][] } inupNodesArray 
 * @param { td.AcePassport } passport 
 * @returns { void }
 */
function implementInupNodesArray (inupNodesArray, passport) {
  for (const [reqItem, graphUid] of inupNodesArray) { // loop the uids that we'll add to the graph
    for (const reqItemKey in reqItem.x) {
      overwriteUids(reqItem.x, reqItemKey, passport)
    }

    /** @type { { [k:string]: any } } - The request item that will be added to the graph - No id prop */
    const graphRequestItem = {}

    for (const key in reqItem) {
      if (key !== 'id' && key !== 'x') graphRequestItem[key] = /** @type { td.AceMutateRequestItemNodeWithRelationships } */(reqItem)[key]
    }

    if (!reqItem.x.$o) graphRequestItem.x = reqItem.x
    else {
      graphRequestItem.x = {}

      for (const prop in reqItem.x) {
        if (prop !== '$o') graphRequestItem.x[prop] = reqItem.x[/** @type { 'uid' } */(prop)]
      }
    }

    put(graphUid, graphRequestItem, passport) // The entries we will put
  }
}


/**
 * @param { string } insertUid 
 * @param { boolean } startsWithUidPrefix 
 * @param { td.AcePassport } passport 
 * @returns { string }
 */
function getGraphUidAndAddToMapUids (insertUid, startsWithUidPrefix, passport) {
  /** This will be the uid that is added to the graph */
  let graphUid

  if (typeof insertUid !== 'string') throw AceError('aceFn__mutate__uidInvalidType', `The uid ${ insertUid } is invalid because the type is not string, please include only typeof "string" for each uid`, { uid: insertUid })

  if (!startsWithUidPrefix) graphUid = insertUid
  else {
    if (passport.$aceDataStructures.newUids.get(insertUid)) throw AceError('aceFn__mutate__duplicateUid', `The uid ${ insertUid } is invalid because it is included as a uid for multiple nodes, please do not include duplicate uids for insert`, { uid: insertUid })

    graphUid = crypto.randomUUID()
    passport.$aceDataStructures.newUids.set(insertUid, graphUid)
  }

  return graphUid
}


/**
 * Insert / Update Relationships
 * @param { td.AcePassport } passport 
 * @param { td.AceMutateRequestItemRelationshipInsert | td.AceMutateRequestItemRelationshipUpdate | td.AceMutateRequestItemRelationshipUpsert } reqItem 
 */
export async function inupRelationship (passport, reqItem) {
  if (reqItem && passport.schemaDataStructures?.relationshipNamesSet?.has(reqItem.relationship)) {
    const schemaRelationship = passport.schema?.relationships?.[reqItem.relationship]

    if (!schemaRelationship) throw AceError('aceFn__mutate__unknownRelationshipName', `The relationship name \`${reqItem.relationship}\` is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: reqItem.relationship })

    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, relationship: reqItem.relationship, prop: '*' }))

    let graphNode

    switch (reqItem.id) {
      case 'RelationshipInsert':
        reqItem = /** @type { td.AceMutateRequestItemRelationshipInsert } */ (reqItem)
        break
      case 'RelationshipUpdate':
        reqItem = /** @type { td.AceMutateRequestItemRelationshipUpdate } */(reqItem)
        break
      case 'RelationshipUpsert':
        reqItem.x._uid = getUid(passport, { uid: reqItem.x._uid })
        graphNode = await passport.storage.get(reqItem.x._uid)
        reqItem = /** @type { * } */(reqItem)

        if (graphNode) {
          reqItem.id = enums.idsAce.RelationshipUpdate
          reqItem = /** @type { td.AceMutateRequestItemRelationshipUpdate } */(reqItem)
        } else {
          reqItem.id = enums.idsAce.RelationshipInsert
          reqItem = /** @type { td.AceMutateRequestItemRelationshipInsert } */(reqItem)
        }
        break
    }

    if (reqItem.id === 'RelationshipInsert') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { relationship: reqItem.relationship })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, relationship: reqItem.relationship, prop: '*' }))) throw AceAuthError(enums.permissionActions.insert, passport, { relationship: reqItem.relationship })
    }

    if (reqItem.id === 'RelationshipUpdate') {
      if (!graphNode) graphNode = await passport.storage.get(reqItem.x._uid)

      if (!graphNode) throw AceError('aceFn__mutate__invalidUpdateUid', `Please pass a request item _uid that is a _uid defined in your graph, the _uid \`${ reqItem.x._uid } \` is not defined in your graph`, { reqItem })
      if (graphNode.relationship !== reqItem.relationship) throw AceError('aceFn__mutate__invalidUpdateRelationshipName', `Please pass a request item _uid that is a _uid defined in your graph with a matching graphNode.relationship: \`${graphNode.relationship}\`,  and reqItem.relationship: \`${ reqItem.relationship }\``, { reqItem, graphNodeRelationship: graphNode.relationship })

      validateUpdateOrDeletePermissions(enums.permissionActions.inup, graphNode, passport, { relationship: reqItem.relationship }, inupPermission)
      validateUpdateOrDeletePermissions(enums.permissionActions.update, graphNode, passport, { relationship: reqItem.relationship }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, relationship: reqItem.relationship, prop: '*' })))

      const aIsDifferent = graphNode.x.a !== reqItem.x.a
      const bIsDifferent = graphNode.x.b !== reqItem.x.b

      if (aIsDifferent) updatePreviousRelationshipNode(aIsDifferent, graphNode.a, passport, reqItem)
      if (bIsDifferent) updatePreviousRelationshipNode(bIsDifferent, graphNode.b, passport, reqItem)

      reqItem.x = { ...graphNode.x, ...reqItem.x }
    }

    await inupRelationshipPut(reqItem, schemaRelationship, passport, graphNode)
  }
}


/**
 * @param { boolean } isDifferent 
 * @param { string } deletedNodeUid 
 * @param { td.AcePassport } passport 
 * @param { td.AceMutateRequestItemRelationshipUpdate } reqItem 
 */
async function updatePreviousRelationshipNode (isDifferent, deletedNodeUid, passport, reqItem) {
  if (isDifferent) {
    const relationshipNode = await passport.storage.get(deletedNodeUid)

    if (relationshipNode && reqItem.x._uid) deleteUidFromRelationshipProp(getRelationshipProp(reqItem.relationship), reqItem.x._uid, passport, relationshipNode)
  }
}


/**
 * @param { td.AceMutateRequestItemRelationshipInsertX } x
 * @param { string | number } reqItemKey
 * @param { td.AcePassport } passport
 */
function overwriteUids (x, reqItemKey, passport) {
  const reqItemValue = x[reqItemKey]

  if (typeof reqItemValue === 'string' && reqItemValue.startsWith(REQUEST_UID_PREFIX)) {
    const graphUid = passport.$aceDataStructures.newUids.get(reqItemValue)

    if (graphUid) x[reqItemKey] = graphUid
    else throw AceError('aceFn__mutate__invalidUid', `The uid ${ reqItemValue } is invalid b/c each uid, with an Ace uid prefix, must be defined in a node`, { uid: reqItemValue })
  }
}


/**
 * @param { td.AceMutateRequestItemRelationshipInsert | td.AceMutateRequestItemRelationshipUpdate } reqItem 
 * @param { any } schemaRelationship 
 * @param { td.AcePassport } passport 
 * @param { any } [ graphNode ] 
 */
async function inupRelationshipPut (reqItem, schemaRelationship, passport, graphNode) {
  const x = /** @type { td.AceMutateRequestItemRelationshipInsertX } */ (/** @type {*} */ (reqItem.x))

  if (reqItem.id === 'RelationshipInsert') x._uid = crypto.randomUUID()

  for (const relationshipPropName in reqItem.x) {
    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, relationship: reqItem.relationship, prop: relationshipPropName }))

    if (reqItem.id === 'RelationshipInsert') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { relationship: reqItem.relationship, prop: relationshipPropName })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, relationship: reqItem.relationship, prop: relationshipPropName }))) throw AceAuthError(enums.permissionActions.insert, passport, { relationship: reqItem.relationship, prop: relationshipPropName })
    }

    if (reqItem.id === 'RelationshipUpdate') {
      validateUpdateOrDeletePermissions(enums.permissionActions.inup, graphNode, passport, { relationship: reqItem.relationship, prop: relationshipPropName }, inupPermission)
      validateUpdateOrDeletePermissions(enums.permissionActions.update, graphNode, passport, { relationship: reqItem.relationship, prop: relationshipPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, relationship: reqItem.relationship, prop: relationshipPropName })))
    }

    const relationshipPropValue = x[relationshipPropName]

    if (relationshipPropValue === ADD_NOW_DATE && schemaRelationship.props?.[relationshipPropName]?.x?.dataType === enums.dataTypes.isoString) x[relationshipPropName] = getNow() // populate now timestamp
    else if (typeof relationshipPropValue === 'string' && relationshipPropValue.startsWith(REQUEST_UID_PREFIX)) {
      overwriteUids(reqItem.x, relationshipPropName, passport)
    }
  }

  const relationshipProp = getRelationshipProp(reqItem.relationship)
  await addRelationshipToNode('a', reqItem, relationshipProp, x, passport)
  await addRelationshipToNode('b', reqItem, relationshipProp, x, passport)

  put(x._uid, { relationship: reqItem.relationship, x: reqItem.x }, passport) // add relationship to graph

  const relationshipUidsKey = getRelationshipUidsKey(reqItem.relationship)
  const relationshipUidsArray = (await passport.storage.get(relationshipUidsKey)) || []
  const relationshipUidsSet = new Set(relationshipUidsArray)

  relationshipUidsSet.add(x._uid) // add relationship _uid to relationship index
  put(relationshipUidsKey, [ ...relationshipUidsSet ], passport)
}


/**
 * @param { 'a' | 'b' } direction
 * @param { td.AceMutateRequestItemRelationshipUpdate | td.AceMutateRequestItemRelationshipInsert } reqItem
 * @param { string } relationshipProp
 * @param { td.AceMutateRequestItemRelationshipInsertX } x
 * @param { td.AcePassport } passport
 */
async function addRelationshipToNode (direction, reqItem, relationshipProp, x, passport) {
  if (reqItem.x[direction]) {
    const node = await passport.storage.get(/** @type { string } */(reqItem.x[direction]))

    if (!node?.[relationshipProp]) node[relationshipProp] = [x._uid]
    else node[relationshipProp].push(x._uid)

    put(node.x.uid, node, passport)
  }
}


/**
 * @param { td.AcePassport } passport
 * @param { td.AceFnFullResponse } res
 * @param { td.AceMutateRequestItemEmpty } reqItem
 * @returns { Promise<void> }
 */
export async function empty (passport, res, reqItem) {
  throwIfAnyGenericRevokes(passport)
  delAll(passport)
  if (reqItem.prop) res.now[reqItem.prop] = { success: true }
}
