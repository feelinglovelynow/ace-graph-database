import { error } from './throw.js'
import { getAlias } from './getAlias.js'
import { queryOptionsArray } from './queryOptions.js'
import { td, enums, Schema, QuerySort, SchemaRelationshipProp } from '#manifest'
import { getRelationshipOptionsDetails } from './getRelationshipOptionsDetails.js'
import { NODE_UIDS_KEY, getRelationshipProp, SCHEMA_KEY, getExactIndexKey, getSortIndexKey } from './variables.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'


/**
 * Run a query / queries.
 * If no results found for a query => the key is null.
 * IF a pr does not have any data => the pr in the response is null.
 * @param { td.QueryRequest } rQuery 
 * @returns { Promise<{ [k: string]: any } | any> }
 */
export async function query (rQuery) {
  const requestInit = /** @type { RequestInit } */ ({ body: JSON.stringify(rQuery), method: 'POST', headers: { 'content-type': 'application/json' } })
  const rFetch = await fetch(`${ rQuery.url }${ enums.endpoints.query }`, requestInit)
  return await rFetch.json()
}


/**
 * Run a query / queries.
 * If no results found for a query => the key is null.
 * IF a pr does not have any data => the pr in the response is null.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.QueryRequest } request
 * @returns { Promise<{ [k: string]: any }> }
 */
export async function _query (storage, request) {
  try {
    const response = /** @type { { [k: string]: any } } */ ({})

    if (request.property) response[getAlias(request.format) || request.property] = await getResponse(storage, request) // run requested query

    return response
  } catch (e) {
    console.log('error', e)
    throw e
  }
}


/**
 * Return response of a single query.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.QueryRequest } request 
 * @returns { Promise<any | any[]> }
 */
async function getResponse (storage, request) {
  if (!request.info.nodeName) throw error('query__falsy-info-node-name', 'The request is invalid because request.info.nodeName is falsy', { request })

  let response = null // the response that will be returned
  const tempResponse = /** The formatted response @type { td.QueryResponse } */ ({ object: null, array: [] })
  const cache = /** @type { QueryCache } */ (new Map())

  if (request.info.name === enums.classInfoNames.Uid) {
    const qAny = /** @type { any } */ (request)
    const query = /** @type { td.QueryRequestUid } */ (qAny)

    if (!query.uid) throw error('query__falsy-uid', 'The request is invalid because request.uid is falsy', { request: query })
    const schema = await storage.get(SCHEMA_KEY)

    if (!schema) throw error('query__falsy-schema', 'The request is invalid because we queried your graph for a schema but the schema is falsy', { request: query, schema })

    await addNodeToResponse(storage, tempResponse, query, { uid: query.uid }, cache, schema, null) // IF query by uid requested => add node to response by uid
    response = tempResponse.object || null
  // @ts-ignore
  } else if (request.info.name === enums.classInfoNames.Exact) { // IF query using exact index requested
    const qAny = /** @type { any } */ (request)
    const query = /** @type { td.QueryRequestExact } */ (qAny)

    if (query.exact) {
      if (!query.exact) throw error('query__falsy-exact', 'The request is invalid because request.exact is falsy', { request: query })

      const indexKey = getExactIndexKey(query.info.nodeName, query.exact.property, query.exact.value) // get uid of node via exact index
      const getEntries = await storage.get([ SCHEMA_KEY, indexKey ])
      const schema = getEntries.get(SCHEMA_KEY)

      if (!schema) throw error('query__falsy-schema', 'The request is invalid because we queried your graph for a schema but the schema is falsy', { request: query, schema })

      const uid = getEntries.get(indexKey)

      if (!uid) throw error('query__invalid-index', `The request is invalid because the node name ${ query.info.nodeName } and the property ${ query.exact.property } does not have an exact index in your schema`, { request: query }) 
      else {
        await addNodeToResponse(storage, tempResponse, query, uid, cache, schema, null) // IF uid found => add node to response by uid
        response = tempResponse.object || null
      }
    }
  } else if (request.info.name === enums.classInfoNames.Many) { // IF query by node requested
    let uids
    let isUsingSortIndexNodes = false
    let anySchema = /** @type { any } */ (undefined)
    const qAny = /** @type { any } */ (request)
    const query = /** @type { td.QueryRequestMany } */ (qAny)
    const hashPublicKeys = /** @type { td.HashPublicKeys } */ ({})
    const sortOptions = /** @type { QuerySort } */ (query.format.$options?.find(o => o.info.name === enums.classInfoNames.QuerySort))

    if (query.hashPublicKeys) {
      for (const key in query.hashPublicKeys) {
        hashPublicKeys[key] = await crypto.subtle.importKey('jwk', JSON.parse(query.hashPublicKeys[key]), getAlgorithmOptions('import'), true, ['verify'])
      }
    }

    if (sortOptions) {
      const indexKey = getSortIndexKey(query.info.nodeName, sortOptions.property) // IF sorting by an property requested => see if property is a sort index

      if (indexKey) {
        const getEntries = await storage.get([ SCHEMA_KEY, indexKey ])

        uids = getEntries.get(indexKey)
        anySchema = getEntries.get(SCHEMA_KEY)
      }
    }

    if (uids && anySchema) isUsingSortIndexNodes = true // IF property is a sort index => tip flag to true
    else {
      const getEntries = await storage.get([SCHEMA_KEY, NODE_UIDS_KEY ])
      const allNodes = getEntries.get(NODE_UIDS_KEY)

      anySchema = getEntries.get(SCHEMA_KEY)
      uids = allNodes ? allNodes[query.info.nodeName] : [] // IF property is not a sort index => get unsorted node uids from $nodeUids in database
    }

    if (!anySchema) error('query__falsy-schema', 'The request is invalid because we queried your graph for a schema but the schema is falsy', { request: query, schema: anySchema })

    const schema = /** @type { Schema } */ (anySchema)

    await runFnThenFormatArray(
      storage,
      cache,
      schema,
      uids,
      query.format,
      isUsingSortIndexNodes,
      hashPublicKeys,
      (node) => addNodeToResponse(storage, tempResponse, query, { node }, cache, schema, hashPublicKeys),
      () => tempResponse.array,
      (array) => tempResponse.array = array)

    response = tempResponse.array.length ? tempResponse.array : null
  }

  return response
}


