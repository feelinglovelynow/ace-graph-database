import { td, enums, Schema, SchemaProp, SchemaRelationship } from '#manifest'
import { REQUEST_UID_PREFIX, NODES_KEY, SCHEMA_KEY, getExactIndexKey, getSortIndexKey, ADD_NOW_DATE, getRelationshipProp, getNow, getRelationshipPropsKey, getRelationshipPropsProp } from './variables.js'


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
  const getEntries = await storage.get([SCHEMA_KEY, NODES_KEY])
  const schema = /** @type { Schema } */ (getEntries.get(SCHEMA_KEY) || {})  
  const $nodes = /** @type { mutate$nodes } */ (getEntries.get(NODES_KEY) || {})
  const mapUids = /** @type { MapUids } */ (new Map())
  const sertNodes = /** @type { SertNodes } */ ([])
  const sortIndexAdditions = /**  @type { SortIndexAdditions } */ ([])
  const putEntries = /** @type { PutEntries } */ (new Map())

  for (const action in request) {
    if (action === 'insert' || action === 'upsert') sertPutNodes(schema, $nodes, mapUids, putEntries, sortIndexAdditions, sertNodes, request, request.insert ? 'insert' : 'upsert')
  }

  if (sertNodes.length) addNodesToGraph(schema, mapUids, sertNodes, putEntries)
  if (sortIndexAdditions.length) await addSortIndicesToGraph(storage, sortIndexAdditions, putEntries)

  addUniqueNodesToGraph($nodes, putEntries)
  sertPutRelationships(request, schema, mapUids, putEntries)

  return conclude(storage, putEntries, mapUids)
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
 * @param { mutate$nodes } $nodes 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { PutEntries } putEntries - The entries we will put
 * @param { SortIndexAdditions } sortIndexAdditions 
 * @param { SertNodes } sertNodes 
 * @param { any } rAny 
 * @param { 'insert' | 'upsert' } action 
 */
function sertPutNodes (schema, $nodes, mapUids, putEntries, sortIndexAdditions, sertNodes, rAny, action) {
  for (const rItem of rAny[action]) {
    const requestItem = /** @type { td.MutateSertNode } */ (rItem)

    if (requestItem.$nodeName) {
      if (!requestItem.uid || typeof requestItem.uid !== 'string') throw { id: 'mutate__falsy-uid', message: 'Please pass a request item that includes a uid that is a typeof string', errorData: { requestItem } }
      if (action === 'insert') validatePropertyValues(schema.nodes?.[requestItem.$nodeName])

      const graphUid = getGraphUidAndAddToMapUids(schema, mapUids, requestItem.uid)

      if (Array.isArray($nodes[requestItem.$nodeName])) $nodes[requestItem.$nodeName].push(graphUid) // IF schema $nodes for this uid's node is already an array => push onto it
      else $nodes[requestItem.$nodeName] = [ graphUid ] // IF schema $nodes for this uid's node is not an array => set as array w/ uid as first value

      /** @param { { [propName: string]: SchemaProp } | undefined } nodeProps */
      function validatePropertyValues (nodeProps) {
        for (const nodePropName in nodeProps) {
          const value = nodeProps[nodePropName]

          if (value.must?.includes(enums.must.defined)) {
            switch (value.dataType) {
              case 'isoString':
                if (typeof requestItem?.[nodePropName] !== 'string') throw { id: 'mutate__invalid-property-value', message: `Schema requires an insert for the node "${ requestItem.$nodeName }" to include the property "${ nodePropName }" with a data type of "string" but the request data type is ${ typeof requestItem?.[nodePropName] }`, errorData: { requestItem, nodePropName } }
                break
              default:
                if (typeof requestItem?.[nodePropName] !== value.dataType) throw { id: 'mutate__invalid-property-value', message: `Schema requires an insert for the node "${ requestItem.$nodeName }" to include the property "${ nodePropName }" with a data type of "${ value.dataType }" but the request data type is ${ typeof requestItem?.[nodePropName] }`, errorData: { requestItem, nodePropName } }
                break
            }
          }
        }
      }

      for (const nodePropName in requestItem) { // loop each request property => validate each property => IF invalid throw errors => IF valid do index things
        const rPropValue = requestItem?.[nodePropName]
        const schemaPropValue = schema.nodes?.[requestItem.$nodeName][nodePropName]
        const _errorData = { schema, requestItem, nodePropName }

        if (schemaPropValue?.dataType === enums.dataTypes.string && typeof rPropValue !== 'string') throw { id: 'mutate__invalid-property-value__string', message: 'When the schema property data type is "string", the request typeof must be a "string"', _errorData }
        if (schemaPropValue?.dataType === enums.dataTypes.isoString && typeof rPropValue !== 'string') throw { id: 'mutate__invalid-property-value__isoString', message: 'When the schema property data type is "isoString", the request typeof must be a "string"', _errorData }
        if (schemaPropValue?.dataType === enums.dataTypes.number && typeof rPropValue !== 'number') throw { id: 'mutate__invalid-property-value__number', message: 'When the schema property data type is "number", the request typeof must be a "number"', _errorData }
        if (schemaPropValue?.dataType === enums.dataTypes.boolean && typeof rPropValue !== 'boolean') throw { id: 'mutate__invalid-property-value__boolean', message: 'When the schema property data type is "boolean", the request typeof must be a "boolean"', _errorData }

        const indices = schemaPropValue?.indices

        if (indices) {
          if (indices.includes(enums.indices.exact)) putEntries.set(getExactIndexKey(requestItem.$nodeName, nodePropName, requestItem?.[nodePropName]), graphUid)
          if (indices.includes(enums.indices.sort)) sortIndexAdditions.push([ graphUid, requestItem.$nodeName, nodePropName ])
        }
      }

      sertNodes.push([ requestItem, graphUid ]) // add meta data about each value to sertNodes array, we need to loop them all first, before adding them to the graph, to populate mapUids
    }
  }
}


