import { td, enums } from '#ace'
import { getUid } from './getUid.js'
import { del, put } from './storage.js'
import { sign } from '../security/hash.js'
import { validateSchema } from './validateSchema.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { setSchemaDataStructures } from '../objects/AcePassport.js'
import { REQUEST_UID_PREFIX, ADD_NOW_DATE, DELIMITER, RELATIONSHIP_PREFIX, SCHEMA_KEY, getUniqueIndexKey, getNow, getRevokesKey, getNodeUidsKey, getRelationshipProp, getRelationshipUidsKey, getRelationshipNameFromProp, getNodeNamePlusRelationshipNameToNodePropNameMapKey } from '../variables.js'



/**
 * Add nodes for insert or update to putEntries
 * @param { td.AceMutateRequestItemAddNodeToGraph | td.AceMutateRequestItemUpdateGraphNode | td.AceMutateRequestItemUpsertGraphNode } requestItem 
 * @param { td.AcePassport } passport 
 * @param { td.AceFnSortIndexMap } sortIndexMap 
 * @param { { [keyName: string]: CryptoKey } } privateJWKs 
 */
export async function inupNode (requestItem, passport, sortIndexMap, privateJWKs) {
  const inupNodesArray = /** @type { [ td.AceMutateRequestItemAddNodeToGraph | td.AceMutateRequestItemUpdateGraphNode, string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate newUidsMap

  await populateInupNodesArray()
  implementInupNodesArray()

  async function populateInupNodesArray () {
    if (requestItem && passport.schemaDataStructures?.nodeNamesSet?.has(requestItem.node)) { // IF permission to write this nodeName
      const startsWithUidPrefix = typeof requestItem.x.uid === 'string' && requestItem.x.uid.startsWith(REQUEST_UID_PREFIX)
      const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, node: requestItem.node, prop: '*' }))

      let graphNode

      switch (requestItem.id) {
        case 'AddNodeToGraph':
          requestItem = /** @type { td.AceMutateRequestItemAddNodeToGraph } */ (requestItem)
          break
        case 'UpdateGraphNode':
          requestItem = /** @type { td.AceMutateRequestItemUpdateGraphNode } */(requestItem)
          break
        case 'UpsertGraphNode':
          requestItem.x.uid = getUid(passport, { uid: requestItem.x.uid })
          graphNode = await passport.storage.get(requestItem.x.uid)
          requestItem = /** @type { * } */(requestItem)

          if (graphNode) {
            requestItem.id = enums.idsAce.UpdateGraphNode 
            requestItem = /** @type { td.AceMutateRequestItemUpdateGraphNode } */(requestItem)
          } else {
            requestItem.id = enums.idsAce.AddNodeToGraph
            requestItem = /** @type { td.AceMutateRequestItemAddNodeToGraph } */(requestItem)
          }
          break
      }

      if (requestItem.id === 'AddNodeToGraph') {
        if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { node: requestItem.node })
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, node: requestItem.node, prop: '*' }))) throw AceAuthError(enums.permissionActions.insert, passport, { node: requestItem.node })
      }


      if (requestItem.id === 'UpdateGraphNode') {
        if (!graphNode) {
          requestItem.x.uid = getUid(passport, { uid: requestItem.x.uid })
          graphNode = await passport.storage.get(requestItem.x.uid)
        }

        if (!graphNode) throw AceError('mutate__invalid-update-uid', `Please pass a request item uid that is a uid defined in your graph, the uid \`${ requestItem.x.uid }\` is not defined in your graph`, { requestItem })
        if (graphNode.node !== requestItem.node) throw AceError('mutate__invalid-update-nodeName', `Please pass a request item uid that is a uid defined in your graph with a matching graphNode.node: \`${ graphNode.node }\`and requestItem.node: \`${ requestItem.node }\``, { requestItem, graphNodeName: graphNode.node })

        validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { node: requestItem.node }, inupPermission)
        validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { node: requestItem.node }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, node: requestItem.node, prop: '*' })))

        for (const propName in graphNode) {
          if (propName.startsWith(RELATIONSHIP_PREFIX)) { // transfer all $r from graphNode into requestItem
            /** @type { td.AceMutateRequestItemNodeWithRelationships } */(requestItem)[propName] = graphNode[propName]
          }
        }

        requestItem.x = { ...graphNode.x, ...requestItem.x } // transfer additional graphNode.x props into requestItem.x
      }

      let graphUid

      if (requestItem.id === 'UpdateGraphNode') graphUid = requestItem.x.uid
      else {
        if (requestItem.x.uid && startsWithUidPrefix) graphUid = getGraphUidAndAddToMapUids(requestItem.x.uid, startsWithUidPrefix)
        else if (!requestItem.x.uid) requestItem.x.uid = graphUid = crypto.randomUUID()
        else graphUid = String(requestItem.x.uid)

        const nodeUids = await passport.storage.get(getNodeUidsKey(requestItem.node)) || []

        nodeUids.push(graphUid)
        put(getNodeUidsKey(requestItem.node), nodeUids, passport)
      }

      for (const nodePropName in requestItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
        const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, node: requestItem.id, prop: nodePropName }))

        if (requestItem.id === 'AddNodeToGraph') {
          if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { node: requestItem.node, prop: nodePropName })
          if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, node: requestItem.node, prop: nodePropName }))) throw AceAuthError(enums.permissionActions.insert, passport, { node: requestItem.node, prop: nodePropName })
        }

        if (requestItem.id === 'UpdateGraphNode') {
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { node: requestItem.node, prop: nodePropName }, inupPermission)
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { node: requestItem.node, prop: nodePropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, node: requestItem.node, prop: nodePropName })))
        }

        const requestItemX = /** @type { { [k: string]: any } } */ (requestItem.x)
        const nodePropValue = requestItemX[nodePropName]
        const schemaProp = /** @type { td.AceSchemaProp } */ (passport.schema?.nodes?.[requestItem.node][nodePropName])

        if (nodePropName !== '$o' && nodePropName !== 'uid') {
          if (schemaProp?.id !== 'Prop') throw AceError('mutate__invalid-schema-prop', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because it is not defined in your schema`, { requestItem, nodePropName })

          const _errorData = { schemaProp, requestItem, nodePropName, nodePropValue }

          if (schemaProp.x.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw AceError('mutate__invalid-property-value__isoString', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
          if (schemaProp.x.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw AceError('mutate__invalid-property-value__isoString', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
          if (schemaProp.x.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw AceError('mutate__invalid-property-value__number', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "number", the request typeof must be a "number"`, _errorData)
          if (schemaProp.x.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw AceError('mutate__invalid-property-value__boolean', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because when the schema property data type is "boolean", the request typeof must be a "boolean"`, _errorData)

          if (schemaProp.x.dataType === enums.dataTypes.hash) {
            const jwkName = requestItem.x.$o?.privateJWK

            if (!jwkName) throw AceError('mutate__falsy-options-private-jwk', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because requestItem.x.$o does not have a PrivateJWK. Example: requestItem.$o: [ { id: 'PrivateJWK', x: { name: 'password' } } ]`, _errorData)
            if (!privateJWKs?.[jwkName]) throw AceError('mutate__falsy-request-item-private-jwk', `The node name ${ requestItem.node } with the prop name ${ nodePropName } is invalid because requestItem.x.$o[PrivateJWK].name does not align with any request.privateJWKs. Names must align.`, _errorData)

            requestItemX[nodePropName] = await sign(privateJWKs[jwkName], nodePropValue)
          }

          if (schemaProp.x.uniqueIndex) put(getUniqueIndexKey(requestItem.node, nodePropName, nodePropValue), graphUid, passport)

          if (schemaProp.x.sortIndex) {
            const key = requestItem.node + DELIMITER + nodePropName
            const value = sortIndexMap.get(key) || { nodeName: requestItem.node, nodePropName, uids: /** @type { string[] } */ ([]) }

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
        overwriteUids(requestItem.x, requestItemKey, passport)
      }

      /** @type { { [k:string]: any } } - The request item that will be added to the graph - No id prop */
      let graphRequestItem = {}

      for (const key in requestItem) {
        if (key !== 'id') graphRequestItem[key] = /** @type { td.AceMutateRequestItemNodeWithRelationships } */(requestItem)[key]
      }

      put(graphUid, graphRequestItem, passport) // The entries we will put
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

    if (typeof insertUid !== 'string') throw AceError('mutate__uid-invalid-type', `The uid ${ insertUid } is invalid because the type is not string, please include only typeof "string" for each uid`, { uid: insertUid })

    if (!startsWithUidPrefix) graphUid = insertUid
    else {
      if (passport.$aceDataStructures.newUids.get(insertUid)) throw AceError('mutate__duplicate-uid', `The uid ${ insertUid } is invalid because it is included as a uid for multiple nodes, please do not include duplicate uids for insert`, { uid: insertUid })

      graphUid = crypto.randomUUID()
      passport.$aceDataStructures.newUids.set(insertUid, graphUid)
    }

    return graphUid
  }
}


