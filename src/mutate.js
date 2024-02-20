import { sign } from './hash.js'
import { error } from './throw.js'
import { td, enums } from '#manifest'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { getRelationshipOptionsDetails } from './getRelationshipOptionsDetails.js'
import { REQUEST_UID_PREFIX, NODE_UIDS_KEY, SCHEMA_KEY, getExactIndexKey, getSortIndexKey, ADD_NOW_DATE, getRelationshipProp, getNow } from './variables.js'


/**
 * Mutate Ace Graph Database
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @param { td.MutateRequest } request
 * @returns { Promise<td.MutateResponse> }
 */
export async function mutate (url, request) {
  /** @type { RequestInit } */
  const requestInit = { body: JSON.stringify(request), method: 'POST', headers: { 'content-type': 'application/json' } }
  const rFetch = await fetch(`${ url }${ enums.endpoints.mutate }`, requestInit)
  return await rFetch.json()
}


/**
 * Mutate Ace Graph Database
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace)
 * @param { td.MutateRequest } request - Request object
 * @returns { Promise<td.MutateResponse> }
*/
export async function _mutate (storage, request) {
  try {
    const getEntries = await storage.get([SCHEMA_KEY, NODE_UIDS_KEY])
    const schema = /** @type { td.Schema } */ (getEntries.get(SCHEMA_KEY) || {})  
    const $nodeUids = /** @type { $nodeUids } */ (getEntries.get(NODE_UIDS_KEY) || {})
    const mapUids = /** @type { MapUids } */ (new Map())
    const sortIndexMap = /**  @type { SortIndexMap } */ (new Map())
    const putEntries = /** @type { PutEntries } */ (new Map())
    const mustPropsMap = getMustPropMap(schema)
    const privateJWKs = /** @type { HashPrivateKeys } */ ({})
    const setNodeNames = /** @type { Set<string> } */ (new Set(Object.keys(schema?.nodes || {})))
    const setRelationshipNames = /** @type { Set<string> } */ (new Set(Object.keys(schema?.relationships || {})))

    if (request.privateJWKs) {
      for (const name in request.privateJWKs) {
        privateJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(request.privateJWKs[name]), getAlgorithmOptions('import'), true, ['sign'])
      }
    }

    for (const action in request) {
      if (action === 'insert') {
        await sertNodes(request, action, schema, setNodeNames, $nodeUids, mapUids, putEntries, sortIndexMap, privateJWKs)
        sertRelationships(request, action, schema, setRelationshipNames, mapUids, putEntries)
      }
    }

    throwIfMissingMustProps(request, mustPropsMap, putEntries)

    if (sortIndexMap.size) await addSortIndicesToGraph(storage, sortIndexMap, putEntries)
    addUniqueNodesToGraph($nodeUids, putEntries)

    return conclude(storage, putEntries, mapUids)
  } catch (e) {
    console.log('error', e)
    throw e
  }
}


/**
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace)
 * @param { PutEntries } putEntries - The entries we will put
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @returns 
 */
function conclude (storage, putEntries, mapUids) {
  let identityUidMap = /** @type { { [k: string]: string } } */ ({})
  let keysPutEntries = /** @type { string[] } */ ([...putEntries.keys()])
  let storagePutEntries = /** @type { { [k: string]: any } } */ ({})

  if (putEntries.size) { // convert from map to object for do storage
    putEntries.forEach((v, k) => storagePutEntries[k] = v)
    storage.put(storagePutEntries)
  }

  if (mapUids.size) mapUids.forEach((v, k) => identityUidMap[k] = v) // convert from map to object for response

  return { identity: identityUidMap, put: keysPutEntries }
}


/**
 * Add nodes for upsert or insert to putEntries
 * @param { td.MutateRequest } request 
 * @param { 'insert' } action 
 * @param { td.Schema } schema
 * @param { Set<string> } setNodeNames 
 * @param { $nodeUids } $nodeUids 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { PutEntries } putEntries - The entries we will put
 * @param { SortIndexMap } sortIndexMap 
 * @param { HashPrivateKeys } privateJWKs 
 */
