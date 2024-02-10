import { td, enums, Schema, SchemaProp, SchemaRelationshipProp } from '#manifest'
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
    const schema = /** @type { Schema } */ (getEntries.get(SCHEMA_KEY) || {})  
    const $nodeUids = /** @type { $nodeUids } */ (getEntries.get(NODE_UIDS_KEY) || {})
    const mapUids = /** @type { MapUids } */ (new Map())
    const sortIndexAdditions = /**  @type { SortIndexAdditions } */ ([])
    const putEntries = /** @type { PutEntries } */ (new Map())
    const mustPropsMap = getMustPropMap(schema)

    for (const action in request) {
      if (action === 'insert' || action === 'upsert') {
        sertNodes(schema, $nodeUids, mapUids, putEntries, sortIndexAdditions, request, request.insert ? 'insert' : 'upsert')
        sertRelationships(request, schema, mapUids, putEntries)
      }
    }

    throwIfMissingMustProps(request, mustPropsMap, putEntries)

    if (sortIndexAdditions.length) await addSortIndicesToGraph(storage, sortIndexAdditions, putEntries)
    addUniqueNodesToGraph($nodeUids, putEntries)

    return conclude(storage, putEntries, mapUids)
  } catch (error) {
    console.log('error', error)
    throw error
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
 * @param { Schema } schema
 * @param { $nodeUids } $nodeUids 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { PutEntries } putEntries - The entries we will put
 * @param { SortIndexAdditions } sortIndexAdditions 
 * @param { any } rAny 
 * @param { 'insert' | 'upsert' } action 
 */
function sertNodes (schema, $nodeUids, mapUids, putEntries, sortIndexAdditions, rAny, action) {
  const sertNodesArray = /** @type { [ td.MutateSertNode, string ][] } */ ([]) // In this array we keep track of meta data for all the items we want to add to the graph. We need to go though all the uids once first to fully populate mapUids


  for (const rItem of rAny[action]) {
    const requestItem = /** @type { td.MutateSertNode } */ (rItem)

    if (requestItem.$nodeName) {
      if (!requestItem.uid || typeof requestItem.uid !== 'string') throw { id: 'mutate__falsy-uid', message: 'Please pass a request item that includes a uid that is a typeof string', errorData: { requestItem } }

      const graphUid = getGraphUidAndAddToMapUids(schema, mapUids, requestItem.uid)

      if (Array.isArray($nodeUids[requestItem.$nodeName])) $nodeUids[requestItem.$nodeName].push(graphUid) // IF schema $nodeUids for this uid's node is already an array => push onto it
      else $nodeUids[requestItem.$nodeName] = [ graphUid ] // IF schema $nodeUids for this uid's node is not an array => set as array w/ uid as first value

      for (const nodePropName in requestItem) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
        const nodePropValue = requestItem?.[nodePropName]
        const schemaProp = /** @type { SchemaProp } */ (schema.nodes?.[requestItem.$nodeName][nodePropName])

        if (nodePropName !== '$nodeName' && nodePropName !== 'uid') {
          if (schemaProp?.info?.name !== 'SchemaProp') throw 'schema props only'

          const _errorData = { schema, schemaProp, requestItem, nodePropName, nodePropValue }

          if (schemaProp.dataType === enums.dataTypes.string && typeof nodePropValue !== 'string') throw { id: 'mutate__invalid-property-value__string', message: 'When the schema property data type is "string", the request typeof must be a "string"', _errorData }
          if (schemaProp.dataType === enums.dataTypes.isoString && typeof nodePropValue !== 'string') throw { id: 'mutate__invalid-property-value__isoString', message: 'When the schema property data type is "isoString", the request typeof must be a "string"', _errorData }
          if (schemaProp.dataType === enums.dataTypes.number && typeof nodePropValue !== 'number') throw { id: 'mutate__invalid-property-value__number', message: 'When the schema property data type is "number", the request typeof must be a "number"', _errorData }
          if (schemaProp.dataType === enums.dataTypes.boolean && typeof nodePropValue !== 'boolean') throw { id: 'mutate__invalid-property-value__boolean', message: 'When the schema property data type is "boolean", the request typeof must be a "boolean"', _errorData }

          const indices = schemaProp?.indices

          if (indices) {
            if (indices.includes(enums.indices.exact)) putEntries.set(getExactIndexKey(requestItem.$nodeName, nodePropName, nodePropValue), graphUid)
            if (indices.includes(enums.indices.sort)) sortIndexAdditions.push([graphUid, requestItem.$nodeName, nodePropName])
          }

          if (schemaProp.dataType === enums.dataTypes.isoString && nodePropValue === ADD_NOW_DATE) requestItem[nodePropName] = getNow()
        }
      }

      sertNodesArray.push([ requestItem, graphUid ]) // add meta data about each value to sertNodesArray array, we need to loop them all first, before adding them to the graph, to populate mapUids
    }
  }


  for (const [ requestItem, graphUid ] of sertNodesArray) { // loop the uids that we'll add to the graph
    for (const requestItemKey in requestItem) {
      overwriteUids(mapUids, requestItem, requestItemKey)
    }

    putEntries.set(graphUid, requestItem) // The entries we will put
  }
}