/**
 * Add relationships for upsert or insert to putEntries
 * @param { td.MutateRequest } request - Request object
 * @param { Schema } schema
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { PutEntries } putEntries - The entries we will put
*/
function sertPutRelationships (request, schema, mapUids, putEntries) {
  if (request.insert) {
    const schemaMustPropsMap = /** @type { SchemaMustPropsMap } */ (new Map())

    for (const rItem of request.insert) {
      const anyItem = /** @type { any } */ (rItem)
      const requestItem = /** @type { td.MutateSertRelationship } */ (anyItem)

      if (requestItem.$relationshipName) {
        const schemaRelationship = schema.relationships?.[requestItem.$relationshipName]

        if (!schemaRelationship) throw { id: 'mutate__unknown-relationship-name', message: 'Please include a relationship name that is defined in your schema', errorData: { schemaRelationships: schema.relationships, relationshipName: requestItem.$relationshipName } }

        if (schemaRelationship.directions?.[0].has === enums.has.many && schemaRelationship.directions?.[1].has === enums.has.many) sertPutManyToMany()
        else sertPutNotManyToMany(putEntries, mapUids, requestItem, schemaRelationship, schemaMustPropsMap)
      }
    }
  }
}


/**
 * @param { PutEntries } putEntries - The entries we will put
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @param { td.MutateSertRelationship } requestItem 
 * @param { SchemaRelationship } schemaRelationship 
 * @param { SchemaMustPropsMap } schemaMustPropsMap 
 */
function sertPutNotManyToMany (putEntries, mapUids, requestItem, schemaRelationship, schemaMustPropsMap) {
  const graphKey = crypto.randomUUID()

  for (const requestItemKey in requestItem) {
    const requestItemValue = requestItem[requestItemKey]
    const relationshipProp = getRelationshipProp(requestItem.$relationshipName)

    if (requestItemValue === ADD_NOW_DATE && schemaRelationship.props?.[requestItemKey].dataType === enums.dataTypes.isoString) requestItem[requestItemKey] = getNow() // ensure there are no "$aceNow" dates in the props
    else if (typeof requestItemValue === 'string' && requestItemValue.startsWith(REQUEST_UID_PREFIX)) {
      overwriteUids(mapUids, requestItem, requestItemKey)
      const node = putEntries.get(requestItem[requestItemKey]) // requestItemValue is the prefix uid (_:chris), requestItem[requestItemKey] is the uid (crypto)
      cleanUpRelationships(putEntries, node, relationshipProp, graphKey)
    } else if (Array.isArray(requestItemValue)) {
      for (let i = 0; i < requestItemValue.length; i++) { // loop the uids
        overwriteUids(mapUids, requestItem[requestItemKey], i) // overwrite any REQUEST_UID_PREFIX uids
        const node = putEntries.get(requestItem[requestItemKey][i])
        cleanUpRelationships(putEntries, node, relationshipProp, graphKey)
      }
    }
  }

  const schemaMustProps = doSchemaMustProps(schemaMustPropsMap, requestItem.$relationshipName, schemaRelationship)
  const arrayRequestItemProps = Object.keys(requestItem)
  const setRequestItemProps = new Set(arrayRequestItemProps)

  schemaMustProps.forEach((schemaProp) => {
    if (!setRequestItemProps.has(schemaProp)) throw { id: 'mutate__missing-must-props', message: 'Please ensure all schema props that must be defined are defined in your insert', errorData: { relationshipName: requestItem.$relationshipName, schemaMustRelationshipProps: Array.from(schemaMustProps), requestItemProps: arrayRequestItemProps } }
  })

  putEntries.set(graphKey, requestItem)
}


/**
 * @param { SchemaMustPropsMap } schemaMustPropsMap 
 * @param { string } relationshipName 
 * @param { SchemaRelationship } schemaRelationship 
 * @returns { Set<string> }
 */