/**
 * Add a node to the response based on the provided uid
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.QueryResponse } response 
 * @param { td.QueryRequestUid | td.QueryRequestExact | td.QueryRequestMany } query 
 * @param { { node?: any, uid?: string } } item 
 * @param { QueryCache } cache
 * @param { Schema } schema
 * @param { td.HashPublicKeys | null } hashPublicKeys
 * @returns { Promise<void> }
 */
async function addNodeToResponse (storage, response, query, item, cache, schema, hashPublicKeys) {
  const responseNode = await addToResponse(storage, item, query.format, cache, schema, null, hashPublicKeys) // validate / add the relationships in query.format to response

  if (responseNode) { // IF relationships added to response successfully AND required node present
    if (query.exact || query.uid) response.object = responseNode // IF query.uid OR query.exact requested => set response object
    else response.array.push(responseNode) // ELSE IF just query.info.nodeName requested => add to response array
  }
}


/**
 * For each relationship in the section of the query format, validate / add relationship value to response
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { { node?: any, uid?: string } } item 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { QueryCache } cache
 * @param { Schema } schema
 * @param { { key: string, value: any } | null } graphRelationship
 * @param { td.HashPublicKeys | null } hashPublicKeys
 * @returns { Promise<any> }
 */
async function addToResponse (storage, item, queryFormatSection, cache, schema, graphRelationship, hashPublicKeys) {
  if (!schema.nodes?.[queryFormatSection.$info.nodeName]) throw error('query__invalid-query-format-node', `The request is invalid because the node name "${ queryFormatSection.$info.nodeName }" defined @ queryFormatSection.$info.nodeName is not a node defined in your schema`, { queryFormatSection })

  let graphNode = item.node
  let isValid = true // IF this is a valid relationship, start true and if any issues arise tip to false

  const uid = item.uid || item.node?.uid
  const responseNode = /** We will add properties to this object based on the query and what we find in the db @type { { [k: string]: any } } */ ({})

  if (!graphNode && uid) {
    const rGetPutCache = await getPutCache(storage, cache, [ uid ])
    graphNode = rGetPutCache.get(uid)
  }

  if (!graphNode) isValid = false // IF there is no value @ the provided uid => tip isValid flag to false
  else {
    for (const queryFormatPropertyKey in queryFormatSection) { // loop a section of query.format object
      const queryFormatPropertyValue = queryFormatSection[queryFormatPropertyKey]
      const isTruthy = queryFormatPropertyValue === true
      const alias = typeof queryFormatPropertyValue?.alias === 'string' ? queryFormatPropertyValue.alias : null
      const schemaNodeProp = schema.nodes[queryFormatSection.$info.nodeName]?.[queryFormatPropertyKey]
      const schemaRelationshipProp = queryFormatSection?.$info?.relationshipName ? /**@type { any } */ (schema.relationships)?.[queryFormatSection.$info.relationshipName]?.props?.[queryFormatPropertyKey] : null

      if (queryFormatPropertyKey === 'uid') { // not a prop defined in the schema
        if (isTruthy) responseNode.uid = uid
        else if (alias) responseNode[alias] = uid
      } else if (queryFormatPropertyKey === '_uid' && graphRelationship) { // not a prop defined in the schema
        if (isTruthy) responseNode._uid = graphRelationship.key
        else if (alias) responseNode[alias] = graphRelationship.key
      } else if (schemaRelationshipProp?.info.name === 'SchemaProp' && graphRelationship) { // this prop is defined @ schema.relationships
        if (isTruthy) responseNode[queryFormatPropertyKey] = graphRelationship.value[queryFormatPropertyKey]
        else if (alias) responseNode[alias] = graphRelationship?.value[queryFormatPropertyKey]
      } else if (schemaNodeProp?.info.name === 'SchemaProp') { // this prop is defined @ schema.nodes and is a SchemaProp
        if (isTruthy) responseNode[queryFormatPropertyKey] = graphNode[queryFormatPropertyKey]
        else if (alias) responseNode[alias] = graphNode[queryFormatPropertyKey]
      } else if (schemaNodeProp?.info.name === 'SchemaRelationshipProp') { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
        const schemaRelationshipProp = /** @type { SchemaRelationshipProp } */(schemaNodeProp)
        const relationshipUids = graphNode[getRelationshipProp(schemaRelationshipProp.relationshipName)]

        if (queryFormatPropertyValue.$info.name === enums.classInfoNames.One && relationshipUids?.length === 1) {
          const rGetPutCache = await getPutCache(storage, cache, relationshipUids)
          const graphRelationship = rGetPutCache.get(relationshipUids[0])
          const relationshipUid = uid === graphRelationship.a ? graphRelationship.b : graphRelationship.a
          await addRelationshipsToResponse(storage, responseNode, queryFormatPropertyKey, { uid: relationshipUid }, queryFormatPropertyValue, false, cache, schema, { key: uid, value: graphRelationship }, hashPublicKeys)
        } else if (queryFormatPropertyValue.$info.name === enums.classInfoNames.Many && relationshipUids?.length) {
          const nodeUids = /** @type { string[] } */ ([])
          const graphRelationships = /** @type { any[] } */ ([])
          const rGetPutCache = await getPutCache(storage, cache, relationshipUids)
          const { isBidirectional, isInverse } = getRelationshipOptionsDetails(schemaRelationshipProp.options)

          if (isBidirectional) {
            rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
              graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship })
              nodeUids.push(uid === graphRelationship.a ? graphRelationship.b : graphRelationship.a)
            })
          } else if (isInverse) {
            rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
              if (uid === graphRelationship.b) {
                graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship })
                nodeUids.push(graphRelationship.a)
              }
            })
          } else {
            rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
              if (uid === graphRelationship.a) {
                graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship })
                nodeUids.push(graphRelationship.b)
              }
            })
          }

          await runFnThenFormatArray(
            storage,
            cache,
            schema,
            nodeUids,
            queryFormatPropertyValue,
            false,
            hashPublicKeys,
            (node, i) => addRelationshipsToResponse(storage, responseNode, queryFormatPropertyKey, { node }, queryFormatPropertyValue, true, cache, schema, graphRelationships[i], hashPublicKeys),
            () => responseNode[alias || queryFormatPropertyKey],
            (array) => responseNode[alias || queryFormatPropertyKey] = array)
        }
      }
    }
  }

  return isValid ? responseNode : null
}