/**
 * Insert / Update Relationships
 * @param { td.AceMutateRequestItemAddRelationshipToGraph | td.AceMutateRequestItemUpdateGraphRelationship | td.AceMutateRequestItemUpsertGraphRelationship } requestItem 
 * @param { td.AcePassport } passport 
 */
export async function inupRelationship (requestItem, passport) {
  if (requestItem && passport.schemaDataStructures?.relationshipNamesSet?.has(requestItem.relationship)) {
    const schemaRelationship = passport.schema?.relationships?.[requestItem.relationship]

    if (!schemaRelationship) throw AceError('mutate__unknown-relationship-name', `The relationship name \`${requestItem.relationship}\` is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: requestItem.relationship })

    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, relationship: requestItem.relationship, prop: '*' }))

    let graphNode

    switch (requestItem.id) {
      case 'AddRelationshipToGraph':
        requestItem = /** @type { td.AceMutateRequestItemAddRelationshipToGraph } */ (requestItem)
        break
      case 'UpdateGraphRelationship':
        requestItem = /** @type { td.AceMutateRequestItemUpdateGraphRelationship } */(requestItem)
        break
      case 'UpsertGraphRelationship':
        requestItem.x._uid = getUid(passport, { uid: requestItem.x._uid })
        graphNode = await passport.storage.get(requestItem.x._uid)
        requestItem = /** @type { * } */(requestItem)

        if (graphNode) {
          requestItem.id = enums.idsAce.UpdateGraphRelationship
          requestItem = /** @type { td.AceMutateRequestItemUpdateGraphRelationship } */(requestItem)
        } else {
          requestItem.id = enums.idsAce.AddRelationshipToGraph
          requestItem = /** @type { td.AceMutateRequestItemAddRelationshipToGraph } */(requestItem)
        }
        break
    }

    if (requestItem.id === 'AddRelationshipToGraph') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { relationship: requestItem.relationship })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, relationship: requestItem.relationship, prop: '*' }))) throw AceAuthError(enums.permissionActions.insert, passport, { relationship: requestItem.relationship })
    }

    if (requestItem.id === 'UpdateGraphRelationship') {
      if (!graphNode) graphNode = await passport.storage.get(requestItem.x._uid)

      if (!graphNode) throw AceError('mutate__invalid-update-uid', `Please pass a request item _uid that is a _uid defined in your graph, the _uid \`${ requestItem.x._uid } \` is not defined in your graph`, { requestItem })
      if (graphNode.relationship !== requestItem.relationship) throw AceError('mutate__invalid-update-relationshipName', `Please pass a request item _uid that is a _uid defined in your graph with a matching graphNode.relationship: \`${graphNode.relationship}\`,  and requestItem.relationship: \`${ requestItem.relationship }\``, { requestItem, graphNodeRelationship: graphNode.relationship })

      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { relationship: requestItem.relationship }, inupPermission)
      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { relationship: requestItem.relationship }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, relationship: requestItem.relationship, prop: '*' })))

      const aIsDifferent = graphNode.x.a !== requestItem.x.a
      const bIsDifferent = graphNode.x.b !== requestItem.x.b

      if (aIsDifferent) updatePreviousRelationshipNode(aIsDifferent, graphNode.a, passport, requestItem)
      if (bIsDifferent) updatePreviousRelationshipNode(bIsDifferent, graphNode.b, passport, requestItem)

      requestItem.x = { ...graphNode.x, ...requestItem.x }
    }

    await inupRelationshipPut(requestItem, schemaRelationship, passport, graphNode)
  }
}


