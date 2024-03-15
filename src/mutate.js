import { sign } from './hash.js'
import { error } from './throw.js'
import { start } from './start.js'
import { td, enums } from '#manifest'
import { Passport } from './Passport.js'
import { aceFetch } from './aceFetch.js'
import { validateSchema } from './schema.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { REQUEST_UID_PREFIX, NODE_UIDS_KEY, ADD_NOW_DATE, DELIMITER, getUniqueIndexKey, getSortIndexKey, getRelationshipProp, getNow, getRevokesKey, RELATIONSHIP_PREFIX, SCHEMA_KEY } from './variables.js'



/**
 * Mutate Ace Graph Database
 * @param { td.AceCore } core
 * @param { td.MutateRequest } request
 * @returns { Promise<td.MutateResponse> }
 */
export async function mutate (core, request) {
  return aceFetch(core, enums.pathnames.mutate, { body: { request, privateJWKs: core.privateJWKs } })
}


/**
 * Mutate Ace Graph Database
 * @param { Passport } passport
 * @param { { request: td.MutateRequest, privateJWKs?: { [keyName: string]: string } } } body - Mutation request
 * @returns { Promise<td.MutateResponse> }
*/
export async function _mutate (passport, body) {
  return passport.tsa(async () => {
    /** @type { { [nodeName: string]: string[] } } - Uids of all nodes in graph  */
    const allNodeUids = (await passport.storage.get(NODE_UIDS_KEY)) || {}

    /** @type { MustPropsMap } - Map of props in schema that must be defined */
    const mustPropsMap = getMustPropMap()

    /** @type { Set<string> } - Set of all node names in schema */
    const nodeNamesSet = new Set(Object.keys(passport.schema?.nodes || {}))

    /** @type { Set<string> } - Set of all relationships in schema */
    const relationshipNamesSet = new Set(Object.keys(passport.schema?.relationships || {}))

    /** @type { Map<string, string> } - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value. */
    const mapUids = new Map()

    /** @type { Map<string, { nodeName: string, nodePropName: string, uids: string[] }> } - As we find properties that according to the schema need a sort index insert we will keep track of them here. Once we get them all together, we sort them, and then add to graph. */
    const sortIndexMap = new Map()

    /** @type { Map<string, any> } - The entries we will put */
    const putEntries = new Map()

    /** @type { Set<string> } - The set of uids we will delete (delete) */
    const deleteSet = new Set()

    /** @type { string[] } - The deleteSet converted into an array */
    const deleteArray = []

    /** @type { { [key: string]: CryptoKey } } - Object that converts stringified jwks into CryptoKey's */
    const privateJWKs = {}

    /** @type { { nodes: any, relationships: any } } - If updating we store the orignal items here, based on the uid (nodes) or _uid (relationships)  */
    const updateRequestItems = { nodes: null, relationships: null }

    /** @typedef { Map<string, Map<string, (td.SchemaProp | td.SchemaRelationshipProp | td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp)>> } MustPropsMap */

    /** @type { td.MutateRequestItem[] } Request as an array */
    const request = Array.isArray(body.request) ? body.request : [ body.request ]

    await setPrivateJWKs()
    await setUpdateRequestItems()
    await deligate()
    throwIfMissingMustProps()
    await addSortIndicesToGraph()
    return conclude()


    async function setPrivateJWKs () {
      if (body.privateJWKs) {
        for (const name in body.privateJWKs) {
          privateJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(body.privateJWKs[name]), getAlgorithmOptions('import'), true, ['sign'])
        }
      }
    }


    async function setUpdateRequestItems () {
      if (request) {
        const nodeUids = []
        const relationshipUids = []

        for (let i = 0; i < request.length; i++) {
          if (request[i].id === enums.idsMutate.UpdateNode) {
            nodeUids.push(/** @type { td.MutateRequestItemUpdateNode } */(request[i]).x.uid)
          }

          if (request[i].id === enums.idsMutate.UpdateRelationship) {
            relationshipUids.push(/** @type { td.MutateRequestItemUpdateRelationship } */(request[i]).x._uid)
          }
        }

        if (nodeUids.length) updateRequestItems.nodes = await passport.storage.get(nodeUids)
        if (relationshipUids.length) updateRequestItems.relationships = await passport.storage.get(relationshipUids)
      }
    }


    async function deligate () {
      for (const requestItem of request) {
        switch (requestItem.id) {
          case enums.idsMutate.Start:
            await start(passport)
            break
          case enums.idsMutate.Restart:
            await restart()
            break
          case enums.idsMutate.SchemaAddition:
            await schemaAdditions(requestItem)
            break
          case enums.idsMutate.InsertNode:
          case enums.idsMutate.UpdateNode:
            await inupNodes(requestItem)
            break
          case enums.idsMutate.InsertRelationship:
          case enums.idsMutate.UpdateRelationship:
            await inupRelationships(requestItem)
            break
          case enums.idsMutate.DataDeleteNodes:
          case enums.idsMutate.DataDeleteNodeProps:
          case enums.idsMutate.DataDeleteRelationships:
            await _delete(requestItem)
            break
          case enums.idsMutate.SchemaAndDataDeleteNodes:
            await schema(requestItem)
            break
        }
      }

      if (deleteSet.size) {
        deleteSet.forEach(uid => deleteArray.push(uid))
        await passport.storage.delete(deleteArray)
      }


      async function restart () {
        passport.revokesAcePermissions?.forEach((value) => {
          if (value.action === 'write' && value.schema === true) throw error('auth__write-schema', `Because write permissions to the schema is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          if (value.action === 'write' && value.nodeName) throw error('auth__write-node', `Because write permissions to the node name \`${value.nodeName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          if (value.action === 'write' && value.relationshipName) throw error('auth__write-node', `Because write permissions to the relationship name \`${value.relationshipName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
        })

        await passport.storage.deleteAll()
        passport.schema = undefined
        await start(passport)
      }


      /**
       * @param { td.MutateRequestItemSchemaAndDataDeleteNodes } requestItem 
       */
      async function schema (requestItem) {
        switch (requestItem.id) {
          case enums.idsMutate.SchemaAndDataDeleteNodes:
            for (const requestNodeName of requestItem.x.nodes) {
              const nodeUids = allNodeUids[requestNodeName]

              if (!nodeUids?.length) throw error('mutate__delete-nodes__invalid-node', `Please provide a valid nodeName, \`${ requestNodeName }\` is not a valid nodeName`, { nodeName: requestNodeName, requestItem })

              await deleteByUids(nodeUids)
              schemaDeleteNodes()

              delete allNodeUids[requestNodeName]
              putEntries.set(NODE_UIDS_KEY, allNodeUids)

              delete passport.schema?.nodes[requestNodeName]

              function schemaDeleteNodes () {
                if (passport.schema) {
                  /** @type { Set<string> } - As we flow through nodes, the relationships that need to be deleted will be added here */
                  const deleteRelationshipSet = new Set()

                  /** @type { Map<string, { schemaNodeName: string, propName: string }> } - <schemaNodeName___propName, { schemaNodeName, propName }> */
                  const deletePropsMap = new Map()

                  for (const schemaNodeName in passport.schema.nodes) {
                    for (const propName in passport.schema.nodes[schemaNodeName]) {
                      const schemaPropX = /** @type { td.SchemaNodeRelationshipX } */ (passport.schema.nodes[schemaNodeName][propName].x)

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

            putEntries.set(SCHEMA_KEY, passport.schema)
            break
        }
      }


      /**
       * @param { td.MutateRequestItemDataDeleteNodes | td.MutateRequestItemDataDeleteRelationships | td.MutateRequestItemDataDeleteNodeProps | td.MutateRequestItemDataDeleteRelationshipProps } requestItem 
       */
      async function _delete (requestItem) { // delete as a fn name is not allowed in js
        switch (requestItem.id) {
          case enums.idsMutate.DataDeleteNodes:
            if (requestItem.x?.uids?.length) deleteByUids(requestItem.x.uids)
            break
          case enums.idsMutate.DataDeleteRelationships:
            if (requestItem.x?._uids?.length) {
              requestItem.x._uids.forEach(_uid => deleteSet.add(_uid)) // add request _uids to the deleteSet

              const relationships = /** @type { Map<string, any> } */ (await putStorageGet({ uids: requestItem.x._uids }))

              for (const relationship of relationships.values()) {
                const relationshipNodes = /** @type { Map<string, any> } */ (await putStorageGet({ uids: [ relationship.x.a, relationship.x.b ] }))

                for (const relationshipNode of relationshipNodes.values()) {
                  removeUidFromRelationshipProp(relationshipNode, getRelationshipProp(relationship.id), relationship.x._uid)
                }
              }
            }
            break
          case enums.idsMutate.DataDeleteNodeProps:
            if (requestItem.x?.uids?.length && requestItem.x?.props?.length) {
              const relationshipNodes = /** @type { Map<string, any> } */ (await putStorageGet({ uids: requestItem.x.uids }))

              for (const relationshipNode of relationshipNodes.values()) {
                for (const prop of requestItem.x.props) {
                  if (typeof relationshipNode.x[prop] !== 'undefined') {
                    delete relationshipNode.x[prop]
                    putEntries.set(relationshipNode.x.uid, relationshipNode)
                  }
                }
              }
            }
            break
          case enums.idsMutate.DataDeleteRelationshipProps:
            if (requestItem.x?._uids?.length && requestItem.x?.props?.length) {
              const relationshipNodes = /** @type { Map<string, any> } */ (await putStorageGet({ uids: requestItem.x._uids }))

              for (const relationshipNode of relationshipNodes.values()) {
                for (const prop of requestItem.x.props) {
                  if (typeof relationshipNode.x[prop] !== 'undefined') {
                    delete relationshipNode.x[prop]
                    putEntries.set(relationshipNode.x._uid, relationshipNode)
                  }
                }
              }
            }
            break
        }
      }


      /**
       * Add nodes for insert or update to putEntries
       * @param { td.MutateRequestItemInsertNode | td.MutateRequestItemUpdateNode } requestItem 
       */
      async function inupNodes (requestItem) {
        const inupNodesArray = /** @type { [ td.MutateRequestItemInsertNode | td.MutateRequestItemUpdateNode , string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate mapUids

        await populateInupNodesArray()
        implementInupNodesArray()
        putEntries.set(NODE_UIDS_KEY, allNodeUids) // add $nodeUids to ace


        async function populateInupNodesArray () {
          if (requestItem && nodeNamesSet.has(requestItem.id)) { // IF permission to write this nodeName
            if (!requestItem?.x?.uid || typeof requestItem.x.uid !== 'string') throw error('mutate__falsy-uid', 'Please pass a request item that includes a uid that is a typeof string', { requestItem })

            const permissionStar = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', nodeName: requestItem.id, propName: '*' }))

            if (requestItem.id === 'InsertNode' && requestItem.x.uid.startsWith(REQUEST_UID_PREFIX) && permissionStar && !permissionStar?.allowNewInsert) { // IF this is a fresh insert AND star revoked this permission AND allowNewInsert not specefied
              throw error('auth__insert-node', `Because the write permission to the node name \`${ requestItem.id }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
            }

            let graphNode

            if (requestItem.id === 'UpdateNode' && updateRequestItems.nodes?.size) {
              graphNode = /** @type { Map<string, any> } */(updateRequestItems.nodes).get(requestItem.x.uid)

              if (!graphNode) throw error('mutate__invalid-update-uid', `Please pass a request item uid that is a uid defined in your graph, the uid \`${requestItem.x.uid}\` is not defined in your graph`, { requestItem })
              if (graphNode.id !== requestItem.id) throw error('mutate__invalid-update-uid', `Please pass a request item uid that is a uid defined in your graph with a matching graphNode.id: \`${ graphNode.id }\`and requestItem.id: \`${ requestItem.id }\``, { requestItem, graphNodeId: graphNode.id })
              if (permissionStar && (!passport?.user?.uid || !permissionStar.allowPropName || !graphNode.x[permissionStar.allowPropName] || graphNode.x[permissionStar.allowPropName] !== passport.user.uid)) throw error('auth__update-node', `Because the write permission to the node name \`${requestItem.id}\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })

              requestItem.x = { ...graphNode.x, ...requestItem.x }
            }

            let graphUid

            if (requestItem.id === 'UpdateNode') graphUid = requestItem.x.uid
            else {
              graphUid = getGraphUidAndAddToMapUids(requestItem.x.uid)

              if (Array.isArray(allNodeUids[requestItem.id])) allNodeUids[requestItem.id].push(graphUid) // IF schema $nodeUids for this uid's node is already an array => push onto it
              else allNodeUids[requestItem.id] = [graphUid] // IF schema $nodeUids for this uid's node is not an array => set as array w/ uid as first value
            
              putEntries.set(NODE_UIDS_KEY, allNodeUids)
            }

            for (const nodePropName in requestItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
              const permissionProp = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', nodeName: requestItem.id, propName: nodePropName }))

              if (permissionProp) {
                if (requestItem.id === 'InsertNode' && !permissionProp.allowNewInsert) throw error('auth__insert-prop', `Because the permission write to the node name \`${requestItem.id}\` and the prop name \`${nodePropName}\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
                if (requestItem.id === 'UpdateNode' && (!graphNode || !passport?.user?.uid || !permissionProp.allowPropName || !graphNode.x[permissionProp.allowPropName] || graphNode.x[permissionProp.allowPropName] !== passport.user.uid)) throw error('auth__update-prop', `Because the permission write to the node name \`${requestItem.id}\` and the prop name \`${nodePropName}\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
              }

              const requestItemX = /** @type { { [k: string]: any } } */ (requestItem.x)
              const nodePropValue = requestItemX[nodePropName]
              const schemaProp = /** @type { td.SchemaProp } */ (passport.schema?.nodes?.[requestItem.id][nodePropName])

              if (nodePropName !== '$options' && nodePropName !== 'uid') {
                if (schemaProp?.id !== 'Prop') throw error('mutate__invalid-schema-prop', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because it is not defined in your schema`, { requestItem, nodeName: requestItem.id, nodePropName })

                const _errorData = { schemaProp, requestItem, nodePropName, nodePropValue }

                if (schemaProp.x.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw error('mutate__invalid-property-value__isoString', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw error('mutate__invalid-property-value__isoString', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw error('mutate__invalid-property-value__number', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because when the schema property data type is "number", the request typeof must be a "number"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw error('mutate__invalid-property-value__boolean', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because when the schema property data type is "boolean", the request typeof must be a "boolean"`, _errorData)

                if (schemaProp.x.dataType === enums.dataTypes.hash) {
                  const jwkName = requestItem.x.$options?.find(o => o.id === 'PrivateJWK')?.x.name

                  if (!jwkName) throw error('mutate__falsy-options-private-jwk', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because requestItem.x.$options does not have a PrivateJWK. Example: requestItem.$options: [ { id: 'PrivateJWK', x: { name: 'password' } } ]`, _errorData)
                  if (!privateJWKs?.[jwkName]) throw error('mutate__falsy-request-item-private-jwk', `The node name ${requestItem.id} with the prop name ${nodePropName} is invalid because requestItem.x.$options[PrivateJWK].name does not align with any request.privateJWKs. Names must align.`, _errorData)

                  requestItemX[nodePropName] = await sign(privateJWKs[jwkName], nodePropValue?.value)
                }

                if (schemaProp.x.uniqueIndex) putEntries.set(getUniqueIndexKey(requestItem.id, nodePropName, nodePropValue), graphUid)

                if (schemaProp.x.sortIndex) {
                  const key = requestItem.id + DELIMITER + nodePropName
                  const value = sortIndexMap.get(key) || { nodeName: requestItem.id, nodePropName, uids: /** @type { string[] } */ ([]) }

                  value.uids.push(graphUid)
                  sortIndexMap.set(key, value)
                }

                if (schemaProp.x.dataType === enums.dataTypes.isoString && nodePropValue === ADD_NOW_DATE) requestItemX[nodePropName] = getNow()
              }
            }

            inupNodesArray.push([requestItem, graphUid]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate mapUids
          }
        }


        function implementInupNodesArray () {
          for (const [requestItem, graphUid] of inupNodesArray) { // loop the uids that we'll add to the graph
            for (const requestItemKey in requestItem.x) {
              overwriteUids(requestItem, requestItemKey)
            }

            putEntries.set(graphUid, requestItem) // The entries we will put
          }
        }


        /**
         * @param { string } insertUid 
         * @returns { string }
         */
        function getGraphUidAndAddToMapUids (insertUid) {
          /** This will be the uid that is added to the graph */
          let graphUid

          if (typeof insertUid !== 'string') throw error('mutate__uid-invalid-type', `The uid ${insertUid} is invalid because the type is not string, please include only typeof "string" for each uid`, { uid: insertUid })

          if (!insertUid.startsWith(REQUEST_UID_PREFIX)) graphUid = insertUid
          else {
            if (mapUids.get(insertUid)) throw error('mutate__duplicate-uid', `The uid ${insertUid} is invalid because it is included as a uid for multiple nodes, please do not include duplicate uids for insert`, { uid: insertUid })

            graphUid = crypto.randomUUID()
            mapUids.set(insertUid, graphUid)
          }

          return graphUid
        }
      }


      /**
       * Insert / Update Relationships
       * @param { td.MutateRequestItemInsertRelationship | td.MutateRequestItemUpdateRelationship } requestItem 
       */
      async function inupRelationships (requestItem) {
        if (requestItem && relationshipNamesSet.has(requestItem.id)) {
          const schemaRelationship = passport.schema?.relationships?.[requestItem.id]

          if (!schemaRelationship) throw error('mutate__unknown-relationship-name', `The relationship name ${requestItem.id} is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: requestItem.id })

          const permissionStar = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', relationshipName: requestItem.id, propName: '*' }))

          if (requestItem.id === 'InsertRelationship' && permissionStar && !permissionStar?.allowNewInsert) { // IF this is a fresh insert AND star revoked this permission AND allowNewInsert not specefied
            throw error('auth__insert-relationship', `Because the write permission to the relationship name \`${ requestItem.id} \` is revoked from one of your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          }

          let graphNode

          if (requestItem.id === 'UpdateRelationship' && updateRequestItems.relationships?.size) {
            graphNode = /** @type { Map<string, any> } */(updateRequestItems.relationships).get(requestItem.x._uid)

            if (!graphNode) throw error('mutate__invalid-update-uid', `Please pass a request item _uid that is a _uid defined in your graph, the _uid \`${ requestItem.x._uid} \` is not defined in your graph`, { requestItem })
            if (graphNode.id !== requestItem.id) throw error('mutate__invalid-update-uid', `Please pass a request item _uid that is a _uid defined in your graph with a matching graphNode.id: \`${ graphNode.id }\`,  and requestItem.id: \`${ requestItem.id }\``, { requestItem, graphNodeId: graphNode.id })
            if (permissionStar && (!passport?.user?.uid || !permissionStar.allowPropName || !graphNode.x[permissionStar.allowPropName] || graphNode.x[permissionStar.allowPropName] !== passport.user.uid)) throw error('auth__update-node', `Because the write permission to the relationship name \`${ requestItem.id }\` is revoked from one of your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })

            const aIsDifferent = graphNode.x.a !== requestItem.x.a
            const bIsDifferent = graphNode.x.b !== requestItem.x.b

            if (aIsDifferent) updatePreviousRelationshipNode(aIsDifferent, graphNode.a, requestItem)
            if (bIsDifferent) updatePreviousRelationshipNode(bIsDifferent, graphNode.b, requestItem)

            requestItem.x = { ...graphNode.x, ...requestItem.x }
          }

          await inupRelationship(requestItem, schemaRelationship, graphNode)
        }


        /**
         * @param { boolean } isDifferent 
         * @param { string } deletedNodeUid 
         * @param { td.MutateRequestItemUpdateRelationship } requestItem 
         */
        async function updatePreviousRelationshipNode (isDifferent, deletedNodeUid, requestItem) {
          if (isDifferent) {
            const relationshipNode = await putStorageGet({ uid: deletedNodeUid })

            if (relationshipNode && requestItem.x._uid) removeUidFromRelationshipProp(relationshipNode, getRelationshipProp(requestItem.id), requestItem.x._uid)
          }
        }


        /**
         * @param { td.MutateRequestItemInsertRelationship | td.MutateRequestItemUpdateRelationship } requestItem 
         * @param { any } schemaRelationship 
         * @param { any } [ graphNode ] 
         */
        async function inupRelationship (requestItem, schemaRelationship, graphNode) {
          const x = /** @type { td.MutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))

          if (requestItem.id === 'InsertRelationship') x._uid = crypto.randomUUID()

          for (const relationshipPropName in requestItem.x) {
            const permissionProp = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', relationshipName: requestItem.id, propName: relationshipPropName }))

            if (permissionProp) {
              if (requestItem.id === 'InsertRelationship' && !permissionProp.allowNewInsert) throw error('auth__insert-prop', `Because the permission write to the relationship name \`${requestItem.id}\` and the prop name \`${ relationshipPropName }\` is revoked from one of your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
              if (requestItem.id === 'UpdateRelationship' && (!graphNode || !passport?.user?.uid || !permissionProp.allowPropName || !graphNode.x[permissionProp.allowPropName] || graphNode.x[permissionProp.allowPropName] !== passport.user.uid)) throw error('auth__update-prop', `Because the write permission to the relationship name \`${ requestItem.id }\` and the prop name \`${ relationshipPropName }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
            }

            const relationshipPropValue = x[relationshipPropName]

            if (relationshipPropValue === ADD_NOW_DATE && schemaRelationship.props?.[relationshipPropName]?.dataType === enums.dataTypes.isoString) x[relationshipPropName] = getNow() // populate now timestamp
            else if (typeof relationshipPropValue === 'string' && relationshipPropValue.startsWith(REQUEST_UID_PREFIX)) overwriteUids(requestItem, relationshipPropName)
          }

          const relationshipProp = getRelationshipProp(requestItem.id)
          await addRelationshipToNode('a')
          await addRelationshipToNode('b')

          putEntries.set(x._uid, requestItem)


          /** @param { 'a' | 'b' } direction */
          async function addRelationshipToNode (direction) {
            const node = await putStorageGet({ uid: requestItem.x[direction] })

            if (!node[relationshipProp]) node[relationshipProp] = [ x._uid ]
            else node[relationshipProp].push(x._uid)

            putEntries.set(node.x.uid, node)
          }
        }
      }


      /**
       * @param { td.MutateRequestItemInsertRelationshipX } x
       * @param { string | number } requestItemKey
       */
      function overwriteUids (x, requestItemKey) {
        const requestItemValue = x[requestItemKey]

        if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
          const graphUid = mapUids.get(requestItemValue)

          if (graphUid) x[requestItemKey] = graphUid
          else throw error('mutate__invalid-uid', `The uid ${ requestItemValue } is invalid b/c each uid, with an ace uid prefix, must be defined in a node`, { uid: requestItemValue })
        }
      }


      /** @param { string[] } uids */
      async function deleteByUids (uids) {
        const nodeEntries = await putStorageGet({ uids })

        for (const node of nodeEntries.values()) {
          deleteSet.add(node.x.uid) // add request uid to the deleteSet

          /** @type { Map<string, string> } <relationshipUid, relationshipProp> */
          const relationshipUids = new Map()

          for (const prop in node) {
            if (prop.startsWith(RELATIONSHIP_PREFIX)) {
              for (const relationshipUid of node[prop]) {
                relationshipUids.set(relationshipUid, prop)
                deleteSet.add(relationshipUid) // add relationship uids to the deleteSet
              }
            }
          }

          /** @type { Map<string, string> } <relationshipNodeUid, relationshipId> */
          const relationshipNodeUids = new Map()
          const relationshipEntries = await passport.storage.get([...relationshipUids.keys()])

          for (const relationship of relationshipEntries.values()) {
            if (relationship.x.a === node.x.uid) relationshipNodeUids.set(relationship.x.b, relationship.x._uid)
            if (relationship.x.b === node.x.uid) relationshipNodeUids.set(relationship.x.a, relationship.x._uid)
          }

          const relationshipNodeEntries = await putStorageGet({ uids: [...relationshipNodeUids.keys()] })

          for (const relationshipNode of relationshipNodeEntries.values()) {
            const _uid = relationshipNodeUids.get(relationshipNode.x.uid)

            if (_uid) {
              const prop = relationshipUids.get(_uid)
              if (prop) removeUidFromRelationshipProp(relationshipNode, prop, _uid)
            }
          }
        }
      }


      /**
       * @param {*} relationshipNode 
       * @param { string } prop 
       * @param { string } _uid 
       */
      function removeUidFromRelationshipProp (relationshipNode, prop, _uid) {
        if (Array.isArray(relationshipNode[prop])) {
          if (relationshipNode[prop].length === 1 && relationshipNode[prop][0] === _uid) delete relationshipNode[prop]
          else {
            for (let i = 0; i < relationshipNode[prop].length; i++) {
              if (_uid === relationshipNode[prop][i]) relationshipNode[prop].splice(i, 1)
            }

            if (!relationshipNode[prop].length) delete relationshipNode[prop]
          }

          putEntries.set(relationshipNode.x.uid, relationshipNode)
        }
      }


      /**
       * Get from putEntries OR get from storage
       * @param { { uid?: string, uids?: string[] } } options
       */
      async function putStorageGet (options) {
        if (options.uid) return putEntries.get(options.uid) || (await passport.storage.get(options.uid))
        else if (options.uids) {
          /** @type { string [] } - If there are items we don't find in putEntries, add them to this list, we'll call storage once w/ this list if list.length */
          const storageUids = []

          /** @type { Map<string, any> } - Map of uids and nodes based on the provided uids */
          const response = new Map()

          for (const uid of options.uids) {
            const putNode = putEntries.get(uid)

            if (putNode) response.set(uid, putNode)
            else storageUids.push(uid)
          }

          if (storageUids.length) {
            const rStorage = await passport.storage.get(storageUids)

            rStorage.forEach((/** @type { any } */node, /** @type { string } */uid) => {
              response.set(uid, node)
            })
          }

          return response
        }
      }


      /**
       * @param { td.MutateRequestItemSchemaAddition } requestItem 
       * @returns 
       */
      async function schemaAdditions (requestItem) {
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', schema: true }))) throw error('auth__write-schema', 'Because the permission write schema is revoked from your AcePermission\'s, you cannot do this', { token: passport.token, source: passport.source })
        if (!passport.schema?.nodes) throw error('add-to-schema__falsy-nodes', '/add-to-schema should be called after calling /start, please call /start before calling /add-to-schema', {})
        if (!passport.schema?.relationships) throw error('add-to-schema__falsy-relationships', '/add-to-schema should be called after calling /start, please call /start before calling /add-to-schema', {})

        if (requestItem.x.schemaAdditions.nodes) {
          for (const node in requestItem.x.schemaAdditions.nodes) {
            if (passport.schema?.nodes[node]) throw error('add-to-schema__overwrite-node', `The node \`${node}\` is already in your schema, please only include nodes in /add-to-schema that are not already in your schema`, { node })
            passport.schema.nodes[node] = requestItem.x.schemaAdditions.nodes[node]
          }
        }

        if (requestItem.x.schemaAdditions.relationships) {
          for (const relationship in requestItem.x.schemaAdditions.relationships) {
            if (passport.schema?.relationships[relationship]) throw error('add-to-schema__overwrite-relationship', `The relationship \`${relationship}\` is already in your schema, please only include relationships in /add-to-schema that are not already in your schema`, { relationship })
            passport.schema.relationships[relationship] = requestItem.x.schemaAdditions.relationships[relationship]
          }
        }

        putEntries.set(SCHEMA_KEY, validateSchema(passport.schema))
        return passport.schema
      }
    }


    async function addSortIndicesToGraph () {
      if (sortIndexMap.size) {
        for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
          let nodes = []
          const storageUids = []

          for (const uid of uids) {
            const putEntryNode = putEntries.get(uid)

            if (putEntryNode) nodes.push(putEntryNode)
            else storageUids.push(uid)
          }

          if (storageUids.length) nodes.push(...(/** @type { Map<string, any> } */ (await passport.storage.get(storageUids)).values()))

          nodes = nodes.sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

          putEntries.set(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid))
        }
      }
    }


    /** @returns { MustPropsMap } */
    function getMustPropMap () {
      const mustPropsMap = /** @type { MustPropsMap } */ (new Map())

      if (passport.schema) {
        for (const nodeName in passport.schema.nodes) {
          for (const nodePropName in passport.schema.nodes[nodeName]) {
            if (passport.schema.nodes[nodeName][nodePropName]?.x?.mustBeDefined) {
              const map = mustPropsMap.get(nodeName) || new Map()
              map.set(nodePropName, passport.schema.nodes[nodeName][nodePropName])
              mustPropsMap.set(nodeName, map)
            }
          }
        }

        for (const relationshipName in passport.schema.relationships) {
          const props = passport.schema.relationships[relationshipName]?.x?.props

          if (props) {
            for (const propName in props) {
              if (props[propName].x?.mustBeDefined) {
                const map = mustPropsMap.get(relationshipName) || new Map()
                map.set(propName, props[propName])
                mustPropsMap.set(relationshipName, map)
              }
            }
          }
        }
      }

      return mustPropsMap
    }


    function throwIfMissingMustProps () {
      if (putEntries.size) {
        for (const requestItem of putEntries.values()) {
          const x = /** @type { td.MutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))
          const mustProps = requestItem.subId ? mustPropsMap.get(requestItem.subId) : null // the must props for a specific node or relationship

          if (mustProps) {
            mustProps.forEach((prop, propName) => {

              switch (prop.id) {
                case enums.idsSchema.Prop:
                case enums.idsSchema.RelationshipProp:
                  const schemaProp = /** @type { td.SchemaProp } */ (prop)
                  const letEmKnow = () => error('mutate__invalid-property-value', `Please ensure all required props are included and align with the data type in the schema, an example of where this is not happening yet is: Node: "${ requestItem.id }", Prop: "${ propName }", Data Type: "${ schemaProp.x.dataType }"`, { nodeName: requestItem.id, requestItem, propName, dataType: schemaProp.x.dataType })

                  switch (schemaProp.x.dataType) {
                    case 'isoString':
                      if (typeof x?.[propName] !== 'string') throw letEmKnow()
                      break
                    default:
                      if (typeof x?.[propName] !== schemaProp.x.dataType) throw letEmKnow()
                      break
                  }
                  break
                case enums.idsSchema.ForwardRelationshipProp:
                case enums.idsSchema.ReverseRelationshipProp:
                  validateNotBidirectionalMustProps((requestItem), prop, propName)
                  break
                case enums.idsSchema.BidirectionalRelationshipProp:
                  const bidirectionalRelationshipProp = /** @type { td.SchemaBidirectionalRelationshipProp } */ (prop)

                  if (!x[getRelationshipProp(bidirectionalRelationshipProp.x.relationshipName)]?.length) {
                    throw error('mutate__missing-must-defined-relationship', 'Please ensure relationships that must be defined, are defined.', { requiredPropName: propName, bidirectionalRelationshipProp, requestItem })
                  }
                  break
              }
            })
          }
        }


        /**
         * @param { td.MutateRequestItemInsertRelationship } rSchemaRelationshipProp 
         * @param { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp } schemaRelationshipProp 
         * @param { string } propName 
         */
        function validateNotBidirectionalMustProps (rSchemaRelationshipProp, schemaRelationshipProp, propName) {
          let isValid = false
          const storageUids = []
          const relationshipNodes = []
          const isInverse = schemaRelationshipProp.id === 'ReverseRelationshipProp'
          const x = /** @type { td.MutateRequestItemInsertRelationshipX } */ (rSchemaRelationshipProp.x)
          const relationshipUids = x[getRelationshipProp(schemaRelationshipProp.x.relationshipName)]

          if (relationshipUids) {
            for (const relationshipUid of relationshipUids) {
              const putEntry = putEntries.get(relationshipUid)

              if (putEntry) relationshipNodes.push(putEntry)
              else storageUids.push(relationshipUid)
            }

            if (relationshipNodes.length) {
              for (const relationshipNode of relationshipNodes) {
                if (x.uid === relationshipNode[isInverse ? 'b' : 'a']) {
                  isValid = true
                  break
                }
              }
            }
          }

          if (!isValid) throw error('mutate__missing-must-defined-relationship', `${propName} is invalid because it is missing relationship props that must be defined, please ensure relationships that must be defined, are defined.`, { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp })
        }
      }
    }


    /** @returns { td.MutateResponse } */
    function conclude () {
      let identityUidMap = /** @type { { [k: string]: string } } */ ({})
      let storagePutEntries = /** @type { { [k: string]: any } } */ ({})

      if (putEntries.size) { // convert from map to object for do storage
        putEntries.forEach((v, k) => {
          if (!deleteSet.has(k)) storagePutEntries[k] = v // ensure this put is not being deleted
        })
        passport.storage.put(storagePutEntries)
      }

      if (mapUids.size) mapUids.forEach((v, k) => identityUidMap[k] = v) // convert from map to object for response

      return { identity: identityUidMap, deleted: deleteArray }
    }
  })
}