/**
 * Insert / Upsert Relationships
 * @param { td.MutateRequest } request - Request object
 * @param { Schema } schema
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { PutEntries } putEntries - The entries we will put
*/
function sertRelationships(request, schema, mapUids, putEntries) {
  if (request.insert) {
    for (const rItem of request.insert) {
      const anyItem = /** @type { any } */ (rItem)
      const requestItem = /** @type { td.MutateSertRelationship } */ (anyItem)

      if (requestItem.$relationshipName) {
        const schemaRelationship = schema.relationships?.[requestItem.$relationshipName]

        if (!schemaRelationship) throw { id: 'mutate__unknown-relationship-name', message: 'Please include a relationship name that is defined in your schema', errorData: { schemaRelationships: schema.relationships, relationshipName: requestItem.$relationshipName } }

        sertRelationship(putEntries, mapUids, requestItem, schemaRelationship)
      }
    }
  }
}


/**
 * @param { PutEntries } putEntries - The entries we will put
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { td.MutateSertRelationship } requestItem 
 * @param { any } schemaRelationship 
 */
function sertRelationship (putEntries, mapUids, requestItem, schemaRelationship) {
  const graphKey = crypto.randomUUID()

  for (const requestItemKey in requestItem) {
    const requestItemValue = requestItem[requestItemKey]

    if (requestItemValue === ADD_NOW_DATE && schemaRelationship.props?.[requestItemKey]?.dataType === enums.dataTypes.isoString) requestItem[requestItemKey] = getNow() // populate now timestamp
    else if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) overwriteUids(mapUids, requestItem, requestItemKey)
  }

  const relationshipProp = getRelationshipProp(requestItem.$relationshipName)
  addRelationshipToNode('a', putEntries, requestItem, relationshipProp, graphKey)
  addRelationshipToNode('b', putEntries, requestItem, relationshipProp, graphKey)

  putEntries.set(graphKey, requestItem)
}


/**
 * @param { 'a' | 'b' } direction
 * @param { PutEntries } putEntries - The entries we will put
 * @param { td.MutateSertRelationship } requestItem 
 * @param { string } relationshipProp 
 * @param { string } graphKey 
 */
function addRelationshipToNode(direction, putEntries, requestItem, relationshipProp, graphKey) {
  const node = putEntries.get(requestItem[ direction ])

  if (!node[relationshipProp]) node[relationshipProp] = [ graphKey ]
  else node[relationshipProp].push(graphKey)
}


/**
 * @param { Schema } schema 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace uid as the value.
 * @param { string } insertUid 
 */