function doSchemaMustProps (schemaMustPropsMap, relationshipName, schemaRelationship) {
  let schemaMustProps = schemaMustPropsMap.get(relationshipName)

  if (!schemaMustProps) {
    schemaMustProps = new Set()

    if (schemaRelationship.props) { // does schema define any props for this relationship
      for (const schemaPropKey in schemaRelationship.props) {  // loop the props defined in the schema
        if (schemaRelationship.props?.[schemaPropKey]?.must?.includes(enums.must.defined)) { // schemaPropKey must be defined in a mutation
          schemaMustProps.add(schemaPropKey)
        }
      }
    }
  
    schemaMustPropsMap.set(relationshipName, schemaMustProps)
  }

  return schemaMustProps
}


/**
 * @param { PutEntries } putEntries - The entries we will put
 * @param { any } node 
 * @param { string } relationshipProp 
 * @param { `${ string }-${ string }-${ string }-${ string }-${ string }` } graphKey 
 */
function cleanUpRelationships (putEntries, node, relationshipProp, graphKey) {
  if (node) {
    const currentRelationshipNode = node[relationshipProp]

    if (currentRelationshipNode) {
      const putEntry = putEntries.get(currentRelationshipNode)

      for (const putEntryKey in putEntry) {
        if (!putEntryKey.startsWith('$') && !putEntryKey.startsWith('_')) {
          if (typeof putEntry[putEntryKey] === 'string') {
            const crn = putEntries.get(putEntry[putEntryKey])
            if (crn[relationshipProp]) delete crn[relationshipProp]
          } else if (Array.isArray(putEntry[putEntryKey])) {
            for (const uid of putEntry[putEntryKey]) {
              const crn = putEntries.get(uid)
              if (crn[relationshipProp]) delete crn[relationshipProp]
            }
          }
        }
      }

      putEntries.delete(currentRelationshipNode)
    }

    node[relationshipProp] = graphKey
  }
}


function sertPutManyToMany () {

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
  }
}


/**
 * @param { Schema } schema 
 * @param { MapUids } mapUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace uid as the value.
 * @param { SertNodes } sertNodes 
 * @param { PutEntries } putEntries - The entries we will put
 */
function addNodesToGraph (schema, mapUids, sertNodes, putEntries) {
  for (const [ requestItem, graphUid ] of sertNodes) { // loop the uids that we'll add to the db from the insert
    for (const requestItemKey in requestItem) {
      const requestItemValue = requestItem[requestItemKey]

      if (requestItemValue === ADD_NOW_DATE && schema.nodes?.[requestItem.$nodeName][requestItemKey].dataType === enums.dataTypes.isoString) requestItem[requestItemKey] = getNow() // ensure there are no "$aceNow" dates in the props

      if (!Array.isArray(requestItemValue)) overwriteUids(mapUids, requestItem, requestItemKey)
      else {
        for (let i = 0; i < requestItemValue.length; i++) { // loop the uids
          overwriteUids(mapUids, requestItemValue, i) // overwrite any REQUEST_UID_PREFIX uids
        }
      }
    }

    putEntries.set(graphUid, requestItem) // The entries we will put
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

    for (const dbUid of uids) { // loop the array of sorted uids + our new uid
      const pr = putEntries.get(dbUid) || (await storage.get(dbUid))

      if (!pr) throw { id: 'mutate__invalid-sort-value', message: 'Uid does not exist in your Ace Database and we are trying to sort with it because of the sort index', _errorData: { uid: dbUid, relationship: prKey, node } }
      if (!pr[prKey]) throw { id: 'mutate__invalid-sort-pr', message: 'Uid does not have the property / relationship we would like to sort by because of @ sort index', _errorData: { uid: dbUid, relationship: prKey, node } }
      else values.set(dbUid, String(pr[prKey])) // cast just incase prValue is not a string (example: number)
    }

    /** @type { string[] } */
    const sortedUniqueUids = [ ...values.entries() ] // unique entries
      .sort((a, b) => Number(a[1] > b[1]) - Number(a[1] < b[1])) // + ascending
      .map(v => v[0]) // + uids only

    putEntries.set(sortKey, sortedUniqueUids)
  }
}


/**
 * @param { mutate$nodes } $nodes - Keeps track of all node uids
 * @param { PutEntries } putEntries - The entries we will put
 */
function addUniqueNodesToGraph ($nodes, putEntries) {
  for (const key in $nodes) {
    $nodes[key] = [ ...new Set($nodes[key]) ]
  }

  putEntries.set(NODES_KEY, $nodes) // add $nodes to database
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
 * [ requestItem, dbUid ].
 * In this array we keep track of meta data for all the items we want to add to the database.
 * We need to go though all the uids once first to fully populate mapUids.
 * @typedef { [ td.MutateSertNode, string ][] } SertNodes
 *
 * 
 * Keeps track of all node uids
 * Example - { User: [ uid1, uid2 ], Session: [ uid3 ] }
 * @typedef { { [k: string]: string[] } } mutate$nodes
 *
 * 
 * As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @typedef { Map<string, string> } MapUids
 * 
 * @typedef { [ `${ string }-${ string }-${ string }-${ string }-${ string }`, `${ string }-${ string }-${ string }-${ string }-${ string }` ] } GraphKeys
 * 
 * @typedef { Map<string, Set<string>> } SchemaMustPropsMap 
 */