/**
 * Add / validate node's relationships to response
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { any } responseNode 
 * @param { string } queryFormatPropertyKey 
 * @param { { node?: any, uid?: string } } item 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { boolean } isArray 
 * @param { QueryCache } cache
 * @param { Schema } schema
 * @param { { key: string, value: any } } graphRelationship
 * @param { td.HashPublicKeys | null } hashPublicKeys
 * @returns { Promise<void> }
 */
async function addRelationshipsToResponse (storage, responseNode, queryFormatPropertyKey, item, queryFormatSection, isArray, cache, schema, graphRelationship, hashPublicKeys) {
  const relationshipResponseNode = await addToResponse(storage, item, queryFormatSection, cache, schema, graphRelationship, hashPublicKeys) // @ relationship @ query format section, get relationship value

  if (relationshipResponseNode) {
    const relationshipPropertyName = getAlias(queryFormatSection) || queryFormatPropertyKey

    if (!isArray) responseNode[ relationshipPropertyName ] = relationshipResponseNode // IF we are not adding an array to the response => bind value
    else if (responseNode[ relationshipPropertyName ]?.length) responseNode[ relationshipPropertyName ].push(relationshipResponseNode) // IF array in response already has items => push array
    else responseNode[ relationshipPropertyName ] = [relationshipResponseNode ] // IF should be an array in response but has no values => init array + value
  }
}


