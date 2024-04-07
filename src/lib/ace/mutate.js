import { td, enums } from '#manifest'
import { sign } from '../security/hash.js'
import { many, one } from '../objects/AceCache.js'
import { validateSchema } from './validateSchema.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { setSchemaDataStructures } from '../objects/AcePassport.js'
import { REQUEST_UID_PREFIX, ADD_NOW_DATE, DELIMITER, RELATIONSHIP_PREFIX, SCHEMA_KEY, getUniqueIndexKey, getNow, getRevokesKey, getNodeUidsKey, getRelationshipProp, getRelationshipUidsKey, getRelationshipNameFromProp, getNodeNamePlusRelationshipNameToNodePropNameMapKey, ACE_NODE_NAMES } from '../variables.js'



/**
 * Add nodes for insert or update to putEntries
 * @param { td.AceMutateRequestItemInsertNode | td.AceMutateRequestItemUpdateNode } requestItem 
 * @param { td.AcePassport } passport 
 * @param { Map<string, string[]> } nodeUidsMap 
 * @param { td.AceFnSortIndexMap } sortIndexMap 
 * @param { td.AceFnNewUids } newUidsMap 
 * @param { td.AceFnUpdateRequestItems } updateRequestItems 
 * @param { { [keyName: string]: CryptoKey } } privateJWKs 
 */