async function sertNodes (request, action, schema, setNodeNames, $nodeUids, mapUids, putEntries, sortIndexMap, privateJWKs) {
  const sertNodesArray = /** @type { [ td.MutateRequestInsertItem, string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate mapUids

  for (let i = 0; i < /** @type { td.MutateRequestInsertItem[] } */(request[action])?.length; i++) {
    const requestItem = /** @type { td.MutateRequestInsertNodeDefaultItem } */ (request[action]?.[i])

    if (requestItem && setNodeNames.has(requestItem.id)) {
      if (!requestItem?.x?.uid || typeof requestItem.x.uid !== 'string') throw error('mutate__falsy-uid', 'Please pass a request item that includes a uid that is a typeof string', { requestItem })

      const graphUid = getGraphUidAndAddToMapUids(schema, mapUids, requestItem.x.uid)

      if (Array.isArray($nodeUids[requestItem.id])) $nodeUids[requestItem.id].push(graphUid) // IF schema $nodeUids for this uid's node is already an array => push onto it
      else $nodeUids[requestItem.id] = [ graphUid ] // IF schema $nodeUids for this uid's node is not an array => set as array w/ uid as first value

      for (const nodePropName in requestItem.x) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
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

          const indices = schemaProp?.x.indices

          if (indices) {
            if (indices.includes(enums.indices.exact)) putEntries.set(getExactIndexKey(requestItem.id, nodePropName, nodePropValue), graphUid)
            if (indices.includes(enums.indices.sort)) {
              const key =`${ requestItem.id }__${ nodePropName }`
              const value = sortIndexMap.get(key) || { nodeName: requestItem.id, nodePropName, uids: /** @type { string[] } */ ([]) }

              value.uids.push(graphUid)
              sortIndexMap.set(key, value)
            }
          }

          if (schemaProp.x.dataType === enums.dataTypes.isoString && nodePropValue === ADD_NOW_DATE) requestItem.x[nodePropName] = getNow()
        }
      }

      sertNodesArray.push([ requestItem, graphUid ]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate mapUids
    }
  }

  for (const [ requestItem, graphUid ] of sertNodesArray) { // loop the uids that we'll add to the graph
    for (const requestItemKey in requestItem.x) {
      overwriteUids(mapUids, requestItem, requestItemKey)
    }

    putEntries.set(graphUid, requestItem) // The entries we will put
  }
}


/**
 * Insert / Upsert Relationships
 * @param { td.MutateRequest } request - Request object
 * @param { 'insert' } action 
 * @param { td.Schema } schema
 * @param { Set<string> } setRelationshipNames 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { PutEntries } putEntries - The entries we will put
*/
function sertRelationships (request, action, schema, setRelationshipNames, mapUids, putEntries) {
  for (let i = 0; i < /** @type { td.MutateRequestInsertItem[] } */(request[action])?.length; i++) {
    const requestItem = /** @type { td.MutateRequestInsertRelationshipDefaultItem } */ (request[action]?.[i])

    if (requestItem && setRelationshipNames.has(requestItem.id)) {
      const schemaRelationship = schema.relationships?.[requestItem.id]

      if (!schemaRelationship) throw error('mutate__unknown-relationship-name', `The relationship name ${ requestItem.id } is not defined in your schema, please include a relationship name that is defined in your schema`, { relationshipName: requestItem.id })

      sertRelationship(putEntries, mapUids, requestItem, schemaRelationship)
    }
  }
}


/**
 * @param { PutEntries } putEntries - The entries we will put
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { td.MutateRequestInsertRelationshipDefaultItem } requestItem 
 * @param { any } schemaRelationship 
 */
function sertRelationship (putEntries, mapUids, requestItem, schemaRelationship) {
  const graphKey = crypto.randomUUID()

  for (const requestItemKey in requestItem.x) {
    const requestItemValue = requestItem.x[requestItemKey]

    if (requestItemValue === ADD_NOW_DATE && schemaRelationship.props?.[requestItemKey]?.dataType === enums.dataTypes.isoString) requestItem.x[requestItemKey] = getNow() // populate now timestamp
    else if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) overwriteUids(mapUids, requestItem, requestItemKey)
  }

  const relationshipProp = getRelationshipProp(requestItem.id)
  addRelationshipToNode('a', putEntries, requestItem, relationshipProp, graphKey)
  addRelationshipToNode('b', putEntries, requestItem, relationshipProp, graphKey)

  putEntries.set(graphKey, requestItem)
}


/**
 * @param { 'a' | 'b' } direction
 * @param { PutEntries } putEntries - The entries we will put
 * @param { td.MutateRequestInsertRelationshipDefaultItem } requestItem 
 * @param { string } relationshipProp 
 * @param { string } graphKey 
 */
function addRelationshipToNode(direction, putEntries, requestItem, relationshipProp, graphKey) {
  const node = putEntries.get(requestItem.x[ direction ])

  if (!node[relationshipProp]) node[relationshipProp] = [ graphKey ]
  else node[relationshipProp].push(graphKey)
}


/**
 * @param { td.Schema } schema 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace uid as the value.
 * @param { string } insertUid 
 * @returns { string }
 */
function getGraphUidAndAddToMapUids (schema, mapUids, insertUid) {
  let graphUid // this will be the uid that is added to the graph

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
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace uid as the value.
 * @param { td.MutateRequestInsertItem } requestItem
 * @param { string | number } requestItemKey
 */
function overwriteUids (mapUids, requestItem, requestItemKey) {
  const requestItemValue = requestItem.x[requestItemKey]

  if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
    const graphUid = mapUids.get(requestItemValue)

    if (graphUid) requestItem.x[requestItemKey] = graphUid
    else throw error('mutate__invalid-uid', `The uid ${ requestItemValue } is invalid b/c each uid, with an ace uid prefix, must be defined in a node`, { uid: requestItemValue })
  }
}


/**
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage Ace
 * @param { SortIndexMap } sortIndexMap 
 * @param { PutEntries } putEntries - The entries we will put
 */