/**
 * Loop nodes, call `loopFunction()` on each iteration, format array after looping complete
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { QueryCache } cache
 * @param { Schema } schema 
 * @param { string[] } uids 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { boolean } isUsingSortIndexNodes
 * @param { td.HashPublicKeys | null } hashPublicKeys
 * @param { (node: any, i: number) => Promise<void> } loopFunction 
 * @param { () => any[] } getArray 
 * @param { (array: any[]) => void } setArray 
 * @returns { Promise<void> }
 */
async function runFnThenFormatArray(storage, cache, schema, uids, queryFormatSection, isUsingSortIndexNodes, hashPublicKeys, loopFunction, getArray, setArray) {
  const rGetPutCache = await getPutCache(storage, cache, uids)

  for (let i = 0; i < uids.length; i++) { // loop nodes and get their uid's
    await loopFunction(rGetPutCache.get(uids[i]), i) // call desired function on each node
  }

  setArray(await queryOptionsArray(schema, queryFormatSection, hashPublicKeys, isUsingSortIndexNodes, getArray()))
}


/**
 * If key is in cache, return cache version. If key is not in cache, return storage version and populate cache.
 * @param { td.CF_DO_Storage } storage 
 * @param { QueryCache } cache 
 * @param { string[] } keys 
 * @returns { Promise<Map<string, any>> }
 */
async function getPutCache (storage, cache, keys) {
  const storageKeys = []
  const response = new Map()

  for (const key of keys) {
    const cacheFind = cache.get(key)

    if (cacheFind) response.set(key, cacheFind)
    else storageKeys.push(key)
  }

  if (storageKeys.length) {
    const storageResponse = await storage.get(keys)

    storageResponse.forEach((/** @type { any } */ value, /** @type { string } */ key) => {
      response.set(key, value)
      cache.set(key, value)
    })
  }

  return response
}


/** 
 * @typedef { Map<string, any> } QueryCache
 * @typedef { Map<string, { relationshipName: string, nodePropName: string }> } SchemaRelationshipsMap
 */