/**
 * @param { boolean } isDifferent 
 * @param { string } deletedNodeUid 
 * @param { td.AcePassport } passport 
 * @param { td.AceMutateRequestItemUpdateGraphRelationship } requestItem 
 */
async function updatePreviousRelationshipNode (isDifferent, deletedNodeUid, passport, requestItem) {
  if (isDifferent) {
    const relationshipNode = await passport.storage.get(deletedNodeUid)

    if (relationshipNode && requestItem.x._uid) deleteUidFromRelationshipProp(relationshipNode, getRelationshipProp(requestItem.relationship), requestItem.x._uid, passport)
  }
}

/**
 * @param { td.AceMutateRequestItemAddRelationshipToGraphX } x
 * @param { string | number } requestItemKey
 * @param { td.AcePassport } passport
 */
function overwriteUids (x, requestItemKey, passport) {
  const requestItemValue = x[requestItemKey]

  if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
    const graphUid = passport.$aceDataStructures.newUids.get(requestItemValue)

    if (graphUid) x[requestItemKey] = graphUid
    else throw AceError('mutate__invalid-uid', `The uid ${ requestItemValue } is invalid b/c each uid, with an Ace uid prefix, must be defined in a node`, { uid: requestItemValue })
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
 * @param { td.AceMutateRequestItemAddRelationshipToGraph | td.AceMutateRequestItemUpdateGraphRelationship } requestItem 
 * @param { any } schemaRelationship 
 * @param { td.AcePassport } passport 
 * @param { any } [ graphNode ] 
 */
async function inupRelationshipPut (requestItem, schemaRelationship, passport, graphNode) {
  const x = /** @type { td.AceMutateRequestItemAddRelationshipToGraphX } */ (/** @type {*} */ (requestItem.x))

  if (requestItem.id === 'AddRelationshipToGraph') x._uid = crypto.randomUUID()

  for (const relationshipPropName in requestItem.x) {
    const inupPermission = passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.inup, relationship: requestItem.relationship, prop: relationshipPropName }))

    if (requestItem.id === 'AddRelationshipToGraph') {
      if (inupPermission) throw AceAuthError(enums.permissionActions.inup, passport, { relationship: requestItem.relationship, prop: relationshipPropName })
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.insert, relationship: requestItem.relationship, prop: relationshipPropName }))) throw AceAuthError(enums.permissionActions.insert, passport, { relationship: requestItem.relationship, prop: relationshipPropName })
    }

    if (requestItem.id === 'UpdateGraphRelationship') {
      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.inup, graphNode, passport, { relationship: requestItem.relationship, prop: relationshipPropName }, inupPermission)
      validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.update, graphNode, passport, { relationship: requestItem.relationship, prop: relationshipPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.update, relationship: requestItem.relationship, prop: relationshipPropName })))
    }

    const relationshipPropValue = x[relationshipPropName]

    if (relationshipPropValue === ADD_NOW_DATE && schemaRelationship.props?.[relationshipPropName]?.x?.dataType === enums.dataTypes.isoString) x[relationshipPropName] = getNow() // populate now timestamp
    else if (typeof relationshipPropValue === 'string' && relationshipPropValue.startsWith(REQUEST_UID_PREFIX)) {
      overwriteUids(requestItem.x, relationshipPropName, passport)
    }
  }

  const relationshipProp = getRelationshipProp(requestItem.relationship)
  await addRelationshipToNode('a')
  await addRelationshipToNode('b')

  put(x._uid, { relationship: requestItem.relationship, x: requestItem.x }, passport) // add relationship to graph

  const relationshipUidsKey = getRelationshipUidsKey(requestItem.relationship)
  const relationshipUidsArray = (await passport.storage.get(relationshipUidsKey)) || []
  const relationshipUidsSet = new Set(relationshipUidsArray)

  relationshipUidsSet.add(x._uid) // add relationship _uid to relationship index
  put(relationshipUidsKey, [ ...relationshipUidsSet ], passport)


  /** @param { 'a' | 'b' } direction */
  async function addRelationshipToNode (direction) {
    if (requestItem.x[direction]) {
      const node = await passport.storage.get(/** @type { string } */(requestItem.x[direction]))

      if (!node?.[relationshipProp]) node[relationshipProp] = [x._uid]
      else node[relationshipProp].push(x._uid)

      put(node.x.uid, node, passport)
    }
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
    const schemaPropName = passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap?.get(getNodeNamePlusRelationshipNameToNodePropNameMapKey(relationshipNode.node, relationshipName))

    if (schemaPropName) validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, relationshipNode, passport, { node: relationshipNode.node, prop: schemaPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: relationshipNode.node, prop: schemaPropName })))

    if (relationshipNode[prop].length === 1 && relationshipNode[prop][0] === _uid) delete relationshipNode[prop]
    else {
      for (let i = 0; i < relationshipNode[prop].length; i++) {
        if (_uid === relationshipNode[prop][i]) relationshipNode[prop].splice(i, 1)
      }

      if (!relationshipNode[prop].length) delete relationshipNode[prop]
    }

    put(relationshipNode.x.uid, relationshipNode, passport)
  }
}


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceSchema } schema 
 * @returns { td.AceSchema }
 */
