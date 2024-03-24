import { sign } from './hash.js'
import { error } from './throw.js'
import { start } from './start.js'
import { td, enums } from '#manifest'
import { Passport } from './Passport.js'
import { aceFetch } from './aceFetch.js'
import { validateSchema } from './schema.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { REQUEST_UID_PREFIX, ADD_NOW_DATE, DELIMITER, RELATIONSHIP_PREFIX, SCHEMA_KEY, ACE_NODE_NAMES, getUniqueIndexKey, getSortIndexKey, getRelationshipProp, getNow, getRevokesKey, getNodeUidsKey, getRelationshipUidsKey, getRelationshipNameFromProp } from './variables.js'



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
  try {
    await passport.stamp()

    /** @type { Map<string, string[]> } - <nodeName, uids> Uids of specific nodes in graph  */
    const nodeUidsMap = new Map()

    /** @type { MustPropsMap } - Map of props in schema that must be defined */
    const mustPropsMap = getMustPropMap()

    /** @type { Map<string, string> } - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value. */
    const mapUids = new Map()

    /** @type { Map<string, { nodeName: string, nodePropName: string, uids: string[] }> } - As we find properties that according to the schema need a sort index insert we will keep track of them here. Once we get them all together, we sort them, and then add to graph. */
    const sortIndexMap = new Map()

    /** @type { { [key: string]: CryptoKey } } - Object that converts stringified jwks into CryptoKey's */
    const privateJWKs = {}

    /** @type { { nodes: any, relationships: any } } - If updating we store the orignal items here, based on the uid (nodes) or _uid (relationships)  */
    const updateRequestItems = { nodes: null, relationships: null }

    /** @typedef { Map<string, Map<string, (td.SchemaProp | td.SchemaRelationshipProp | td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp)>> } MustPropsMap */

    /** @type { td.MutateRequestItem[] } Request as an array */
    const request = Array.isArray(body.request) ? body.request : [ body.request ]

    /** @type { undefined | td.AceStartResponse } Response from start() */
    let startResponse

    /** @type { string[] } - The passport.cache.deleteSet converted into an array */
    let deleteArray = []

    await setPrivateJWKs()
    await prepLoop()
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


    async function prepLoop () {
      if (request) {
        /** @type { Map<string, string> } - <nodeUidsKey, nodeName> Map of node names we will get uids for */
        const nodeNamesMap = new Map()

        /** @type { { node: string[], relationship: string[] } } - We will convert uids to graph nodes to help with updating */
        const updateUids = { node: [], relationship: [] }

        for (let i = 0; i < request.length; i++) {
          if (request[i].id === enums.idsMutate.UpdateNode) {
            const mutateRequestItemUpdateNode = /** @type { td.MutateRequestItemUpdateNode } */(request[i])
            const nodeName = mutateRequestItemUpdateNode.nodeName

            nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
            updateUids.node.push(mutateRequestItemUpdateNode.x.uid)
          }

          if (request[i].id === enums.idsMutate.UpdateRelationship) {
            updateUids.relationship.push(/** @type { td.MutateRequestItemUpdateRelationship } */(request[i]).x._uid)
          }

          if (request[i].id === enums.idsMutate.SchemaAndDataDeleteNodes) {
            /** @type { td.MutateRequestItemSchemaAndData } */(request[i]).x.nodes.forEach(nodeName => {
              nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
            })
          }

          if (request[i].id === enums.idsMutate.InsertNode) {
            const nodeName = /** @type { td.MutateRequestItemInsertNode } */ (request[i]).nodeName
            nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
          }
        }

        if (updateUids.node.length) updateRequestItems.nodes = await passport.cache.many(updateUids.node)
        if (updateUids.relationship.length) updateRequestItems.relationships = await passport.cache.many(updateUids.relationship)

        if (nodeNamesMap.size) {
          const keys = [...nodeNamesMap.keys() ]
          const rCache = await passport.cache.many(keys)

          for (const key of keys) {
            const nodeName = nodeNamesMap.get(key)
            if (nodeName) nodeUidsMap.set(nodeName, rCache.get(key) || [])
          }
        }
      }
    }


    async function deligate () {
      for (const requestItem of request) {
        switch (requestItem.id) {
          case enums.idsMutate.Start:
            startResponse = await start(passport)
            break
          case enums.idsMutate.Restart:
            startResponse = await restart()
            break
          case enums.idsMutate.SchemaAddition:
            await schemaAdditions(requestItem)
            break
          case enums.idsMutate.AceBackup:
            await backup(requestItem)
            break
          case enums.idsMutate.InsertNode:
          case enums.idsMutate.UpdateNode:
            await inupNodes(requestItem)
            break
          case enums.idsMutate.InsertRelationship:
          case enums.idsMutate.UpdateRelationship:
            await inupRelationship(requestItem)
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

      if (passport.cache.deleteSet.size) {
        passport.cache.deleteSet.forEach(uid => deleteArray.push(uid))
        passport.cache.storage.delete(deleteArray)
      }

      /** @returns { Promise<td.AceStartResponse> } */
      async function restart () {
        passport.revokesAcePermissions?.forEach((value) => {
          if (value.action === 'write' && value.schema === true) throw error('auth__write-schema', `Because write permissions to the schema is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          if (value.action === 'write' && value.nodeName) throw error('auth__write-node', `Because write permissions to the node name \`${value.nodeName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          if (value.action === 'write' && value.relationshipName) throw error('auth__write-node', `Because write permissions to the relationship name \`${value.relationshipName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
        })

        passport.cache.storage.deleteAll()
        passport.schema = undefined
        return await start(passport)
      }


      /** @param { td.MutateRequestItemBackup } requestItem */
      async function backup (requestItem) {
        if (typeof requestItem?.x?.backup !== 'string') throw error('mutate__invalid-backup', 'This request fails b/c requestItemXBackup is not a string', { requestItemXBackup: requestItem?.x?.backup })
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'load', backup: true }))) throw error('auth__load-backup', `Because the load backup permission is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })

        passport.cache.storage.deleteAll()
        passport.cache.storage.put(JSON.parse(requestItem.x.backup))
      }


      /**
       * @param { td.MutateRequestItemSchemaAndDataDeleteNodes } requestItem 
       */
      async function schema (requestItem) {
        switch (requestItem.id) {
          case enums.idsMutate.SchemaAndDataDeleteNodes:
            for (const requestNodeName of requestItem.x.nodes) {
              const nodeUidsKey = getNodeUidsKey(requestNodeName)
              const nodeUids = nodeUidsMap.get(requestNodeName)

              if (!nodeUids?.length) throw error('mutate__delete-nodes__invalid-node', `Please provide a valid nodeName, \`${requestNodeName}\` is not a valid nodeName`, { nodeName: requestNodeName, requestItem })
              if (ACE_NODE_NAMES.has(requestNodeName)) throw error('mutate__delete-nodes__ace-node', `Please provide a valid nodeName, \`${ requestNodeName }\` is not a valid nodeName because it is an Ace node name that is required for your graph to function optimally`, { nodeName: requestNodeName, requestItem, ACE_NODE_NAMES: [ ...ACE_NODE_NAMES.keys() ] })

              await deleteNodesByUids(nodeUids)
              schemaDeleteNodes()

              passport.cache.deleteSet.add(nodeUidsKey)
              delete passport.schema?.nodes[requestNodeName]
              passport.cache.putMap.set(SCHEMA_KEY, passport.schema)

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

            passport.cache.putMap.set(SCHEMA_KEY, passport.schema)
            break
        }
      }


      /**
       * @param { td.MutateRequestItemDataDeleteNodes | td.MutateRequestItemDataDeleteRelationships | td.MutateRequestItemDataDeleteNodeProps | td.MutateRequestItemDataDeleteRelationshipProps } requestItem 
       */
      async function _delete (requestItem) { // delete as a fn name is not allowed in js
        switch (requestItem.id) {
          case enums.idsMutate.DataDeleteNodes:
            if (requestItem.x?.uids?.length) await deleteNodesByUids(requestItem.x.uids)
            break
          case enums.idsMutate.DataDeleteRelationships:
            if (requestItem.x?._uids?.length) await deleteRelationshipsBy_Uids(requestItem.x._uids)
            break
          case enums.idsMutate.DataDeleteNodeProps:
            if (requestItem.x?.uids?.length && requestItem.x?.props?.length) {
              const relationshipNodes = await passport.cache.many(requestItem.x.uids)

              for (const relationshipNode of relationshipNodes.values()) {
                for (const prop of requestItem.x.props) {
                  if (typeof relationshipNode.x[prop] !== 'undefined') {
                    delete relationshipNode.x[prop]
                    passport.cache.putMap.set(relationshipNode.x.uid, relationshipNode)
                  }
                }
              }
            }
            break
          case enums.idsMutate.DataDeleteRelationshipProps:
            if (requestItem.x?._uids?.length && requestItem.x?.props?.length) {
              const relationshipNodes = await passport.cache.many(requestItem.x._uids)

              for (const relationshipNode of relationshipNodes.values()) {
                for (const prop of requestItem.x.props) {
                  if (typeof relationshipNode.x[prop] !== 'undefined') {
                    delete relationshipNode.x[prop]
                    passport.cache.putMap.set(relationshipNode.x._uid, relationshipNode)
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
        passport.cache.putMap.set(getNodeUidsKey(requestItem.nodeName), nodeUidsMap.get(requestItem.nodeName))

        async function populateInupNodesArray () {
          if (requestItem && passport.schemaDataStructures?.nodeNamesSet?.has(requestItem.nodeName)) { // IF permission to write this nodeName
            if (!requestItem?.x?.uid || typeof requestItem.x.uid !== 'string') throw error('mutate__falsy-uid', 'Please pass a request item that includes a uid that is a typeof string', { requestItem })

            const startsWithUidPrefix = requestItem.x.uid.startsWith(REQUEST_UID_PREFIX)

            const permissionStar = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', nodeName: requestItem.nodeName, propName: '*' }))

            if (requestItem.id === 'InsertNode' && startsWithUidPrefix && permissionStar && !permissionStar?.allowNewInsert) { // IF this is a fresh insert AND star revoked this permission AND allowNewInsert not specefied
              throw error('auth__insert-node', `Because the write permission to the node name \`${ requestItem.nodeName }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
            }

            let graphNode

            if (requestItem.id === 'UpdateNode' && updateRequestItems.nodes?.size) {
              graphNode = /** @type { Map<string, any> } */(updateRequestItems.nodes).get(requestItem.x.uid)

              if (!graphNode) throw error('mutate__invalid-update-uid', `Please pass a request item uid that is a uid defined in your graph, the uid \`${requestItem.x.uid}\` is not defined in your graph`, { requestItem })
              if (graphNode.nodeName !== requestItem.nodeName) throw error('mutate__invalid-update-nodeName', `Please pass a request item uid that is a uid defined in your graph with a matching graphNode.nodeName: \`${ graphNode.nodeName }\`and requestItem.nodeName: \`${ requestItem.nodeName }\``, { requestItem, graphNodeName: graphNode.nodeName })
              if (permissionStar && (!passport?.user?.uid || !permissionStar.allowPropName || !graphNode.x[permissionStar.allowPropName] || graphNode.x[permissionStar.allowPropName] !== passport.user.uid)) throw error('auth__update-node', `Because the write permission to the node name \`${ requestItem.nodeName }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })

              for (const propName in graphNode) {
                if (propName.startsWith(RELATIONSHIP_PREFIX)) { // transfer all $r from graphNode into requestItem
                  /** @type { td.MutateRequestItemNodeWithRelationships } */(requestItem)[propName] = graphNode[propName]
                }
              }
              requestItem.x = { ...graphNode.x, ...requestItem.x } // transfer additional graphNode.x props into requestItem.x
            }

            let graphUid

            if (requestItem.id === 'UpdateNode') graphUid = requestItem.x.uid
            else {
              graphUid = startsWithUidPrefix ? getGraphUidAndAddToMapUids(requestItem.x.uid, startsWithUidPrefix) : requestItem.x.uid

              const nodeUids = nodeUidsMap.get(requestItem.nodeName) || []

              nodeUids.push(graphUid)

              nodeUidsMap.set(requestItem.nodeName, nodeUids)

              passport.cache.putMap.set(getNodeUidsKey(requestItem.nodeName), nodeUids)
            }

            for (const nodePropName in requestItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
              const permissionProp = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', nodeName: requestItem.id, propName: nodePropName }))

              if (permissionProp) {
                if (requestItem.id === 'InsertNode' && !permissionProp.allowNewInsert) throw error('auth__insert-prop', `Because the permission write to the node name \`${ requestItem.nodeName }\` and the prop name \`${nodePropName}\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
                if (requestItem.id === 'UpdateNode' && (!graphNode || !passport?.user?.uid || !permissionProp.allowPropName || !graphNode.x[permissionProp.allowPropName] || graphNode.x[permissionProp.allowPropName] !== passport.user.uid)) throw error('auth__update-prop', `Because the permission write to the node name \`${ requestItem.nodeName }\` and the prop name \`${nodePropName}\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
              }

              const requestItemX = /** @type { { [k: string]: any } } */ (requestItem.x)
              const nodePropValue = requestItemX[nodePropName]
              const schemaProp = /** @type { td.SchemaProp } */ (passport.schema?.nodes?.[requestItem.nodeName][nodePropName])

              if (nodePropName !== '$options' && nodePropName !== 'uid') {
                if (schemaProp?.id !== 'Prop') throw error('mutate__invalid-schema-prop', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because it is not defined in your schema`, { requestItem, nodeName: requestItem.nodeName, nodePropName })

                const _errorData = { schemaProp, requestItem, nodePropName, nodePropValue }

                if (schemaProp.x.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw error('mutate__invalid-property-value__isoString', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw error('mutate__invalid-property-value__isoString', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw error('mutate__invalid-property-value__number', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because when the schema property data type is "number", the request typeof must be a "number"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw error('mutate__invalid-property-value__boolean', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because when the schema property data type is "boolean", the request typeof must be a "boolean"`, _errorData)

                if (schemaProp.x.dataType === enums.dataTypes.hash) {
                  const jwkName = requestItem.x.$options?.find(o => o.id === 'PrivateJWK')?.x.name

                  if (!jwkName) throw error('mutate__falsy-options-private-jwk', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because requestItem.x.$options does not have a PrivateJWK. Example: requestItem.$options: [ { id: 'PrivateJWK', x: { name: 'password' } } ]`, _errorData)
                  if (!privateJWKs?.[jwkName]) throw error('mutate__falsy-request-item-private-jwk', `The node name ${ requestItem.nodeName } with the prop name ${nodePropName} is invalid because requestItem.x.$options[PrivateJWK].name does not align with any request.privateJWKs. Names must align.`, _errorData)

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

            inupNodesArray.push([requestItem, graphUid]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate mapUids
          }
        }


        function implementInupNodesArray () {
          for (const [requestItem, graphUid] of inupNodesArray) { // loop the uids that we'll add to the graph
            for (const requestItemKey in requestItem.x) {
              overwriteUids(requestItem.x, requestItemKey)
            }

            /** @type { { [k:string]: any } } - The request item that will be added to the graph - No id prop */
            let graphRequestItem = {}

            for (const key in requestItem) {
              if (key !== 'id') graphRequestItem[key] = /** @type { td.MutateRequestItemNodeWithRelationships } */(requestItem)[key]
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

          if (typeof insertUid !== 'string') throw error('mutate__uid-invalid-type', `The uid ${insertUid} is invalid because the type is not string, please include only typeof "string" for each uid`, { uid: insertUid })

          if (!startsWithUidPrefix) graphUid = insertUid
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
      async function inupRelationship (requestItem) {
        if (requestItem && passport.schemaDataStructures?.relationshipNamesSet?.has(requestItem.relationshipName)) {
          const schemaRelationship = passport.schema?.relationships?.[requestItem.relationshipName]

          if (!schemaRelationship) throw error('mutate__unknown-relationship-name', `The relationship name \`${ requestItem.relationshipName }\` is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: requestItem.relationshipName })

          const permissionStar = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', relationshipName: requestItem.relationshipName, propName: '*' }))

          if (requestItem.id === 'InsertRelationship' && permissionStar && !permissionStar?.allowNewInsert) { // IF this is a fresh insert AND star revoked this permission AND allowNewInsert not specefied
            throw error('auth__insert-relationship', `Because the write permission to the relationship name \`${ requestItem.relationshipName } \` is revoked from one of your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          }

          let graphNode

          if (requestItem.id === 'UpdateRelationship' && updateRequestItems.relationships?.size) {
            graphNode = /** @type { Map<string, any> } */(updateRequestItems.relationships).get(requestItem.x._uid)

            if (!graphNode) throw error('mutate__invalid-update-uid', `Please pass a request item _uid that is a _uid defined in your graph, the _uid \`${ requestItem.x._uid} \` is not defined in your graph`, { requestItem })
            if (graphNode.relationshipName !== requestItem.relationshipName) throw error('mutate__invalid-update-relationshipName', `Please pass a request item _uid that is a _uid defined in your graph with a matching graphNode.relationshipName: \`${ graphNode.relationshipName }\`,  and requestItem.relationshipName: \`${ requestItem.relationshipName }\``, { requestItem, graphNodeRelationshipName: graphNode.relationshipName })
            if (permissionStar && (!passport?.user?.uid || !permissionStar.allowPropName || !graphNode.x[permissionStar.allowPropName] || graphNode.x[permissionStar.allowPropName] !== passport.user.uid)) throw error('auth__update-node', `Because the write permission to the relationship name \`${ requestItem.relationshipName }\` is revoked from one of your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })

            const aIsDifferent = graphNode.x.a !== requestItem.x.a
            const bIsDifferent = graphNode.x.b !== requestItem.x.b

            if (aIsDifferent) updatePreviousRelationshipNode(aIsDifferent, graphNode.a, requestItem)
            if (bIsDifferent) updatePreviousRelationshipNode(bIsDifferent, graphNode.b, requestItem)

            requestItem.x = { ...graphNode.x, ...requestItem.x }
          }

          await inupRelationshipPut(requestItem, schemaRelationship, graphNode)
        }
      }


      /**
       * @param { boolean } isDifferent 
       * @param { string } deletedNodeUid 
       * @param { td.MutateRequestItemUpdateRelationship } requestItem 
       */
      async function updatePreviousRelationshipNode (isDifferent, deletedNodeUid, requestItem) {
        if (isDifferent) {
          const relationshipNode = await passport.cache.one(deletedNodeUid)

          if (relationshipNode && requestItem.x._uid) removeUidFromRelationshipProp(relationshipNode, getRelationshipProp(requestItem.relationshipName), requestItem.x._uid)
        }
      }


      /**
       * @param { td.MutateRequestItemInsertRelationship | td.MutateRequestItemUpdateRelationship } requestItem 
       * @param { any } schemaRelationship 
       * @param { any } [ graphNode ] 
       */
      async function inupRelationshipPut (requestItem, schemaRelationship, graphNode) {
        const x = /** @type { td.MutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))

        if (requestItem.id === 'InsertRelationship') x._uid = crypto.randomUUID()

        for (const relationshipPropName in requestItem.x) {
          const permissionProp = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', relationshipName: requestItem.relationshipName, propName: relationshipPropName }))

          if (permissionProp) {
            if (requestItem.id === 'InsertRelationship' && !permissionProp.allowNewInsert) throw error('auth__insert-prop', `Because the permission write to the relationship name \`${requestItem.relationshipName}\` and the prop name \`${ relationshipPropName }\` is revoked from one of your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
            if (requestItem.id === 'UpdateRelationship' && (!graphNode || !passport?.user?.uid || !permissionProp.allowPropName || !graphNode.x[permissionProp.allowPropName] || graphNode.x[permissionProp.allowPropName] !== passport.user.uid)) throw error('auth__update-prop', `Because the write permission to the relationship name \`${ requestItem.relationshipName }\` and the prop name \`${ relationshipPropName }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
          }

          const relationshipPropValue = x[relationshipPropName]

          if (relationshipPropValue === ADD_NOW_DATE && schemaRelationship.x?.props?.[relationshipPropName]?.x?.dataType === enums.dataTypes.isoString) x[relationshipPropName] = getNow() // populate now timestamp
          else if (typeof relationshipPropValue === 'string' && relationshipPropValue.startsWith(REQUEST_UID_PREFIX)) {
            overwriteUids(requestItem.x, relationshipPropName)
          }
        }

        const relationshipProp = getRelationshipProp(requestItem.relationshipName)
        await addRelationshipToNode('a')
        await addRelationshipToNode('b')

        passport.cache.putMap.set(x._uid, { relationshipName: requestItem.relationshipName, x: requestItem.x }) // add relationship to graph

        const relationshipUidsKey = getRelationshipUidsKey(requestItem.relationshipName)
        const relationshipUidsArray = (await passport.cache.one(relationshipUidsKey)) || []
        const relationshipUidsSet = new Set(relationshipUidsArray)

        relationshipUidsSet.add(x._uid) // add relationship _uid to relationship index
        passport.cache.putMap.set(relationshipUidsKey, [ ...relationshipUidsSet ])


        /** @param { 'a' | 'b' } direction */
        async function addRelationshipToNode (direction) {
          if (requestItem.x[direction]) {
            const node = await passport.cache.one(/** @type { string } */(requestItem.x[direction]))

            if (!node[relationshipProp]) node[relationshipProp] = [x._uid]
            else node[relationshipProp].push(x._uid)

            passport.cache.putMap.set(node.x.uid, node)
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
      async function deleteNodesByUids (uids) {
        const graphNodes = await passport.cache.many(uids)

        for (const graphNode of graphNodes.values()) {
          /** @type { Map<string, { propName: string, relationshipName: string }> } <relationshipUid, { propName, relationshipName }> */
          const relationshipUidsMap = new Map()

          /** @type { Map<string, string> } <prop, relationshipName> */
          const relationshipNames = new Map()

          for (const propName in graphNode) { // b/c we need to get data from these eal
            if (propName.startsWith(RELATIONSHIP_PREFIX)) {
              for (const relationshipUid of graphNode[propName]) {
                let relationshipName = relationshipNames.get(propName)

                if (!relationshipName) {
                  relationshipName = getRelationshipNameFromProp(propName)
                  relationshipNames.set(propName, relationshipName)
                }

                relationshipUidsMap.set(relationshipUid, { propName, relationshipName })
              }
            }
          }

          const relationshipUidsArray = [ ...relationshipUidsMap.keys() ]

          /** @type { Map<string, string> } <relationshipNodeUid, relationshipId> */
          const relationshipNodeUids = new Map()
          const graphRelationshipsMap = await passport.cache.many(relationshipUidsArray)

          for (const graphRelationship of graphRelationshipsMap.values()) {
            if (graphRelationship.x.a === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.b, graphRelationship.x._uid)
            if (graphRelationship.x.b === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.a, graphRelationship.x._uid)
          }

          const graphRelationshipNodesMap = await passport.cache.many([ ...relationshipNodeUids.keys() ])

          for (const graphRelationshipNode of graphRelationshipNodesMap.values()) {
            const _uid = relationshipNodeUids.get(graphRelationshipNode.x.uid)

            if (_uid) {
              const v = relationshipUidsMap.get(_uid)
              if (v?.propName) removeUidFromRelationshipProp(graphRelationshipNode, v.propName, _uid)
            }
          }

          passport.cache.deleteSet.add(graphNode.x.uid) // add request uid to the passport.cache.deleteSet

          for (const _uid of relationshipUidsArray) { // we need data from these relationships above so add to deleteSet last
            passport.cache.deleteSet.add(_uid)
            const v = relationshipUidsMap.get(_uid)
            if (v?.relationshipName) await delete_UidFromRelationshipIndex(v.relationshipName, _uid)
          }
        }
      }


      /** @param { string[] } _uids */
      async function deleteRelationshipsBy_Uids (_uids) {
        const graphRelationships = /** @type { Map<string, td.AceGraphRelationship> }*/ (await passport.cache.many(_uids))

        for (const graphRelationship of graphRelationships.values()) {
          await delete_UidFromRelationshipIndex(graphRelationship.relationshipName, graphRelationship.x._uid)

          const relationshipNodes = await passport.cache.many([ graphRelationship.x.a, graphRelationship.x.b ])

          for (const relationshipNode of relationshipNodes.values()) {
            removeUidFromRelationshipProp(relationshipNode, getRelationshipProp(graphRelationship.relationshipName), graphRelationship.x._uid)
          }
        }

        _uids.forEach(_uid => passport.cache.deleteSet.add(_uid)) // add @ end b/c above we need info from this relationship
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

          passport.cache.putMap.set(relationshipNode.x.uid, relationshipNode)
        }
      }


      /**
       * @param { string } relationshipName 
       * @param { string } _uid 
       */
      async function delete_UidFromRelationshipIndex (relationshipName, _uid) {
        if (relationshipName) {
          const relationshipUidsKey = getRelationshipUidsKey(relationshipName)
          const relationshipUidsArray = (await passport.cache.one(relationshipUidsKey)) || []
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
       * @param { td.MutateRequestItemSchemaAddition } requestItem 
       * @returns 
       */
      async function schemaAdditions (requestItem) {
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', schema: true }))) throw error('auth__write-schema', 'Because the permission write schema is revoked from your AcePermission\'s, you cannot do this', { token: passport.token, source: passport.source })
        if (!passport.schema?.nodes) throw error('add-to-schema__falsy-nodes', '/add-to-schema should be called after calling /start, please call /start before calling /add-to-schema', {})
        if (!passport.schema?.relationships) throw error('add-to-schema__falsy-relationships', '/add-to-schema should be called after calling /start, please call /start before calling /add-to-schema', {})

        if (requestItem.x.nodes) {
          for (const node in requestItem.x.nodes) {
            if (passport.schema?.nodes[node]) throw error('add-to-schema__overwrite-node', `The node \`${node}\` is already in your schema, please only include nodes in /add-to-schema that are not already in your schema`, { node })
            passport.schema.nodes[node] = requestItem.x.nodes[node]
          }
        }

        if (requestItem.x.relationships) {
          for (const relationship in requestItem.x.relationships) {
            if (passport.schema?.relationships[relationship]) throw error('add-to-schema__overwrite-relationship', `The relationship \`${relationship}\` is already in your schema, please only include relationships in /add-to-schema that are not already in your schema`, { relationship })
            passport.schema.relationships[relationship] = requestItem.x.relationships[relationship]
          }
        }

        passport.cache.putMap.set(SCHEMA_KEY, validateSchema(passport.schema))
        return passport.schema
      }
    }


    async function addSortIndicesToGraph () {
      if (sortIndexMap.size) {
        for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
          const nodes = [ ...(await passport.cache.many(uids)).values() ]
            .sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

          passport.cache.putMap.set(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid))
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
      if (passport.cache.putMap.size) {
        for (const requestItem of passport.cache.putMap.values()) {
          const x = /** @type { td.MutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))
          const mustProps = requestItem.subId ? mustPropsMap.get(requestItem.subId) : null // the must props for a specific node or relationship

          if (mustProps) {
            mustProps.forEach((prop, propName) => {

              switch (prop.id) {
                case enums.idsSchema.Prop:
                case enums.idsSchema.RelationshipProp:
                  const schemaProp = /** @type { td.SchemaProp } */ (prop)
                  const letEmKnow = () => error('mutate__invalid-property-value', `Please ensure all required props are included and align with the data type in the schema, an example of where this is not happening yet is: Node: "${ requestItem.nodeName }", Prop: "${ propName }", Data Type: "${ schemaProp.x.dataType }"`, { nodeName: requestItem.nodeName, requestItem, propName, dataType: schemaProp.x.dataType })

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
              const putEntry = passport.cache.putMap.get(relationshipUid)

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

      /** @type { { [k: string]: any } } - Convert putMap into an object that is ready for Cloudflare Storage */
      const putObj = {}

      if (passport.cache.putMap.size) { // convert from map to object for do storage
        passport.cache.putMap.forEach((v, k) => {
          if (!passport.cache.deleteSet.has(k)) putObj[k] = v // ensure this put is not being deleted
        })

        passport.cache.storage.put(putObj)
      }

      if (mapUids.size) mapUids.forEach((v, k) => identityUidMap[k] = v) // convert from map to object for response

      return {
        identity: identityUidMap,
        deleted: deleteArray || [],
        start: startResponse
      }
    }
  } catch (e) {
    console.log('error', e)
    throw e
  }
}