export async function inupNode (requestItem, passport, nodeUidsMap, sortIndexMap, newUidsMap, updateRequestItems, privateJWKs) {
  const inupNodesArray = /** @type { [ td.AceMutateRequestItemInsertNode | td.AceMutateRequestItemUpdateNode , string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate newUidsMap

  await populateInupNodesArray()
  implementInupNodesArray()

  async function populateInupNodesArray () {
    if (requestItem && passport.schemaDataStructures?.nodeNamesSet?.has(requestItem.nodeName)) { // IF permission to write this nodeName
      const startsWithUidPrefix = typeof requestItem.x.uid === 'string' && requestItem.x.uid.startsWith(REQUEST_UID_PREFIX)
      const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, nodeName: requestItem.nodeName, propName: '*' }))

      if (requestItem.id === 'InsertNode') {
        if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { nodeName: requestItem.nodeName })
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, nodeName: requestItem.nodeName, propName: '*' }))) throw AceAuthError(enums.permissionActions.insert, passport, { nodeName: requestItem.nodeName })
      }

      let graphNode

      if (requestItem.id === 'UpdateNode' && updateRequestItems.nodes?.size) {
        graphNode = /** @type { Map<string, any> } */(updateRequestItems.nodes).get(requestItem.x.uid)

        if (!graphNode) throw AceError('mutate__invalid-update-uid', `Please pass a request item uid that is a uid defined in your graph, the uid \`${requestItem.x.uid}\` is not defined in your graph`, { requestItem })
        if (graphNode.nodeName !== requestItem.nodeName) throw AceError('mutate__invalid-update-nodeName', `Please pass a request item uid that is a uid defined in your graph with a matching graphNode.nodeName: \`${graphNode.nodeName}\`and requestItem.nodeName: \`${requestItem.nodeName}\``, { requestItem, graphNodeName: graphNode.nodeName })

        validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { nodeName: requestItem.nodeName }, inupPermission)
        validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { nodeName: requestItem.nodeName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, nodeName: requestItem.nodeName, propName: '*' })))

        for (const propName in graphNode) {
          if (propName.startsWith(RELATIONSHIP_PREFIX)) { // transfer all $r from graphNode into requestItem
            /** @type { td.AceMutateRequestItemNodeWithRelationships } */(requestItem)[propName] = graphNode[propName]
          }
        }

        requestItem.x = { ...graphNode.x, ...requestItem.x } // transfer additional graphNode.x props into requestItem.x
      }

      let graphUid

      if (requestItem.id === 'UpdateNode') graphUid = requestItem.x.uid
      else {
        if (startsWithUidPrefix) graphUid = getGraphUidAndAddToMapUids(requestItem.x.uid, startsWithUidPrefix)
        else if (!requestItem.x.uid) requestItem.x.uid = graphUid = crypto.randomUUID()
        else graphUid = String(requestItem.x.uid)

        const nodeUids = nodeUidsMap.get(requestItem.nodeName) || []

        nodeUids.push(graphUid)
        nodeUidsMap.set(requestItem.nodeName, nodeUids)
        passport.cache.putMap.set(getNodeUidsKey(requestItem.nodeName), nodeUids)
      }

      for (const nodePropName in requestItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
        const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, nodeName: requestItem.id, propName: nodePropName }))

        if (requestItem.id === 'InsertNode') {
          if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { nodeName: requestItem.nodeName, propName: nodePropName })
          if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, nodeName: requestItem.nodeName, propName: nodePropName }))) throw AceAuthError(enums.permissionActions.insert, passport, { nodeName: requestItem.nodeName, propName: nodePropName })
        }

        if (requestItem.id === 'UpdateNode') {
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { nodeName: requestItem.nodeName, propName: nodePropName }, inupPermission)
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { nodeName: requestItem.nodeName, propName: nodePropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, nodeName: requestItem.nodeName, propName: nodePropName })))
        }

        const requestItemX = /** @type { { [k: string]: any } } */ (requestItem.x)
        const nodePropValue = requestItemX[nodePropName]
        const schemaProp = /** @type { td.AceSchemaProp } */ (passport.schema?.nodes?.[requestItem.nodeName][nodePropName])

        if (nodePropName !== '$options' && nodePropName !== 'uid') {
          if (schemaProp?.id !== 'Prop') throw AceError('mutate__invalid-schema-prop', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because it is not defined in your schema`, { requestItem, nodeName: requestItem.nodeName, nodePropName })

          const _errorData = { schemaProp, requestItem, nodePropName, nodePropValue }

          if (schemaProp.x.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw AceError('mutate__invalid-property-value__isoString', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
          if (schemaProp.x.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw AceError('mutate__invalid-property-value__isoString', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
          if (schemaProp.x.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw AceError('mutate__invalid-property-value__number', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because when the schema property data type is "number", the request typeof must be a "number"`, _errorData)
          if (schemaProp.x.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw AceError('mutate__invalid-property-value__boolean', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because when the schema property data type is "boolean", the request typeof must be a "boolean"`, _errorData)

          if (schemaProp.x.dataType === enums.dataTypes.hash) {
            const jwkName = requestItem.x.$options?.find(o => o.id === 'PrivateJWK')?.x.name

            if (!jwkName) throw AceError('mutate__falsy-options-private-jwk', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because requestItem.x.$options does not have a PrivateJWK. Example: requestItem.$options: [ { id: 'PrivateJWK', x: { name: 'password' } } ]`, _errorData)
            if (!privateJWKs?.[jwkName]) throw AceError('mutate__falsy-request-item-private-jwk', `The node name ${requestItem.nodeName} with the prop name ${nodePropName} is invalid because requestItem.x.$options[PrivateJWK].name does not align with any request.privateJWKs. Names must align.`, _errorData)

            requestItemX[nodePropName] = await sign(privateJWKs[jwkName], nodePropValue?.value)
          }

          if (schemaProp.x.uniqueIndex) passport.cache.putMap.set(getUniqueIndexKey(requestItem.nodeName, nodePropName, nodePropValue), graphUid)

          if (schemaProp.x.sortIndex) {
            const key = requestItem.nodeName + DELIMITER + nodePropName
            const value = sortIndexMap.get(key) || { nodeName: requestItem.nodeName, nodePropName, uids: /** @type { string[] } */ ([]) }

            value.uids.push(graphUid)
            sortIndexMap.set(key, value)
          }

          if (schemaProp.x.dataType === enums.dataTypes.isoString && nodePropValue === ADD_NOW_DATE) requestItemX[nodePropName] = getNow()
        }
      }

      inupNodesArray.push([requestItem, graphUid]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate newUidsMap
    }
  }


  function implementInupNodesArray () {
    for (const [requestItem, graphUid] of inupNodesArray) { // loop the uids that we'll add to the graph
      for (const requestItemKey in requestItem.x) {
        overwriteUids(requestItem.x, requestItemKey, newUidsMap)
      }

      /** @type { { [k:string]: any } } - The request item that will be added to the graph - No id prop */
      let graphRequestItem = {}

      for (const key in requestItem) {
        if (key !== 'id') graphRequestItem[key] = /** @type { td.AceMutateRequestItemNodeWithRelationships } */(requestItem)[key]
      }

      passport.cache.putMap.set(graphUid, graphRequestItem) // The entries we will put
    }
  }


  /**
   * @param { string } insertUid 
   * @param { boolean } startsWithUidPrefix 
   * @returns { string }
   */
  function getGraphUidAndAddToMapUids (insertUid, startsWithUidPrefix) {
    /** This will be the uid that is added to the graph */
    let graphUid

    if (typeof insertUid !== 'string') throw AceError('mutate__uid-invalid-type', `The uid ${insertUid} is invalid because the type is not string, please include only typeof "string" for each uid`, { uid: insertUid })

    if (!startsWithUidPrefix) graphUid = insertUid
    else {
      if (newUidsMap.get(insertUid)) throw AceError('mutate__duplicate-uid', `The uid ${insertUid} is invalid because it is included as a uid for multiple nodes, please do not include duplicate uids for insert`, { uid: insertUid })

      graphUid = crypto.randomUUID()
      newUidsMap.set(insertUid, graphUid)
    }

    return graphUid
  }
}