export function addToSchema (passport, schema) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  validateSchema(schema)

  if (schema.nodes) {
    for (const node in schema.nodes) {
      if (!passport.schema) passport.schema = { nodes: { [node]: schema.nodes[node] }, relationships: {} }
      else if (!passport.schema.nodes) passport.schema.nodes = { [node]: schema.nodes[node] }
      else if (passport.schema.nodes[node]) passport.schema.nodes[node] = { ...passport.schema.nodes[node], ...schema.nodes[node] }
      else passport.schema.nodes[node] = schema.nodes[node]
    }
  }

  if (schema.relationships) {
    for (const relationship in schema.relationships) {
      if (!passport.schema) passport.schema = { nodes: {}, relationships: { [relationship]: schema.relationships[relationship] } }
      else if (!passport.schema.relationships) passport.schema.relationships = { [relationship]: schema.relationships[relationship] }
      else if (passport.schema.relationships[relationship]) passport.schema.relationships[relationship] = { ...passport.schema.relationships[relationship], ...schema.relationships[relationship] }
      else passport.schema.relationships[relationship] = schema.relationships[relationship]
    }
  }

  if (!passport.schema) throw AceError('mutate__add-to-schema__invalid-schema', 'The request is failing b/c passport.schema is falsy, please pass a schema to ace()', { schema: '' })

  put(SCHEMA_KEY, validateSchema(passport.schema), passport)
  setSchemaDataStructures(passport)
  return passport.schema
}


