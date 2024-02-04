import { getAlias } from './getAlias.js'
import { queryOptionsArray } from './queryOptions.js'
import { td, enums, Schema, QuerySort } from '#manifest'
import { NODES_KEY, RELATIONSHIP_PREFIX, SCHEMA_KEY, getExactIndexKey, getSortIndexKey } from './variables.js'


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
 * @param { td.QueryRequest } rQuery
 * @returns { Promise<{ [k: string]: any }> }
 */
export async function _query (storage, rQuery) {
  try {
    const response = /** @type { { [k: string]: any } } */ ({})

    if (rQuery.property) response[getAlias(rQuery.format) || rQuery.property] = await getResponse(storage, rQuery) // run requested query

    return response
  } catch (error) {
    console.log('error', error)
    throw error
  }
}


/**
 * Return response of a single query.
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.QueryRequest } request 
 * @returns { Promise<any | any[]> }
 */
async function getResponse (storage, request) {
  if (!request.info.nodeName) throw ''

  let response = null // the response that will be returned
  const tempResponse = /** The formatted response @type { td.QueryResponse } */ ({ object: null, array: [] })
  const cache = /** @type { QueryCache } */ (new Map())

  if (request.info.name === enums.classInfoNames.Uid) {
    const qAny = /** @type { any } */ (request)
    const query = /** @type { td.QueryRequestUid } */ (qAny)

    if (!query.uid) throw ''
    const schema = await storage.get(SCHEMA_KEY)

    if (!schema) throw ''

    const schemaRelationshipsMap = getSchemaRelationshipsMap(schema)
    await addNodeToResponse(storage, tempResponse, query, { uid: query.uid }, cache, schemaRelationshipsMap, schema) // IF query by uid requested => add node to response by uid
    response = tempResponse.object || null
  // @ts-ignore
  } else if (request.info.name === enums.classInfoNames.Exact) { // IF query using exact index requested
    const qAny = /** @type { any } */ (request)
    const query = /** @type { td.QueryRequestExact } */ (qAny)

    if (query.exact) {
      if (!query.exact) throw ''

      const indexKey = getExactIndexKey(query.info.nodeName, query.exact.property, query.exact.value) // get uid of node via exact index

      if (!indexKey) throw ''

      const getEntries = await storage.get([ SCHEMA_KEY, indexKey ])
      const schema = getEntries.get(SCHEMA_KEY)

      if (!schema) throw ''

      const schemaRelationshipsMap = getSchemaRelationshipsMap(schema)
      const uid = getEntries.get(indexKey)

      if (uid) {
        await addNodeToResponse(storage, tempResponse, query, uid, cache, schemaRelationshipsMap, schema) // IF uid found => add node to response by uid
        response = tempResponse.object || null
      }
    }
  } else if (request.info.name === enums.classInfoNames.Many) { // IF query by node requested
    let uids
    let isUsingSortIndexNodes = false
    let anySchema = /** @type { any } */ (undefined)
    const qAny = /** @type { any } */ (request)
    const query = /** @type { td.QueryRequestMany } */ (qAny)
    const sortOptions = /** @type { QuerySort } */ (query.format.$options?.find(o => o.info.name === enums.classInfoNames.QuerySort))

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
      const getEntries = await storage.get([ SCHEMA_KEY, NODES_KEY ])
      const allNodes = getEntries.get(NODES_KEY)

      anySchema = getEntries.get(SCHEMA_KEY)
      uids = allNodes ? allNodes[query.info.nodeName] : [] // IF property is not a sort index => get unsorted node uids from $nodes in database
    }

    if (!anySchema) throw ''

    const schema = /** @type { Schema } */ (anySchema)
    const schemaRelationshipsMap = getSchemaRelationshipsMap(anySchema)

    await runFnThenFormatArray(
      storage,
      cache,
      schema,
      uids,
      query.format,
      isUsingSortIndexNodes,
      (node) => addNodeToResponse(storage, tempResponse, query, { node }, cache, schemaRelationshipsMap, schema),
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
 * @param { SchemaRelationshipsMap } schemaRelationshipsMap
 * @param { Schema } schema
 * @returns { Promise<void> }
 */
async function addNodeToResponse (storage, response, query, item, cache, schemaRelationshipsMap, schema) {
  const responseNode = await addToResponse(storage, item, query.format, cache, schema, schemaRelationshipsMap) // validate / add the relationships in query.format to response

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
 * @param { SchemaRelationshipsMap } schemaRelationshipsMap
 * @returns { Promise<any> }
 */
async function addToResponse (storage, item, queryFormatSection, cache, schema, schemaRelationshipsMap) {
  if (!schema.nodes?.[queryFormatSection.$info.nodeName]) throw ''

  let graphNode = item.node
  let isValid = true // IF this is a valid relationship, start true and if any issues arise tip to false

  const uid = item.uid || item.node?.uid
  const props = /** @type { Set<string> } */ new Set(Object.keys(schema.nodes[queryFormatSection.$info.nodeName]))
  const responseNode = /** We will add properties to this object based on the query and what we find in the db @type { { [k: string]: any } } */ ({})

  if (!graphNode && uid) {
    const rGetPutCache = await getPutCache(storage, cache, [ uid ])
    graphNode = rGetPutCache.get(uid)
  }

  if (!graphNode) isValid = false // IF there is no value @ the provided uid => tip isValid flag to false
  else {
    const graphNodeRelationshipKeys = /** @type { Map<string, { queryFormatPropertyKey: string, queryFormatPropertyValue: td.QueryRequestFormat, alias?: string }> } */ (new Map())

    for (const queryFormatPropertyKey in queryFormatSection) { // loop a section of query.format object
      const queryFormatPropertyValue = queryFormatSection[queryFormatPropertyKey]
      const isTruthy = queryFormatPropertyValue === true
      const alias = typeof queryFormatPropertyValue?.alias === 'string' ? queryFormatPropertyValue.alias : null
      const setProperty = props.has(queryFormatPropertyKey) ? queryFormatPropertyKey : null

      if (queryFormatPropertyKey === 'uid') {
        if (isTruthy) responseNode.uid = uid
        else if (alias) responseNode[alias] = uid
      } else if (setProperty) {
        if (isTruthy) responseNode[queryFormatPropertyKey] = graphNode[queryFormatPropertyKey]
        else if (alias) responseNode[alias] = graphNode[queryFormatPropertyKey]
      } else if (!queryFormatPropertyKey.startsWith('$')) {
        const mapRelationship = schemaRelationshipsMap.get(getSchemaRelationshipsMapKey(queryFormatSection.$info.nodeName, queryFormatPropertyKey))

        if (mapRelationship) {
          const graphNodeRelationshipKey = graphNode[`${ RELATIONSHIP_PREFIX }${ mapRelationship.relationshipName }`]

          if (graphNodeRelationshipKey) {
            graphNodeRelationshipKeys.set(graphNodeRelationshipKey, {
              queryFormatPropertyKey,
              queryFormatPropertyValue,
              alias: getAlias(queryFormatPropertyValue)
            })
          }
        }
      }
    }

    if (graphNodeRelationshipKeys.size) {
      const arrayGraphNodeRelationshipKeys = [ ...graphNodeRelationshipKeys.keys() ]
      const rGetPutCache = await getPutCache(storage, cache, arrayGraphNodeRelationshipKeys)

      for (const graphNodeRelationshipKey of arrayGraphNodeRelationshipKeys) {
        const graphRelationship = rGetPutCache.get(graphNodeRelationshipKey)
        const options = graphNodeRelationshipKeys.get(graphNodeRelationshipKey)

        if (options && graphRelationship) {
          switch (options.queryFormatPropertyValue.$info.name) {
            case enums.classInfoNames.One:
              const relationshipValue = graphRelationship[options.queryFormatPropertyKey]
              const relationshipUid = Array.isArray(relationshipValue) ?
                relationshipValue.find((/** @type { string } */ruid) => ruid !== uid) :
                relationshipValue

              await addRelationshipsToResponse(storage, responseNode, options.queryFormatPropertyKey, { uid: relationshipUid }, options.queryFormatPropertyValue, false, cache, schema, schemaRelationshipsMap)
              break
            case enums.classInfoNames.Many:
              const uids = graphRelationship[options.queryFormatPropertyKey]

              await runFnThenFormatArray(
                storage,
                cache,
                schema,
                uids,
                queryFormatSection,
                false,
                (node) => addRelationshipsToResponse(storage, responseNode, options.queryFormatPropertyKey, { node }, options.queryFormatPropertyValue, true, cache, schema, schemaRelationshipsMap),
                () => responseNode[options.alias || options.queryFormatPropertyKey],
                (array) => responseNode[options.alias || options.queryFormatPropertyKey] = array)
              break
          }
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
 * @param { string } relationship 
 * @param { { node?: any, uid?: string } } item 
 * @param { td.QueryRequestFormat } queryFormatSection 
 * @param { boolean } isArray 
 * @param { QueryCache } cache
 * @param { Schema } schema
 * @param { SchemaRelationshipsMap } schemaRelationshipsMap
 * @returns { Promise<void> }
 */
async function addRelationshipsToResponse (storage, responseNode, relationship, item, queryFormatSection, isArray, cache, schema, schemaRelationshipsMap) {
  const relationshipResponseNode = await addToResponse(storage, item, queryFormatSection, cache, schema, schemaRelationshipsMap) // @ relationship @ query format section, get relationship value

  if (relationshipResponseNode) {
    const relationshipPropertyName = getAlias(queryFormatSection) || relationship

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
 * @param { (node: any) => Promise<void> } loopFunction 
 * @param { () => any[] } getArray 
 * @param { (array: any[]) => void } setArray 
 * @returns { Promise<void> }
 */
async function runFnThenFormatArray (storage, cache, schema, uids, queryFormatSection, isUsingSortIndexNodes, loopFunction, getArray, setArray) {
  const rGetPutCache = await getPutCache(storage, cache, uids)

  for (const uid of uids) { // loop nodes and get their uid's
    await loopFunction(rGetPutCache.get(uid)) // call desired function on each node
  }

  setArray(queryOptionsArray(schema, queryFormatSection, getArray(), isUsingSortIndexNodes))
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
 * @param { Schema } schema 
 * @returns { SchemaRelationshipsMap }
 */
function getSchemaRelationshipsMap (schema) {
  const schemaRelationshipsMap = /** @type { SchemaRelationshipsMap } */ (new Map())

  if (schema.relationships) {
    for (const relationshipName in schema.relationships) {
      const options = schema.relationships[relationshipName]
      const a2b = options.directions[0]
      const b2a = options.directions[1]

      if (a2b.nodeName !== b2a.nodeName || a2b.nodePropName !== b2a.nodePropName) {
        schemaRelationshipsMap.set(getSchemaRelationshipsMapKey(a2b.nodeName, a2b.nodePropName), { relationshipName, nodePropName: b2a.nodePropName })
        schemaRelationshipsMap.set(getSchemaRelationshipsMapKey(b2a.nodeName, b2a.nodePropName), { relationshipName, nodePropName: a2b.nodePropName })
      } else {
        schemaRelationshipsMap.set(getSchemaRelationshipsMapKey(a2b.nodeName, a2b.nodePropName), { relationshipName, nodePropName: b2a.nodePropName })
      }
    }
  }

  return schemaRelationshipsMap
}


/**
 * @param { string } nodeName 
 * @param { string } nodePropName 
 */
function getSchemaRelationshipsMapKey (nodeName, nodePropName) {
  return `${ nodeName }___${ nodePropName }`
}


/** 
 * @typedef { Map<string, any> } QueryCache
 * @typedef { Map<string, { relationshipName: string, nodePropName: string }> } SchemaRelationshipsMap
 */