/**
 * Insert / Update Relationships
 * @param { td.AceMutateRequestItemInsertRelationship | td.AceMutateRequestItemUpdateRelationship } requestItem 
 * @param { td.AcePassport } passport 
 * @param { td.AceFnUpdateRequestItems } updateRequestItems 
 * @param { td.AceFnNewUids } newUidsMap 
 */
export async function inupRelationship (requestItem, passport, updateRequestItems, newUidsMap) {
  if (requestItem && passport.schemaDataStructures?.relationshipNamesSet?.has(requestItem.relationshipName)) {
    const schemaRelationship = passport.schema?.relationships?.[requestItem.relationshipName]

    if (!schemaRelationship) throw AceError('mutate__unknown-relationship-name', `The relationship name \`${requestItem.relationshipName}\` is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: requestItem.relationshipName })

    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, relationshipName: requestItem.relationshipName, propName: '*' }))

    if (requestItem.id === 'InsertRelationship') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { relationshipName: requestItem.relationshipName })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, relationshipName: requestItem.relationshipName, propName: '*' }))) throw AceAuthError(enums.permissionActions.insert, passport, { relationshipName: requestItem.relationshipName })
    }

    let graphNode

    if (requestItem.id === 'UpdateRelationship' && updateRequestItems.relationships?.size) {
      graphNode = /** @type { Map<string, any> } */(updateRequestItems.relationships).get(requestItem.x._uid)

      if (!graphNode) throw AceError('mutate__invalid-update-uid', `Please pass a request item _uid that is a _uid defined in your graph, the _uid \`${requestItem.x._uid} \` is not defined in your graph`, { requestItem })
      if (graphNode.relationshipName !== requestItem.relationshipName) throw AceError('mutate__invalid-update-relationshipName', `Please pass a request item _uid that is a _uid defined in your graph with a matching graphNode.relationshipName: \`${graphNode.relationshipName}\`,  and requestItem.relationshipName: \`${requestItem.relationshipName}\``, { requestItem, graphNodeRelationshipName: graphNode.relationshipName })

      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { relationshipName: requestItem.relationshipName }, inupPermission)
      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { relationshipName: requestItem.relationshipName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, relationshipName: requestItem.relationshipName, propName: '*' })))

      const aIsDifferent = graphNode.x.a !== requestItem.x.a
      const bIsDifferent = graphNode.x.b !== requestItem.x.b

      if (aIsDifferent) updatePreviousRelationshipNode(aIsDifferent, graphNode.a, requestItem, passport)
      if (bIsDifferent) updatePreviousRelationshipNode(bIsDifferent, graphNode.b, requestItem, passport)

      requestItem.x = { ...graphNode.x, ...requestItem.x }
    }

    await inupRelationshipPut(requestItem, schemaRelationship, passport, newUidsMap, graphNode)
  }
}

/**
 * @param { td.AceMutateRequestItemInsertRelationshipX } x
 * @param { string | number } requestItemKey
 * @param { td.AceFnNewUids } newUidsMap
 */