/**
 * @param { string[] } uids
 * @param { td.AcePassport } passport
 */
export async function deleteNodesByUids (uids, passport) {
  const graphNodes = await passport.storage.get(uids)

  for (const graphNode of graphNodes.values()) {
    validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, relationship: graphNode.relationship }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, relationship: graphNode.relationship, prop: '*' })))

    const relationshipUidsArray = []

    /** @type { Map<string, { propName: string, relationshipName: string, cascade: boolean }> } <relationshipUid, { propName, relationshipName }> */
    const relationshipUidsMap = new Map()

    for (const propName in graphNode) {
      if (propName.startsWith(RELATIONSHIP_PREFIX)) {
        const relationshipName = getRelationshipNameFromProp(propName)
        const schemaPropName = passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap?.get(getNodeNamePlusRelationshipNameToNodePropNameMapKey(graphNode.node, relationshipName))

        if (schemaPropName) validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop: schemaPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop: schemaPropName })))

        const cascade = schemaPropName ? (passport.schemaDataStructures?.cascade?.get(graphNode.node)?.has(schemaPropName) || false) : false

        for (const relationshipUid of graphNode[propName]) {
          relationshipUidsArray.push(relationshipUid)
          relationshipUidsMap.set(relationshipUid, { propName, relationshipName, cascade })
        }
      } else if (propName !== 'uid') {
        validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop: propName })))
      }
    }

    const nodeUidsKey = getNodeUidsKey(graphNode.node)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (Array.isArray(nodeUids)) {
      for (let i = nodeUids.length - 1; i >= 0; i--) {
        if (nodeUids[i] === graphNode.x.uid) {
          nodeUids.splice(i, 1)
          break
        }
      }
    }
    
    put(nodeUidsKey, nodeUids, passport) // delete uid from $index___nodes___

    /** @type { Map<string, string> } <relationshipNodeUid, relationshipId> */
    const relationshipNodeUids = new Map()
    const graphRelationshipsMap = await passport.storage.get(relationshipUidsArray)

    for (const graphRelationship of graphRelationshipsMap.values()) {
      if (graphRelationship.x.a === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.b, graphRelationship.x._uid)
      if (graphRelationship.x.b === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.a, graphRelationship.x._uid)
    }

    const cascadeUids = []
    const graphRelationshipNodesMap = await passport.storage.get([...relationshipNodeUids.keys()])

    for (const graphRelationshipNode of graphRelationshipNodesMap.values()) {
      const _uid = relationshipNodeUids.get(graphRelationshipNode.x.uid)

      if (_uid) {
        const v = relationshipUidsMap.get(_uid)

        if (v) {
          if (v.cascade) cascadeUids.push(graphRelationshipNode.x.uid)
          else if (v.propName) deleteUidFromRelationshipProp(graphRelationshipNode, v.propName, _uid, passport)
        }
      }
    }

    del(graphNode.x.uid, passport)

    for (const _uid of relationshipUidsArray) {
      del(_uid, passport)
      const v = relationshipUidsMap.get(_uid)
      if (v?.relationshipName) await delete_UidFromRelationshipIndex(v.relationshipName, _uid, passport)
    }

    if (cascadeUids.length) await deleteNodesByUids(cascadeUids, passport) // delete uids that are cascade
  }
}