function getGraphUidAndAddToMapUids (schema, mapUids, insertUid) {
  let graphUid // this will be the uid that is added to the graph

  if (typeof insertUid !== 'string') throw { id: 'mutate__uid-invalid-type', message: 'Please include only typeof "string" for each uid', _errorData: { schema, uid: insertUid } }

  if (!insertUid.startsWith(REQUEST_UID_PREFIX)) graphUid = insertUid
  else {
    if (mapUids.get(insertUid)) throw { id: 'mutate__duplicate-uid', message: 'Please do not include duplicate uids for insert', _errorData: { schema, uid: insertUid } } // IF this uid is already in the map (already defined as a uid / not within a prop) => throw

    graphUid = crypto.randomUUID() // set graph uid
    mapUids.set(insertUid, graphUid) // add uid from insert array as the key and uid that'll go into the db as the value
  }

  return graphUid
}


/**
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace uid as the value.
 * @param { { [ k: string ]: any } } requestItem
 * @param { string | number } requestItemKey
 */
function overwriteUids (mapUids, requestItem, requestItemKey) {
  const requestItemValue = requestItem[requestItemKey]

  if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
    const graphUid = mapUids.get(requestItemValue)

    if (graphUid) requestItem[requestItemKey] = graphUid
    else throw { id: 'mutate__invalid-uid', message: 'Each uid, with an ace uid prefix, must be defined in a node', _errorData: { uid: requestItemValue } }
  }
}


/**
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage Ace
 * @param { SortIndexAdditions } sortIndexAdditions 
 * @param { PutEntries } putEntries - The entries we will put
 */