function overwriteUids (x, requestItemKey, newUidsMap) {
  const requestItemValue = x[requestItemKey]

  if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
    const graphUid = newUidsMap.get(requestItemValue)

    if (graphUid) x[requestItemKey] = graphUid
    else throw AceError('mutate__invalid-uid', `The uid ${ requestItemValue } is invalid b/c each uid, with an ace uid prefix, must be defined in a node`, { uid: requestItemValue })
  }
}


/**
 * @param { enums.permissionActions } action
 * @param { any } graphItem
 * @param { td.AcePassport } passport
 * @param { td.AceAuthErrorOptions } options
 * @param { td.AceGraphPermission } [ permission ]
 */
function validateUpdateOrDeleteBasedOnPermissions (action, graphItem, passport, options, permission) {
  if (permission && (!passport?.user?.uid || !permission.allowPropName || !graphItem?.x[permission.allowPropName] || graphItem.x[permission.allowPropName] !== passport.user.uid)) throw AceAuthError(action, passport, options)
}


/**
 * @param { td.AceMutateRequestItemInsertRelationship | td.AceMutateRequestItemUpdateRelationship } requestItem 
 * @param { any } schemaRelationship 
 * @param { td.AcePassport } passport 
 * @param { td.AceFnNewUids } newUidsMap 
 * @param { any } [ graphNode ] 
 */
async function inupRelationshipPut (requestItem, schemaRelationship, passport, newUidsMap, graphNode) {
  const x = /** @type { td.AceMutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))

  if (requestItem.id === 'InsertRelationship') x._uid = crypto.randomUUID()

  for (const relationshipPropName in requestItem.x) {
    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, relationshipName: requestItem.relationshipName, propName: relationshipPropName }))

    if (requestItem.id === 'InsertRelationship') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { relationshipName: requestItem.relationshipName, propName: relationshipPropName })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, relationshipName: requestItem.relationshipName, propName: relationshipPropName }))) throw AceAuthError(enums.permissionActions.insert, passport, { relationshipName: requestItem.relationshipName, propName: relationshipPropName })
    }

    if (requestItem.id === 'UpdateRelationship') {
      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { relationshipName: requestItem.relationshipName, propName: relationshipPropName }, inupPermission)
      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { relationshipName: requestItem.relationshipName, propName: relationshipPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, relationshipName: requestItem.relationshipName, propName: relationshipPropName })))
    }

    const relationshipPropValue = x[relationshipPropName]

    if (relationshipPropValue === ADD_NOW_DATE && schemaRelationship.x?.props?.[relationshipPropName]?.x?.dataType === enums.dataTypes.isoString) x[relationshipPropName] = getNow() // populate now timestamp
    else if (typeof relationshipPropValue === 'string' && relationshipPropValue.startsWith(REQUEST_UID_PREFIX)) {
      overwriteUids(requestItem.x, relationshipPropName, newUidsMap)
    }
  }

  const relationshipProp = getRelationshipProp(requestItem.relationshipName)
  await addRelationshipToNode('a')
  await addRelationshipToNode('b')

  passport.cache.putMap.set(x._uid, { relationshipName: requestItem.relationshipName, x: requestItem.x }) // add relationship to graph

  const relationshipUidsKey = getRelationshipUidsKey(requestItem.relationshipName)
  const relationshipUidsArray = (await one(relationshipUidsKey, passport.cache)) || []
  const relationshipUidsSet = new Set(relationshipUidsArray)

  relationshipUidsSet.add(x._uid) // add relationship _uid to relationship index
  passport.cache.putMap.set(relationshipUidsKey, [ ...relationshipUidsSet ])


  /** @param { 'a' | 'b' } direction */
  async function addRelationshipToNode (direction) {
    if (requestItem.x[direction]) {
      const node = await one(/** @type { string } */(requestItem.x[direction]), passport.cache)

      if (!node[relationshipProp]) node[relationshipProp] = [x._uid]
      else node[relationshipProp].push(x._uid)

      passport.cache.putMap.set(node.x.uid, node)
    }
  }
}


/**
 * @param { boolean } isDifferent 
 * @param { string } deletedNodeUid 
 * @param { td.AceMutateRequestItemUpdateRelationship } requestItem 
 * @param { td.AcePassport } passport 
 */
async function updatePreviousRelationshipNode (isDifferent, deletedNodeUid, requestItem, passport) {
  if (isDifferent) {
    const relationshipNode = await one(deletedNodeUid, passport.cache)

    if (relationshipNode && requestItem.x._uid) deleteUidFromRelationshipProp(relationshipNode, getRelationshipProp(requestItem.relationshipName), requestItem.x._uid, passport)
  }
}