/**
 * @param { string[] } _uids
 * @param { td.AcePassport } passport
 */
export async function deleteRelationshipsBy_Uids (_uids, passport) {
  const graphRelationships = /** @type { Map<string, td.AceGraphRelationship> }*/ (await passport.storage.get(_uids))
  const notAllowedDeleteProps = new Set(['_uid', 'a', 'b'])

  for (const graphRelationship of graphRelationships.values()) {
    validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphRelationship, passport, { relationship: graphRelationship.relationship }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationship: graphRelationship.relationship, prop: '*' })))

    for (const propName in graphRelationship) {
      if (!notAllowedDeleteProps.has(propName)) validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphRelationship, passport, { relationship: graphRelationship.relationship, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationship: graphRelationship.relationship, prop: propName })))
    }

    await delete_UidFromRelationshipIndex(graphRelationship.relationship, graphRelationship.x._uid, passport)

    const relationshipNodes = await passport.storage.get([graphRelationship.x.a, graphRelationship.x.b])

    for (const relationshipNode of relationshipNodes.values()) {
      deleteUidFromRelationshipProp(relationshipNode, getRelationshipProp(graphRelationship.relationship), graphRelationship.x._uid, passport)
    }
  }

  _uids.forEach(_uid => del(_uid, passport)) // add @ end b/c above we need info from this relationship
}


/**
 * @param { string } relationshipName 
 * @param { string } _uid 
 * @param { td.AcePassport } passport
 */
async function delete_UidFromRelationshipIndex (relationshipName, _uid, passport) {
  if (relationshipName) {
    const relationshipUidsKey = getRelationshipUidsKey(relationshipName)
    const relationshipUidsArray = (await passport.storage.get(relationshipUidsKey)) || []
    const relationshipUidsSet = new Set(relationshipUidsArray)

    relationshipUidsSet.delete(_uid) // remove relationship _uid from relationship index

    if (relationshipUidsSet.size) put(relationshipUidsKey, [ ...relationshipUidsSet ], passport)
    else del(relationshipUidsKey, passport)
  }
}


/**
 * @param { td.AceMutateRequestItemDataDeleteNodeProps } requestItem
 * @param { td.AcePassport } passport
 */
export async function dataDeleteNodeProps (requestItem, passport) {
  if (requestItem.x?.uids?.length && requestItem.x?.props?.length) {
    const graphNodes = await passport.storage.get(requestItem.x.uids)

    for (const [ uid, graphNode ] of graphNodes) {
      for (const propName of requestItem.x.props) {
        if (typeof graphNode.x[propName] !== 'undefined') {
          if (!passport.schema?.nodes[graphNode.node]?.[propName]) throw AceError('dataDeleteNodeProps__invalidNodePropCombo', 'The node and the prop cannot be deleted b/c they are not defined in you schema', { node: graphNode.node, prop: propName })

          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop: propName })))
          delete graphNode.x[propName]
          put(uid, graphNode, passport)
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
    const relationshipNodes = await passport.storage.get(requestItem.x._uids)

    for (const relationshipNode of relationshipNodes.values()) {
      for (const propName of requestItem.x.props) {
        if (typeof relationshipNode.x[propName] !== 'undefined') {
          if (!passport.schema?.relationships[relationshipNode.x.relationship]?.props?.[propName]) throw AceError('dataDeleteRelationshipProps__invalidRelationshipPropCombo', 'The relationship and the prop cannot be deleted b/c they are not defined in you schema', { relationship: relationshipNode.x.relationship, prop: propName })

          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, relationshipNode, passport, { relationship: relationshipNode.relationshipName, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationship: relationshipNode.relationshipName, prop: propName })))
          delete relationshipNode.x[propName]
          put(relationshipNode.x._uid, relationshipNode, passport)
        }
      }
    }
  }
}


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataDeleteNodes } requestItem
 * @param { td.AcePassport } passport
 */