async function addSortIndicesToGraph (storage, sortIndexAdditions, putEntries) {
  for (const [ uid, node, prKey ] of sortIndexAdditions) {
    const values = /** We will store the uid and the value of the pr we'd love to sort by in this array @type { Map<string, string> } */ (new Map())
    const sortKey = getSortIndexKey(node, prKey) // the key name that will store the sorted uids
    const uids = putEntries.get(sortKey) || (await storage.get(sortKey)) || [] // the uids that are already sorted or an empty array

    uids.push(uid) // add provided uid to the array

    for (const graphUid of uids) { // loop the array of sorted uids + our new uid
      const pr = putEntries.get(graphUid) || (await storage.get(graphUid))

      if (!pr) throw { id: 'mutate__invalid-sort-value', message: 'Uid does not exist in your Ace Database and we are trying to sort with it because of the sort index', _errorData: { uid: graphUid, relationship: prKey, node } }
      if (!pr[prKey]) throw { id: 'mutate__invalid-sort-pr', message: 'Uid does not have the property / relationship we would like to sort by because of @ sort index', _errorData: { uid: graphUid, relationship: prKey, node } }
      else values.set(graphUid, String(pr[prKey])) // cast just incase prValue is not a string (example: number)
    }

    /** @type { string[] } */
    const sortedUniqueUids = [ ...values.entries() ] // unique entries
      .sort((a, b) => Number(a[1] > b[1]) - Number(a[1] < b[1])) // + ascending
      .map(v => v[0]) // + uids only

    putEntries.set(sortKey, sortedUniqueUids)
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
 * @param { Schema } schema 
 * @returns { MustPropsMap }
 */
function getMustPropMap (schema) {
  const mustPropsMap = /** @type { MustPropsMap } */ (new Map())

  if (schema) {
    for (const nodeName in schema.nodes) {
      for (const nodePropName in schema.nodes[nodeName]) {
        if (schema.nodes[nodeName][nodePropName]?.options?.includes('defined')) { // schemaPropKey must be defined in a mutation
          const map = mustPropsMap.get(nodeName) || new Map()
          map.set(nodePropName, schema.nodes[nodeName][nodePropName])
          mustPropsMap.set(nodeName, map)
        }
      }
    }

    for (const relationshipName in schema.relationships) {
      if (schema.relationships[relationshipName]?.props) {
        for (const propName in schema.relationships[relationshipName].props) {
          const relationship = (schema.relationships[relationshipName].props)

          if (relationship?.[propName]?.options?.includes('defined')) { // schemaPropKey must be defined in a mutation
            const map = mustPropsMap.get(relationshipName) || new Map()
            map.set(propName, relationship[propName])
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
    for (const rItem of request.insert) {
      const rAnyItem = /** @type { any }*/ (rItem)
      const key = rAnyItem.$nodeName || rAnyItem.$relationshipName
      const mustProps = mustPropsMap.get(key)

      if (mustProps) {
        mustProps.forEach((prop, propName) => {
          switch (prop.info.name) {
            case 'SchemaProp':
              const schemaProp = /** @type { SchemaProp } */ (prop)
              const rSertNode = /** @type { td.MutateSertNode }*/ (rAnyItem)
              const error = { id: 'mutate__invalid-property-value', message: `Please ensure all required props are included as the data type in the schema for: "${ key }", "${ propName }", "${ schemaProp.dataType }"`, errorData: { key, requestItem: rSertNode, propName, dataType: schemaProp.dataType } }

              switch (schemaProp.dataType) {
                case 'isoString':
                  if (typeof rSertNode?.[propName] !== 'string') throw error
                  break
                default:
                  if (typeof rSertNode?.[propName] !== schemaProp.dataType) throw error
                  break
              }
              break
            case 'SchemaRelationshipProp':
              const schemaRelationshipProp = /** @type { SchemaRelationshipProp } */ (prop)
              const rSertRelationship = /** @type { td.MutateSertRelationship }*/ (rAnyItem)
              const { isInverse, isBidirectional } = getRelationshipOptionsDetails(schemaRelationshipProp.options)

              if (!isBidirectional) validateNotBidirectionalMustProps(isInverse, rSertRelationship, schemaRelationshipProp, putEntries, propName)
              else { // isBidirectional
                if (!rSertRelationship[getRelationshipProp(schemaRelationshipProp.relationshipName)]?.length) {
                  throw { id: 'mutate__missing-must-defined-relationship', message: 'Please ensure relationships that must be defined, are defined.', errorData: { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp: rSertRelationship } }
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
 * @param { td.MutateSertRelationship } rSchemaRelationshipProp 
 * @param { SchemaRelationshipProp } schemaRelationshipProp 
 * @param { PutEntries } putEntries 
 * @param { string } propName 
 */
function validateNotBidirectionalMustProps (isInverse, rSchemaRelationshipProp, schemaRelationshipProp, putEntries, propName) {
  let isValid = false
  const storageUids = []
  const relationshipNodes = []
  const relationshipUids = rSchemaRelationshipProp[getRelationshipProp(schemaRelationshipProp.relationshipName)]

  if (relationshipUids) {
    for (const relationshipUid of relationshipUids) {
      const putEntry = putEntries.get(relationshipUid)

      if (putEntry) relationshipNodes.push(putEntry)
      else storageUids.push(relationshipUid)
    }

    if (relationshipNodes.length) {
      for (const relationshipNode of relationshipNodes) {
        if (rSchemaRelationshipProp.uid === relationshipNode[ isInverse ? 'b' : 'a' ]) {
          isValid = true
          break
        }
      }
    }
  }

  if (!isValid) throw { id: 'mutate__missing-must-defined-relationship', message: 'Please ensure relationships that must be defined, are defined.', errorData: { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp } }
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
 * [ dbUid, node, prKey ].
 * As we find prKey's that according to the schema need a sort index insert we will keep track of them here.
 * Once we get them all together, we sort them, and then add to db.
 * @typedef { [string, string, string][] } SortIndexAdditions
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
 * @typedef { Map<string, Map<string, (SchemaProp | SchemaRelationshipProp)>> } MustPropsMap 
 */