/**
 * @param {*} relationshipNode 
 * @param { string } prop 
 * @param { string } _uid 
 * @param { td.AcePassport } passport 
 */
function deleteUidFromRelationshipProp (relationshipNode, prop, _uid, passport) {
  if (Array.isArray(relationshipNode[prop])) {
    const relationshipName = getRelationshipNameFromProp(prop)
    const schemaPropName = passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap?.get(getNodeNamePlusRelationshipNameToNodePropNameMapKey(relationshipNode.nodeName, relationshipName))

    if (schemaPropName) validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, relationshipNode, passport, { nodeName: relationshipNode.nodeName, propName: schemaPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, nodeName: relationshipNode.nodeName, propName: schemaPropName })))

    if (relationshipNode[prop].length === 1 && relationshipNode[prop][0] === _uid) delete relationshipNode[prop]
    else {
      for (let i = 0; i < relationshipNode[prop].length; i++) {
        if (_uid === relationshipNode[prop][i]) relationshipNode[prop].splice(i, 1)
      }

      if (!relationshipNode[prop].length) delete relationshipNode[prop]
    }

    passport.cache.putMap.set(relationshipNode.x.uid, relationshipNode)
  }
}


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceSchema } schema 
 * @returns { td.AceSchema }
 */
export function addToSchema (passport, schema) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  if (schema.nodes) {
    for (const node in schema.nodes) {
      if (passport.schema?.nodes[node]) throw AceError('mutate__add-to-schema__overwrite-node', `The node \`${node}\` is already in your schema, please only include nodes in /add-to-schema that are not already in your schema`, { node })

      if (!passport.schema) passport.schema = { nodes: { [node]: schema.nodes[node] }, relationships: {} }
      else if (!passport.schema.nodes) passport.schema.nodes = { [node]: schema.nodes[node] }
      else passport.schema.nodes[node] = schema.nodes[node]
    }
  }

  if (schema.relationships) {
    for (const relationship in schema.relationships) {
      if (passport.schema?.relationships[relationship]) throw AceError('mutate__add-to-schema__overwrite-relationship', `The relationship \`${relationship}\` is already in your schema, please only include relationships in /add-to-schema that are not already in your schema`, { relationship })

      if (!passport.schema) passport.schema = { nodes: {}, relationships: { [relationship]: schema.relationships[relationship] } }
      else if (!passport.schema.relationships) passport.schema.relationships = { [relationship]: schema.relationships[relationship] }
      else passport.schema.relationships[relationship] = schema.relationships[relationship]
    }
  }

  if (!passport.schema) throw AceError('mutate__add-to-schema__invalid-schema', 'The request is failing b/c passport.schema is falsy, please pass a schema to ace()', { schema: '' })

  passport.cache.putMap.set(SCHEMA_KEY, validateSchema(passport.schema))
  setSchemaDataStructures(passport)
  return passport.schema
}

/**
 * @param { string[] } uids
 * @param { td.AcePassport } passport
 */