export async function schemaAndDataDeleteNodes (requestItem, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const requestNodeName of requestItem.x.nodes) {
    const nodeUidsKey = getNodeUidsKey(requestNodeName)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids?.length) {
      await deleteNodesByUids(nodeUids, passport)
      del(nodeUidsKey, passport)
    }

    schemaDeleteNodes(requestNodeName, passport)
    delete passport.schema?.nodes[requestNodeName]
  }

  schemaDeleteConclude(passport)
}


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataDeleteNodesNode } requestNodeName
 * @param { td.AcePassport } passport
 */

function schemaDeleteNodes (requestNodeName, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  if (passport.schema) {
    /** @type { Set<string> } - As we flow through nodes, the relationships that need to be deleted will be added here */
    const deleteRelationshipSet = new Set()

    /** @type { Map<string, { schemaNodeName: string, propName: string }> } - <schemaNodeName___propName, { schemaNodeName, propName }> */
    const deletePropsMap = new Map()

    for (const schemaNodeName in passport.schema.nodes) {
      for (const propName in passport.schema.nodes[schemaNodeName]) {
        const schemaPropX = /** @type { td.AceSchemaNodeRelationshipX } */ (passport.schema.nodes[schemaNodeName][propName].x)

        if (schemaPropX?.node === requestNodeName) {
          deleteRelationshipSet.add(schemaPropX.relationship)
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


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataDeleteNodeProps } requestItem
 * @param { td.AcePassport } passport
 */
export async function schemaAndDataDeleteNodeProps (requestItem, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { node, prop } of requestItem.x.props) {
    if (!passport.schema?.nodes[node]?.[prop]) throw AceError('schemaAndDataDeleteNodeProps__invalidNodePropCombo', 'The node and the prop cannot be deleted b/c they are are not defined in you schema', { node, prop })

    const nodeUidsKey = getNodeUidsKey(node)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids.length) {
      const graphNodes = await passport.storage.get(nodeUids)

      for (const [ uid, graphNode ] of graphNodes) {
        if (typeof graphNode.x[prop] !== 'undefined') {
          validateUpdateOrDeleteBasedOnPermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop })))
          delete graphNode.x[prop]
          put(uid, graphNode, passport)
        }
      }
    }

    delete passport.schema.nodes[node][prop]
    schemaDeleteConclude(passport)
  }
}


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataUpdateNameOfNodes } requestItem
 * @param { td.AcePassport } passport
 */
export async function schemaAndDataUpdateNameOfNodes (requestItem, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { nowName, newName } of requestItem.x.nodes) {
    if (!passport.schema?.nodes[nowName]) throw AceError('schemaAndDataUpdateNameOfNodes__invalidNowName', 'The node cannot be renamed b/c it is not defined in you schema', { nowName, newName })

    // update node on each graphNode
    const nodeUidsKey = getNodeUidsKey(nowName)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids.length) {
      const graphNodes = await passport.storage.get(nodeUids)

      for (const [ uid, graphNode ] of graphNodes) {
        graphNode.node = newName
        put(uid, graphNode, passport)
      }
    }


    // update nodeUidsKey
    const newNodeUidsKey = getNodeUidsKey(newName)
    put(newNodeUidsKey, nodeUids, passport)
    del(nodeUidsKey, passport)


    // update schema
    const nodeRelationshipPropsSet = passport.schemaDataStructures?.nodeRelationshipPropsMap?.get(nowName)

    if (nodeRelationshipPropsSet) {
      for (const pointer of nodeRelationshipPropsSet) {
        const split = pointer.split(DELIMITER)

        if (split.length !== 2) throw AceError('schemaAndDataUpdateNameOfNodes__invalidSplit', 'Split should have a length of 2, the first index should be a node name and the second should be a relationship prop name', { split })

        /** @type { * } */
        let x = passport.schema.nodes[split[0]][split[1]].x

        if (x.node !== nowName) throw AceError('schemaAndDataUpdateNameOfNodes__invalidNode', 'The x.node should equal the nowName', { xDotNode: x.node, nowName })

        /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */
        x = x

        x.node = newName
        passport.schema.nodes[newName] = passport.schema.nodes[nowName]
        delete passport.schema.nodes[nowName]
      }
    }

    schemaDeleteConclude(passport)
  }
}


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataUpdateNameOfNodeProps } requestItem
 * @param { td.AcePassport } passport
 */