async function addSortIndicesToGraph (storage, sortIndexMap, putEntries) {
  for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
    let nodes = []
    const storageUids = []

    for (const uid of uids) {
      const putEntryNode = putEntries.get(uid)

      if (putEntryNode) nodes.push(putEntryNode)
      else storageUids.push(uid)
    }

    if (storageUids.length) nodes.push(...(/** @type { Map<string, any> } */ (await storage.get(storageUids)).values()))

    nodes = nodes.sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

    putEntries.set(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid))
  }
}


/**
 * @param { $nodeUids } $nodeUids - Keeps track of all node uids
 * @param { PutEntries } putEntries - The entries we will put
 */
function addUniqueNodesToGraph ($nodeUids, putEntries) {
  for (const key in $nodeUids) {
    $nodeUids[key] = [ ...new Set($nodeUids[key]) ]
  }

  putEntries.set(NODE_UIDS_KEY, $nodeUids) // add $nodeUids to database
}


/**
 * @param { td.Schema } schema 
 * @returns { MustPropsMap }
 */
function getMustPropMap (schema) {
  const mustPropsMap = /** @type { MustPropsMap } */ (new Map())

  if (schema) {
    for (const nodeName in schema.nodes) {
      for (const nodePropName in schema.nodes[nodeName]) {
        if (schema.nodes[nodeName][nodePropName]?.x?.options?.includes('defined')) {
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
          if (props[propName].x?.options?.includes('defined')) {
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


/**
 * @param { td.MutateRequest } request - Request object
 * @param { MustPropsMap } mustPropsMap 
 * @param { PutEntries } putEntries 
 */
function throwIfMissingMustProps (request, mustPropsMap, putEntries) {
  if (request.insert) {
    for (const requestItem of request.insert) {
      const mustProps = mustPropsMap.get(requestItem.id)

      if (mustProps) {
        mustProps.forEach((prop, propName) => {
          switch (prop.id) {
            case enums.idsSchema.Prop:
              const schemaProp = /** @type { td.SchemaProp } */ (prop)
              const letEmKnow = () => error('mutate__invalid-property-value', `Please ensure all required props are included and align with the data type in the schema, an example of where this is not happening yet is: Node: "${ requestItem.id }", Prop: "${ propName }", Data Type: "${ schemaProp.x.dataType }"`, { nodeName: requestItem.id, requestItem, propName, dataType: schemaProp.x.dataType })

              switch (schemaProp.x.dataType) {
                case 'isoString':
                  if (typeof requestItem?.x?.[propName] !== 'string') throw letEmKnow()
                  break
                default:
                  if (typeof requestItem?.x?.[propName] !== schemaProp.x.dataType) throw letEmKnow()
                  break
              }
              break
            case enums.idsSchema.RelationshipProp:
              const schemaRelationshipProp = /** @type { td.SchemaRelationshipProp } */ (prop)
              const { isInverse, isBidirectional } = getRelationshipOptionsDetails(schemaRelationshipProp.x.options)

              if (!isBidirectional) validateNotBidirectionalMustProps(isInverse, /** @type { td.MutateRequestInsertRelationshipDefaultItem } */ (requestItem), schemaRelationshipProp, putEntries, propName)
              else { // isBidirectional
                if (!requestItem.x[getRelationshipProp(schemaRelationshipProp.x.relationshipName)]?.length) {
                  throw error('mutate__missing-must-defined-relationship', 'Please ensure relationships that must be defined, are defined.', { requiredPropName: propName, schemaRelationshipProp, requestItem })
                }
              }
              break
          }
        })
      }
    }
  }
}


/**
 * @param { boolean } isInverse 
 * @param { td.MutateRequestInsertRelationshipDefaultItem } rSchemaRelationshipProp 
 * @param { td.SchemaRelationshipProp } schemaRelationshipProp 
 * @param { PutEntries } putEntries 
 * @param { string } propName 
 */
function validateNotBidirectionalMustProps (isInverse, rSchemaRelationshipProp, schemaRelationshipProp, putEntries, propName) {
  let isValid = false
  const storageUids = []
  const relationshipNodes = []
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


/**
 * The entries we will put
 * @typedef { Map<string, any> } PutEntries
 *
 * 
 * The entries we will delete
 * @typedef { Set<string> } DeletetEntries
 *
 * 
 * As we find properties that according to the schema need a sort index insert we will keep track of them here.
 * Once we get them all together, we sort them, and then add to graph
 * @typedef { Map<string, { nodeName: string, nodePropName: string, uids: string[] }> } SortIndexMap
 *
 * 
 * [ insertUid, node ]
 * @typedef { Map<string, td.MutateRequest> } DeleteNodes
 *
 * 
 * Keeps track of all node uids
 * $nodeUidsMap: { User: [ 'uid_1' ] },
 * @typedef { { [nodeName: string]: string[] } } $nodeUids
 *
 * 
 * As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @typedef { Map<string, string> } MapUids
 * 
 * @typedef { Map<string, Map<string, (td.SchemaProp | td.SchemaRelationshipProp)>> } MustPropsMap 
 * @typedef { { [key: string]: CryptoKey } } HashPrivateKeys 
 */