export async function deleteNodesByUids (uids, passport) {
  const graphNodes = await many(uids, passport.cache)

  for (const graphNode of graphNodes.values()) {
    validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { nodeName: graphNode.nodeName, relationshipName: graphNode.relationshipName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, nodeName: graphNode.nodeName, relationshipName: graphNode.relationshipName, propName: '*' })))

    const relationshipUidsArray = []

    /** @type { Map<string, { propName: string, relationshipName: string }> } <relationshipUid, { propName, relationshipName }> */
    const relationshipUidsMap = new Map()

    for (const propName in graphNode) {
      if (propName.startsWith(RELATIONSHIP_PREFIX)) {
        const relationshipName = getRelationshipNameFromProp(propName)
        const schemaPropName = passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap?.get(getNodeNamePlusRelationshipNameToNodePropNameMapKey(graphNode.nodeName, relationshipName))

        if (schemaPropName) validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { nodeName: graphNode.nodeName, propName: schemaPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, nodeName: graphNode.nodeName, propName: schemaPropName })))

        for (const relationshipUid of graphNode[propName]) {
          relationshipUidsArray.push(relationshipUid)
          relationshipUidsMap.set(relationshipUid, { propName, relationshipName })
        }
      } else if (propName !== 'uid') {
        validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { nodeName: graphNode.nodeName, propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, nodeName: graphNode.nodeName, propName })))
      }
    }

    /** @type { Map<string, string> } <relationshipNodeUid, relationshipId> */
    const relationshipNodeUids = new Map()
    const graphRelationshipsMap = await many(relationshipUidsArray, passport.cache)

    for (const graphRelationship of graphRelationshipsMap.values()) {
      if (graphRelationship.x.a === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.b, graphRelationship.x._uid)
      if (graphRelationship.x.b === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.a, graphRelationship.x._uid)
    }

    const graphRelationshipNodesMap = await many([...relationshipNodeUids.keys()], passport.cache)

    for (const graphRelationshipNode of graphRelationshipNodesMap.values()) {
      const _uid = relationshipNodeUids.get(graphRelationshipNode.x.uid)

      if (_uid) {
        const v = relationshipUidsMap.get(_uid)
        if (v?.propName) deleteUidFromRelationshipProp(graphRelationshipNode, v.propName, _uid, passport)
      }
    }

    passport.cache.deleteSet.add(graphNode.x.uid) // add request uid to the passport.cache.deleteSet

    for (const _uid of relationshipUidsArray) { // we need data from these relationships above so add to deleteSet last
      passport.cache.deleteSet.add(_uid)
      const v = relationshipUidsMap.get(_uid)
      if (v?.relationshipName) await delete_UidFromRelationshipIndex(v.relationshipName, _uid, passport)
    }
  }
}


/**
 * @param { string[] } _uids
 * @param { td.AcePassport } passport
 */
export async function deleteRelationshipsBy_Uids (_uids, passport) {
  const graphRelationships = /** @type { Map<string, td.AceGraphRelationship> }*/ (await many(_uids, passport.cache))
  const notAllowedDeleteProps = new Set(['_uid', 'a', 'b'])

  for (const graphRelationship of graphRelationships.values()) {
    validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphRelationship, passport, { relationshipName: graphRelationship.relationshipName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationshipName: graphRelationship.relationshipName, propName: '*' })))

    for (const propName in graphRelationship) {
      if (!notAllowedDeleteProps.has(propName)) validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphRelationship, passport, { relationshipName: graphRelationship.relationshipName, propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationshipName: graphRelationship.relationshipName, propName })))
    }

    await delete_UidFromRelationshipIndex(graphRelationship.relationshipName, graphRelationship.x._uid, passport)

    const relationshipNodes = await many([graphRelationship.x.a, graphRelationship.x.b], passport.cache)

    for (const relationshipNode of relationshipNodes.values()) {
      deleteUidFromRelationshipProp(relationshipNode, getRelationshipProp(graphRelationship.relationshipName), graphRelationship.x._uid, passport)
    }
  }

  _uids.forEach(_uid => passport.cache.deleteSet.add(_uid)) // add @ end b/c above we need info from this relationship
}


/**
 * @param { string } relationshipName 
 * @param { string } _uid 
 * @param { td.AcePassport } passport
 */
async function delete_UidFromRelationshipIndex (relationshipName, _uid, passport) {
  if (relationshipName) {
    const relationshipUidsKey = getRelationshipUidsKey(relationshipName)
    const relationshipUidsArray = (await one(relationshipUidsKey, passport.cache)) || []
    const relationshipUidsSet = new Set(relationshipUidsArray)

    relationshipUidsSet.delete(_uid) // remove relationship _uid from relationship index

    if (relationshipUidsSet.size) passport.cache.putMap.set(relationshipUidsKey, [ ...relationshipUidsSet ])
    else {
      passport.cache.putMap.delete(relationshipUidsKey)
      passport.cache.deleteSet.add(relationshipUidsKey)
    }
  }
}


/**
 * @param { td.AceMutateRequestItemDataDeleteNodeProps } requestItem
 * @param { td.AcePassport } passport
 */