export async function schemaAndDataUpdateNameOfNodeProps (requestItem, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { node, nowName, newName } of requestItem.x.props) {
    if (!passport.schema?.nodes[node]) throw AceError('schemaAndDataUpdateNameOfNodes__invalidNode', `The prop cannot be renamed b/c the node ${node} it is not defined in you schema`, { node, nowName, newName })
    if (!passport.schema?.nodes[node]?.[nowName]) throw AceError('schemaAndDataUpdateNameOfNodes__invalidProp', `The prop cannot be renamed b/c the node ${ node } and the prop ${ nowName } is not defined in you schema`, { node, nowName, newName })

    // update prop on each graphNode
    const nodeUidsKey = getNodeUidsKey(node)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids.length) {
      const graphNodes = await passport.storage.get(nodeUids)

      for (const [ uid, graphNode ] of graphNodes) {
        if (typeof graphNode.x[nowName] !== 'undefined') {
          graphNode.x[newName] = graphNode.x[nowName]
          delete graphNode.x[nowName]
          put(uid, graphNode, passport)
        }
      }
    }

    // update schema
    passport.schema.nodes[node][newName] = passport.schema.nodes[node][nowName]
    delete passport.schema.nodes[node][nowName]
    schemaDeleteConclude(passport)
  }
}


/** 
 * @param { td.AceMutateRequestItemSchemaAndDataUpdateNameOfRelationships } requestItem
 * @param { td.AcePassport } passport
 */
export async function schemaAndDataUpdateNameOfRelationships (requestItem, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { nowName, newName } of requestItem.x.relationships) {
    if (!passport.schema?.relationships[nowName]) throw AceError('schemaAndDataUpdateNameOfRelationships__invalidNowName', 'The relationship cannot be renamed b/c it is not defined in you schema', { nowName, newName })

    // update relationship on each graphRelationship
    const relationshipUidsKey = getRelationshipUidsKey(nowName)
    const relationshipUids = await passport.storage.get(relationshipUidsKey)

    if (relationshipUids.length) {
      const graphNodeUids = [] // put a and b node uids here
      const graphRelationships = await passport.storage.get(relationshipUids)

      // update graphRelationship.relationship
      for (const [ uid, graphRelationship ] of graphRelationships) {
        graphRelationship.relationship = newName
        put(uid, graphRelationship, passport)
        graphNodeUids.push(graphRelationship.x.a)
        graphNodeUids.push(graphRelationship.x.b)
      }

      const graphNodes = await passport.storage.get(graphNodeUids)
      const nowRelationshipProp = getRelationshipProp(nowName)
      const newRelationshipProp = getRelationshipProp(newName)

      // update graphNode.$r__[ nowName ]
      for (const [ uid, graphNode ] of graphNodes) {
        if (graphNode[nowRelationshipProp]) {
          graphNode[newRelationshipProp] = graphNode[nowRelationshipProp]
          delete graphNode[nowRelationshipProp]
          put(uid, graphNode, passport)
        }
      }
    }

    // update relationshipUidsKey
    const newRelationshipUidsKey = getRelationshipUidsKey(newName)
    put(newRelationshipUidsKey, relationshipUids, passport)
    del(relationshipUidsKey, passport)

    // update schema relationship
    passport.schema.relationships[newName] = passport.schema.relationships[nowName]
    delete passport.schema.relationships[nowName]

    // update schema node props
    const relationshipNodeProps = passport.schemaDataStructures?.relationshipPropsMap?.get(nowName)

    if (relationshipNodeProps) {
      for (const [ propName, { propNode, propValue } ] of relationshipNodeProps) {
        propValue.x.relationship = newName
        passport.schema.nodes[propNode][propName] = propValue
      }
    }

    schemaDeleteConclude(passport)
  }
}


/**
 * @param { td.AcePassport } passport
 * @returns { void }
 */
function schemaDeleteConclude (passport) {
  if (passport.schema) {
    validateSchema(passport.schema)
    put(SCHEMA_KEY, passport.schema, passport)
    setSchemaDataStructures(passport)
  }
}
