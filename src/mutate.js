import { sign } from './hash.js'
import { error } from './throw.js'
import { td, enums } from '#manifest'
import { stamp } from './passport.js'
import { fetchJSON } from './fetchJSON.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { REQUEST_UID_PREFIX, NODE_UIDS_KEY, SCHEMA_KEY, ADD_NOW_DATE, DELIMITER, getUniqueIndexKey, getSortIndexKey, getRelationshipProp, getNow, getRevokesKey } from './variables.js'


/**
 * Mutate Ace Graph Database
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { string | null } token
 * @param { td.MutateRequest } request
 * @returns { Promise<td.MutateResponse> }
 */
export async function mutate (url, token, request) {
  return fetchJSON(url + enums.endpoints.mutate, token, { body: JSON.stringify(request) })
}


/**
 * Mutate Ace Graph Database
 * @param { td.AcePassport } passport
 * @param { td.MutateRequest } request - Mutation request
 * @returns { Promise<td.MutateResponse> }
*/
export async function _mutate (passport, request) {
  try {
    await stamp(passport)

    /** @type { Map<string, any> } - Map with schema and node uids from Ace Graph Database */
    const getEntries = await passport.storage.get([ SCHEMA_KEY, NODE_UIDS_KEY ])

    /** @type { td.Schema } - Ace Graph Database Schema  */
    const schema = getEntries.get(SCHEMA_KEY) || {}

    /** @type { { [nodeName: string]: string[] } } - Uids of all nodes in graph  */
    const allNodeUids = getEntries.get(NODE_UIDS_KEY) || {}

    /** @type { MustPropsMap } - Map of props in schema that must be defined */
    const mustPropsMap = getMustPropMap()

    /** @type { Set<string> } - Set of all node names in schema */
    const nodeNamesSet = new Set(Object.keys(schema?.nodes || {}))

    /** @type { Set<string> } - Set of all relationships in schema */
    const relationshipNamesSet = new Set(Object.keys(schema?.relationships || {}))

    /** @type { Map<string, string> } - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value. */
    const mapUids = new Map()

    /** @type { Map<string, { nodeName: string, nodePropName: string, uids: string[] }> } - As we find properties that according to the schema need a sort index insert we will keep track of them here. Once we get them all together, we sort them, and then add to graph. */
    const sortIndexMap = new Map()

    /** @type { Map<string, any> } - The entries we will put */
    const putEntries = new Map()

    /** @type { { [key: string]: CryptoKey } } - Object that converts stringified jwks into CryptoKey's */
    const privateJWKs = {}

    /** @typedef { Map<string, Map<string, (td.SchemaProp | td.SchemaRelationshipProp | td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp)>> } MustPropsMap */

    await setPrivateJWKs()
    await sert()
    throwIfMissingMustProps()
    await addSortIndicesToGraph()
    return conclude()


    async function setPrivateJWKs () {
      if (request.privateJWKs) {
        for (const name in request.privateJWKs) {
          privateJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(request.privateJWKs[name]), getAlgorithmOptions('import'), true, ['sign'])
        }
      }
    }


    async function sert () {
      for (const action in request) {
        if (action === 'insert' || action === 'upsert') {
          await sertNodes(action)
          sertRelationships(action)
        }
      }
    }


    /**
     * Add nodes for upsert or insert to putEntries
     * @param { 'insert' | 'upsert' } action 
     */
    async function sertNodes (action) {
      let upsertRequestItems = /** @type {*} */ (undefined)
      const sertNodesArray = /** @type { [ td.MutateRequestInsertNodeDefaultItem, string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate mapUids


      await setUpsertRequestItems()
      await populateSertNodesArray()
      implementSertNodesArray()
      putEntries.set(NODE_UIDS_KEY, allNodeUids) // add $nodeUids to ace


      async function setUpsertRequestItems () {
        if (action === 'upsert' && request.upsert) {
          const uids = []

          for (let i = 0; i < request.upsert.length; i++) {
            const x = /** @type { { uid: string } } */(request.upsert[i].x)
            if (x.uid) uids.push(x.uid) // is a node upsert & not a relationship upsert
          }

          upsertRequestItems = await passport.storage.get(uids)
        }
      }

      async function populateSertNodesArray () {
        for (let i = 0; i < /** @type { td.MutateRequestInsertItem[] } */(request[action])?.length; i++) {
          let requestItem = /** @type { td.MutateRequestInsertNodeDefaultItem } */ (request[action]?.[i])

          if (requestItem && nodeNamesSet.has(requestItem.id)) { // IF permission to write this nodeName
            if (!requestItem?.x?.uid || typeof requestItem.x.uid !== 'string') throw error('mutate__falsy-uid', 'Please pass a request item that includes a uid that is a typeof string', { requestItem })

            const permissionStar = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', nodeName: requestItem.id, propName: '*' }))

            if (action === 'insert' && requestItem.x.uid.startsWith(REQUEST_UID_PREFIX) && permissionStar && !permissionStar?.allowNewInsert) { // IF this is a fresh insert AND star revoked this permission AND allowNewInsert not specefied
              throw error('auth__insert-node', `Because the write permission to the node name \`${requestItem.id}\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
            }

            let graphNode

            if (action === 'upsert' && upsertRequestItems) {
              graphNode = /** @type { Map<string, any> } */(upsertRequestItems).get(requestItem.x.uid)

              if (!graphNode) throw error('mutate__invalid-upsert-uid', `Please pass a request item uid that is a uid defined in your graph, the uid \`${ requestItem.x.uid }\` is not defined in your graph`, { requestItem })
              if (graphNode.id !== requestItem.id) throw error('mutate__invalid-upsert-uid', `Please pass a request item uid that is a uid defined in your graph as a \`${ graphNode.id }\`, the uid \`${ requestItem.x.uid }\` is not defined as a \`${ requestItem.id }\``, { requestItem, graphNodeId: graphNode.id })
              if (permissionStar && (!passport?.user?.uid || !permissionStar.allowPropName || !graphNode.x[permissionStar.allowPropName] || graphNode.x[permissionStar.allowPropName] !== passport.user.uid)) throw error('auth__upsert-node', `Because the write permission to the node name \`${ requestItem.id }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })

              requestItem = { ...graphNode, ...requestItem }
            }

            let graphUid

            if (action === 'upsert') graphUid = requestItem.x.uid
            else {
              graphUid = getGraphUidAndAddToMapUids(requestItem.x.uid)

              if (Array.isArray(allNodeUids[requestItem.id])) allNodeUids[requestItem.id].push(graphUid) // IF schema $nodeUids for this uid's node is already an array => push onto it
              else allNodeUids[requestItem.id] = [graphUid] // IF schema $nodeUids for this uid's node is not an array => set as array w/ uid as first value
            }

            for (const nodePropName in requestItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
              const permissionProp = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'write', nodeName: requestItem.id, propName: nodePropName }))

              if (permissionProp) {
                if (action === 'insert' && !permissionProp.allowNewInsert) throw error('auth__insert-prop', `Because the permission write to the node name \`${ requestItem.id }\` and the prop name \`${ nodePropName }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
                if (action === 'upsert' && (!graphNode || !passport?.user?.uid || !permissionProp.allowPropName || !graphNode.x[permissionProp.allowPropName] || graphNode.x[permissionProp.allowPropName] !== passport.user.uid)) throw error('auth__upsert-prop', `Because the permission write to the node name \`${ requestItem.id }\` and the prop name \`${ nodePropName }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })
              }

              const nodePropValue = requestItem?.x?.[nodePropName]
              const schemaProp = /** @type { td.SchemaProp } */ (schema.nodes?.[requestItem.id][nodePropName])

              if (nodePropName !== '$options' && nodePropName !== 'uid') {
                if (schemaProp?.id !== 'Prop') throw error('mutate__invalid-schema-prop', `The node name ${ requestItem.id } with the prop name ${ nodePropName } is invalid because it is not defined in your schema`, { requestItem, nodeName: requestItem.id, nodePropName })

                const _errorData = { schemaProp, requestItem, nodePropName, nodePropValue }

                if (schemaProp.x.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw error('mutate__invalid-property-value__isoString', `The node name ${ requestItem.id } with the prop name ${ nodePropName } is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw error('mutate__invalid-property-value__isoString', `The node name ${ requestItem.id } with the prop name ${ nodePropName } is invalid because when the schema property data type is "isoString", the request typeof must be a "string"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw error('mutate__invalid-property-value__number', `The node name ${ requestItem.id } with the prop name ${ nodePropName } is invalid because when the schema property data type is "number", the request typeof must be a "number"`, _errorData)
                if (schemaProp.x.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw error('mutate__invalid-property-value__boolean', `The node name ${ requestItem.id } with the prop name ${ nodePropName } is invalid because when the schema property data type is "boolean", the request typeof must be a "boolean"`, _errorData)

                if (schemaProp.x.dataType === enums.dataTypes.hash) {
                  const jwkName = requestItem.x.$options?.find(o => o.id === 'PrivateJWK')?.x.name

                  if (!jwkName) throw error('mutate__falsy-options-private-jwk', `The node name ${ requestItem.id } with the prop name ${ nodePropName } is invalid because requestItem.x.$options does not have a PrivateJWK. Example: requestItem.$options: [ { id: 'PrivateJWK', x: { name: 'password' } } ]`, _errorData)
                  if (!privateJWKs?.[jwkName]) throw error('mutate__falsy-request-item-private-jwk', `The node name ${requestItem.id} with the prop name ${nodePropName } is invalid because requestItem.x.$options[PrivateJWK].name does not align with any request.privateJWKs. Names must align.`, _errorData)

                  requestItem.x[nodePropName] = await sign(privateJWKs[jwkName], requestItem.x[nodePropName]?.value)
                }

                if (schemaProp.x.uniqueIndex) putEntries.set(getUniqueIndexKey(requestItem.id, nodePropName, nodePropValue), graphUid)

                if (schemaProp.x.sortIndex) {
                  const key = requestItem.id + DELIMITER + nodePropName
                  const value = sortIndexMap.get(key) || { nodeName: requestItem.id, nodePropName, uids: /** @type { string[] } */ ([]) }

                  value.uids.push(graphUid)
                  sortIndexMap.set(key, value)
                }

                if (schemaProp.x.dataType === enums.dataTypes.isoString && nodePropValue === ADD_NOW_DATE) requestItem.x[nodePropName] = getNow()
              }
            }

            sertNodesArray.push([ requestItem, graphUid ]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate mapUids
          }
        }
      }


      function implementSertNodesArray () {
        for (const [ requestItem, graphUid ] of sertNodesArray) { // loop the uids that we'll add to the graph
          for (const requestItemKey in requestItem.x) {
            overwriteUids(requestItem, requestItemKey)
          }

          putEntries.set(graphUid, requestItem) // The entries we will put
        }
      }
    }


    /**
     * Insert / Upsert Relationships
     * @param { 'insert' | 'upsert' } action 
     */
    function sertRelationships (action) {
      for (let i = 0; i < /** @type { td.MutateRequestInsertItem[] } */(request[action])?.length; i++) {
        const requestItem = /** @type { td.MutateRequestInsertRelationshipDefaultItem } */ (request[action]?.[i])

        if (requestItem && relationshipNamesSet.has(requestItem.id)) {
          const schemaRelationship = schema.relationships?.[requestItem.id]

          if (!schemaRelationship) throw error('mutate__unknown-relationship-name', `The relationship name ${ requestItem.id } is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: requestItem.id })
          if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', relationshipName: requestItem.id, propName: '*' }))) throw error('auth__write-relationship-name', `Because the write permission to the relationship name \`${ requestItem.id }\` is revoked, you cannot do this`, { token: passport.token, source: passport.source })

          sertRelationship(requestItem, schemaRelationship)
        }
      }
    }


    /**
     * @param { td.MutateRequestInsertNodeDefaultItem } requestItem 
     * @param { any } schemaRelationship 
     */
    function sertRelationship (requestItem, schemaRelationship) {
      const graphKey = crypto.randomUUID()

      for (const requestItemKey in requestItem.x) {
        if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', relationshipName: requestItem.id, propName: requestItemKey }))) throw error('auth__write-relationship-name-' + requestItemKey, `Because the write permission to the relationship name \`${requestItem.id}\` and the prop name \`${ requestItemKey }\` is revoked from one of your AcePermissions, you cannot do this`, { token: passport.token, source: passport.source })

        const requestItemValue = requestItem.x[requestItemKey]

        if (requestItemValue === ADD_NOW_DATE && schemaRelationship.props?.[requestItemKey]?.dataType === enums.dataTypes.isoString) requestItem.x[requestItemKey] = getNow() // populate now timestamp
        else if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) overwriteUids(requestItem, requestItemKey)
      }

      const relationshipProp = getRelationshipProp(requestItem.id)
      addRelationshipToNode('a', requestItem, relationshipProp, graphKey)
      addRelationshipToNode('b', requestItem, relationshipProp, graphKey)

      putEntries.set(graphKey, requestItem)
    }


    /**
     * @param { 'a' | 'b' } direction
     * @param { td.MutateRequestInsertNodeDefaultItem } requestItem 
     * @param { string } relationshipProp 
     * @param { string } graphKey 
     */
    function addRelationshipToNode (direction, requestItem, relationshipProp, graphKey) {
      const node = putEntries.get(requestItem.x[ direction ])

      if (!node[relationshipProp]) node[relationshipProp] = [ graphKey ]
      else node[relationshipProp].push(graphKey)
    }


    /**
     * @param { string } insertUid 
     * @returns { string }
     */
    function getGraphUidAndAddToMapUids (insertUid) {
      /** This will be the uid that is added to the graph */
      let graphUid

      if (typeof insertUid !== 'string') throw error('mutate__uid-invalid-type', `The uid ${ insertUid } is invalid because the type is not string, please include only typeof "string" for each uid`, { uid: insertUid })

      if (!insertUid.startsWith(REQUEST_UID_PREFIX)) graphUid = insertUid
      else {
        if (mapUids.get(insertUid)) throw error('mutate__duplicate-uid', `The uid ${ insertUid } is invalid because it is included as a uid for multiple nodes, please do not include duplicate uids for insert`, { uid: insertUid })

        graphUid = crypto.randomUUID()
        mapUids.set(insertUid, graphUid)
      }

      return graphUid
    }


    /**
     * @param { td.MutateRequestInsertNodeDefaultItem } requestItem
     * @param { string | number } requestItemKey
     */
    function overwriteUids (requestItem, requestItemKey) {
      const requestItemValue = requestItem.x[requestItemKey]

      if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
        const graphUid = mapUids.get(requestItemValue)

        if (graphUid) /** @type { td.MutateRequestInsertNodeDefaultItem } */ (/** @type { any } */ (requestItem)).x[requestItemKey] = graphUid
        else throw error('mutate__invalid-uid', `The uid ${ requestItemValue } is invalid b/c each uid, with an ace uid prefix, must be defined in a node`, { uid: requestItemValue })
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

      if (schema) {
        for (const nodeName in schema.nodes) {
          for (const nodePropName in schema.nodes[nodeName]) {
            if (schema.nodes[nodeName][nodePropName]?.x?.mustBeDefined) {
              const map = mustPropsMap.get(nodeName) || new Map()
              map.set(nodePropName, schema.nodes[nodeName][nodePropName])
              mustPropsMap.set(nodeName, map)
            }
          }
        }

        for (const relationshipName in schema.relationships) {
          const props = schema.relationships[relationshipName]?.x?.props

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
      if (request.insert) {
        for (const requestItem of request.insert) {
          const mustProps = mustPropsMap.get(requestItem.id) // the must props for a specific node or relationship

          if (mustProps) {
            mustProps.forEach((prop, propName) => {
              switch (prop.id) {
                case enums.idsSchema.Prop:
                case enums.idsSchema.RelationshipProp:
                  const schemaProp = /** @type { td.SchemaProp } */ (prop)
                  const letEmKnow = () => error('mutate__invalid-property-value', `Please ensure all required props are included and align with the data type in the schema, an example of where this is not happening yet is: Node: "${ requestItem.id }", Prop: "${ propName }", Data Type: "${ schemaProp.x.dataType }"`, { nodeName: requestItem.id, requestItem, propName, dataType: schemaProp.x.dataType })

                  switch (schemaProp.x.dataType) {
                    case 'isoString':
                      if (typeof /** @type { td.MutateRequestInsertNodeDefaultItem } */ (/** @type { any } */ (requestItem)).x?.[propName] !== 'string') throw letEmKnow()
                      break
                    default:
                      if (typeof /** @type { td.MutateRequestInsertNodeDefaultItem } */ (/** @type { any } */ (requestItem)).x?.[propName] !== schemaProp.x.dataType) throw letEmKnow()
                      break
                  }
                  break
                case enums.idsSchema.ForwardRelationshipProp:
                case enums.idsSchema.ReverseRelationshipProp:
                  validateNotBidirectionalMustProps(/** @type { td.MutateRequestInsertRelationshipDefaultItem } */(requestItem), prop, propName)
                  break
                case enums.idsSchema.BidirectionalRelationshipProp:
                  const bidirectionalRelationshipProp = /** @type { td.SchemaBidirectionalRelationshipProp } */ (prop)

                  if (!/** @type { td.MutateRequestInsertNodeDefaultItem } */ (/** @type { any } */ (requestItem)).x[getRelationshipProp(bidirectionalRelationshipProp.x.relationshipName)]?.length) {
                    throw error('mutate__missing-must-defined-relationship', 'Please ensure relationships that must be defined, are defined.', { requiredPropName: propName, bidirectionalRelationshipProp, requestItem })
                  }
                  break
              }
            })
          }
        }
      }
    }


    /**
     * @param { td.MutateRequestInsertRelationshipDefaultItem } rSchemaRelationshipProp 
     * @param { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp } schemaRelationshipProp 
     * @param { string } propName 
     */
    function validateNotBidirectionalMustProps (rSchemaRelationshipProp, schemaRelationshipProp, propName) {
      let isValid = false
      const storageUids = []
      const relationshipNodes = []
      const isInverse = schemaRelationshipProp.id === 'ReverseRelationshipProp'
      const relationshipUids = rSchemaRelationshipProp.x[getRelationshipProp(schemaRelationshipProp.x.relationshipName)]

      if (relationshipUids) {
        for (const relationshipUid of relationshipUids) {
          const putEntry = putEntries.get(relationshipUid)

          if (putEntry) relationshipNodes.push(putEntry)
          else storageUids.push(relationshipUid)
        }

        if (relationshipNodes.length) {
          for (const relationshipNode of relationshipNodes) {
            if (rSchemaRelationshipProp.x.uid === relationshipNode[ isInverse ? 'b' : 'a' ]) {
              isValid = true
              break
            }
          }
        }
      }

      if (!isValid) throw error('mutate__missing-must-defined-relationship', `${ propName } is invalid because it is missing relationship props that must be defined, please ensure relationships that must be defined, are defined.`, { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp })
    }


    /** @returns { td.MutateResponse } */
    function conclude () {
      let identityUidMap = /** @type { { [k: string]: string } } */ ({})
      let storagePutEntries = /** @type { { [k: string]: any } } */ ({})

      if (putEntries.size) { // convert from map to object for do storage
        putEntries.forEach((v, k) => storagePutEntries[k] = v)
        passport.storage.put(storagePutEntries)
      }

      if (mapUids.size) mapUids.forEach((v, k) => identityUidMap[k] = v) // convert from map to object for response

      return { identity: identityUidMap }
    }
  } catch (e) {
    console.log('error', e)
    throw e
  }
}