export async function dataDeleteNodeProps (requestItem, passport) {
  if (requestItem.x?.uids?.length && requestItem.x?.props?.length) {
    const relationshipNodes = await many(requestItem.x.uids, passport.cache)

    for (const relationshipNode of relationshipNodes.values()) {
      for (const propName of requestItem.x.props) {
        if (propName !== 'uid' && !propName.startsWith(RELATIONSHIP_PREFIX) && typeof relationshipNode.x[propName] !== 'undefined') {
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, relationshipNode, passport, { nodeName: relationshipNode.nodeName, propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, nodeName: relationshipNode.nodeName, propName })))
          delete relationshipNode.x[propName]
          passport.cache.putMap.set(relationshipNode.x.uid, relationshipNode)
        }
      }
    }
  }
}


/**
 * @param { td.AceMutateRequestItemDataDeleteRelationshipProps } requestItem
 * @param { td.AcePassport } passport
 */
export async function dataDeleteRelationshipProps (requestItem, passport) {
  if (requestItem.x?._uids?.length && requestItem.x?.props?.length) {
    const notAllowedDeleteProps = new Set([ '_uid', 'a', 'b' ])
    const relationshipNodes = await many(requestItem.x._uids, passport.cache)

    for (const relationshipNode of relationshipNodes.values()) {
      for (const propName of requestItem.x.props) {
        if (!notAllowedDeleteProps.has(propName) && typeof relationshipNode.x[propName] !== 'undefined') {
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, relationshipNode, passport, { relationshipName: relationshipNode.relationshipName, propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationshipName: relationshipNode.relationshipName, propName })))
          delete relationshipNode.x[propName]
          passport.cache.putMap.set(relationshipNode.x._uid, relationshipNode)
        }
      }
    }
  }
}


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataDeleteNodes } requestItem
 * @param { td.AceFnNodeUidsMap } nodeUidsMap
 * @param { td.AcePassport } passport
 */
export async function schemaAndDataDeleteNodes (requestItem, nodeUidsMap, passport) {
  for (const requestNodeName of requestItem.x.nodes) {
    const nodeUidsKey = getNodeUidsKey(requestNodeName)
    const nodeUids = nodeUidsMap.get(requestNodeName)

    if (!nodeUids?.length) throw AceError('mutate__delete-nodes__invalid-node', `Please provide a valid nodeName, \`${requestNodeName}\` is not a valid nodeName`, { nodeName: requestNodeName, requestItem })
    if (ACE_NODE_NAMES.has(requestNodeName)) throw AceError('mutate__delete-nodes__ace-node', `Please provide a valid nodeName, \`${ requestNodeName }\` is not a valid nodeName because it is an Ace node name that is required for your graph to function optimally`, { nodeName: requestNodeName, requestItem, ACE_NODE_NAMES: [ ...ACE_NODE_NAMES.keys() ] })

    await deleteNodesByUids(nodeUids, passport)
    schemaDeleteNodes()

    passport.cache.deleteSet.add(nodeUidsKey)
    delete passport.schema?.nodes[requestNodeName]
    passport.cache.putMap.set(SCHEMA_KEY, passport.schema)
    setSchemaDataStructures(passport)

    function schemaDeleteNodes () {
      if (passport.schema) {
        /** @type { Set<string> } - As we flow through nodes, the relationships that need to be deleted will be added here */
        const deleteRelationshipSet = new Set()

        /** @type { Map<string, { schemaNodeName: string, propName: string }> } - <schemaNodeName___propName, { schemaNodeName, propName }> */
        const deletePropsMap = new Map()

        for (const schemaNodeName in passport.schema.nodes) {
          for (const propName in passport.schema.nodes[schemaNodeName]) {
            const schemaPropX = /** @type { td.AceSchemaNodeRelationshipX } */ (passport.schema.nodes[schemaNodeName][propName].x)

            if (schemaPropX?.nodeName === requestNodeName) {
              deleteRelationshipSet.add(schemaPropX.relationshipName)
              deletePropsMap.set(schemaNodeName + DELIMITER + propName, { schemaNodeName, propName })
            }
          }
        }

        for (const relationshipName of deleteRelationshipSet) {
          delete passport.schema.relationships[relationshipName]
        }

        for (const { schemaNodeName, propName } of deletePropsMap.values()) {
          delete passport.schema.nodes[schemaNodeName][propName]
        }
      }
    }
  }

  passport.cache.putMap.set(SCHEMA_KEY, passport.schema)
  setSchemaDataStructures(passport)
}
