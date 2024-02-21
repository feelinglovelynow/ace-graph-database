import { error } from './throw.js'
import { td, enums } from '#manifest'
import { _getSchema } from './schema.js'
import { implementQueryOptions } from './queryOptions.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { NODE_UIDS_KEY, getRelationshipProp, getSortIndexKey } from './variables.js'
import { getGeneratedQueryFormatSectionByParent, getGeneratedQueryFormatSectionById } from './getGeneratedQueryFormatSection.js'


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
    return await getResponse(storage, request)
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
  const schema = await _getSchema(storage)

  if (!schema) error('query__falsy-schema', 'The request is invalid because we queried your graph for a schema but the schema is falsy', { request })

  const publicJWKs = /** @type { td.PublicJWKs } */ ({})

  if (request.publicJWKs) {
    for (const key in request.publicJWKs) {
      publicJWKs[key] = await crypto.subtle.importKey('jwk', JSON.parse(request.publicJWKs[key]), getAlgorithmOptions('import'), true, ['verify'])
    }
  }

  let uids
  const generatedQueryFormatSection = getGeneratedQueryFormatSectionById(request.format, request.property, schema)
  const sortOptions = /** @type { td.QuerySort } */ (request.format.x.$options?.find(o => o.id === enums.idsQuery.Sort))

  if (sortOptions) {
    const indexKey = getSortIndexKey(generatedQueryFormatSection.nodeName, sortOptions.x.property) // IF sorting by an property requested => see if property is a sort index
    if (indexKey) uids = await storage.get(indexKey)
  }

  let isUsingSortIndexNodes = false

  if (uids) isUsingSortIndexNodes = true // IF property is a sort index => tip flag to true
  else {
    const allNodes = await storage.get(NODE_UIDS_KEY)
    uids = allNodes ? allNodes[generatedQueryFormatSection.nodeName] : [] // IF property is not a sort index => get unsorted node uids from $nodeUids in database
  }

  const cache = /** @type { QueryCache } */ (new Map())
  const response /** @type { QueryResponse } */ = ({ current: {}, original: {} })

  await runFnThenFormatArray(
    generatedQueryFormatSection,
    response,
    uids,
    null,
    isUsingSortIndexNodes,
    publicJWKs,
    storage,
    schema,
    cache
  )

  return response.current
}


/**
 * For each relationship in the section of the query format, validate / add relationship value to response
 * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
 * @param { td.QueryResponse } response 
 * @param { { node?: any, uid?: string } } item 
 * @param { { key: string, value: any } | null } graphRelationship
 * @param { boolean } isUsingSortIndexNodes
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.Schema } schema
 * @param { QueryCache } cache
 * @param { td.PublicJWKs | null } publicJWKs
 * @returns { Promise<void> }
 */
async function addToResponse (generatedQueryFormatSection, response, item, graphRelationship, isUsingSortIndexNodes, storage, schema, cache, publicJWKs) {
  let graphNode = item.node

  const uid = item.uid || item.node?.x?.uid

  if (!graphNode && uid) {
    const rGetPutCache = await getPutCache(storage, cache, [ uid ])
    graphNode = rGetPutCache.get(uid)
  }

  if (!graphNode) {
    response.current[ generatedQueryFormatSection.property ] = null
    response.original[ generatedQueryFormatSection.property ] = null
  } else {
    const responseOriginalNode = graphNode.x
    const responseCurrentNode = /** @type { { [propertyName: string]: any } } */ ({})

    for (const queryFormatPropertyKey in generatedQueryFormatSection.x) { // loop a section of query.format object
      const queryFormatPropertyValue = generatedQueryFormatSection.x[queryFormatPropertyKey]
      const isTruthy = queryFormatPropertyValue === true
      const alias = queryFormatPropertyValue?.id === enums.idsQuery.Alias ? queryFormatPropertyValue.x?.alias : null
      const schemaNodeProp = schema.nodes[generatedQueryFormatSection.nodeName]?.[queryFormatPropertyKey]
      const schemaRelationshipProp = generatedQueryFormatSection.relationshipName ? /**@type { any } */ (schema.relationships)?.[generatedQueryFormatSection.relationshipName]?.props?.[queryFormatPropertyKey] : null

      if (queryFormatPropertyKey === 'uid') { // not a prop defined in the schema
        if (isTruthy) responseCurrentNode.uid = uid
        else if (alias) responseCurrentNode[alias] = uid
      } else if (queryFormatPropertyKey === '_uid' && graphRelationship) { // not a prop defined in the schema
        if (isTruthy) responseCurrentNode._uid = graphRelationship.key
        else if (alias) responseCurrentNode[alias] = graphRelationship.key
      } else if (schemaRelationshipProp?.id === enums.idsSchema.Prop && graphRelationship) { // this prop is defined @ schema.relationships
        if (isTruthy) responseCurrentNode[queryFormatPropertyKey] = graphRelationship.value[queryFormatPropertyKey]
        else if (alias) responseCurrentNode[alias] = graphRelationship?.value[queryFormatPropertyKey]
      } else if (schemaNodeProp?.id === enums.idsSchema.Prop) { // this prop is defined @ schema.nodes and is a SchemaProp        
        if (isTruthy) responseCurrentNode[queryFormatPropertyKey] = graphNode.x[queryFormatPropertyKey]
        else if (alias) responseCurrentNode[alias] = graphNode.x[queryFormatPropertyKey]      
      } else if (schemaNodeProp?.id === enums.idsSchema.ForwardRelationshipProp || schemaNodeProp?.id === enums.idsSchema.ReverseRelationshipProp || schemaNodeProp?.id === enums.idsSchema.BidirectionalRelationshipProp) { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
        const relationshipUids = graphNode[getRelationshipProp(schemaNodeProp.x.relationshipName)]
        const relationshipGeneratedQueryFormatSection = getGeneratedQueryFormatSectionByParent(queryFormatPropertyValue, queryFormatPropertyKey, schema, generatedQueryFormatSection)        

        if (relationshipUids?.length) {
          const nodeUids = /** @type { string[] } */ ([])
          const graphRelationships = /** @type { any[] } */ ([])
          const rGetPutCache = await getPutCache(storage, cache, relationshipUids)

          switch (schemaNodeProp.id) {
            case enums.idsSchema.ForwardRelationshipProp:
              rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                if (uid === graphRelationship?.x.a) {
                  graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship.x })
                  nodeUids.push(graphRelationship.x.b)
                }
              })
              break
            case enums.idsSchema.ReverseRelationshipProp:
              rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                if (uid === graphRelationship?.x.b) {
                  graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship.x })
                  nodeUids.push(graphRelationship?.x.a)
                }
              })
              break
            case enums.idsSchema.BidirectionalRelationshipProp:
              rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship.x })
                nodeUids.push(uid === graphRelationship?.x.a ? graphRelationship?.x.b : graphRelationship?.x.a)
              })
              break
          }

          await runFnThenFormatArray(
            relationshipGeneratedQueryFormatSection,
            { current: responseCurrentNode, original: responseOriginalNode },
            nodeUids,
            graphRelationships,
            false,
            publicJWKs,
            storage,
            schema,
            cache,
          )
        }
      }
    }

    if (response.current[generatedQueryFormatSection.property]?.length) {
      response.current[generatedQueryFormatSection.property].push(responseCurrentNode)
      response.original[generatedQueryFormatSection.property].push(responseOriginalNode)
    } else {
      response.current[generatedQueryFormatSection.property] = [responseCurrentNode]
      response.original[generatedQueryFormatSection.property] = [responseOriginalNode]
    }
  }
}



/**
 * Loop nodes, call `loopFunction()` on each iteration, format array after looping complete
 * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
 * @param { td.QueryResponse } response 
 * @param { string[] } uids 
 * @param { any[] | null } graphRelationships
 * @param { boolean } isUsingSortIndexNodes
 * @param { td.PublicJWKs | null } publicJWKs
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @param { td.Schema } schema 
 * @param { QueryCache } cache
 * @returns { Promise<void> }
 */
async function runFnThenFormatArray (generatedQueryFormatSection, response, uids, graphRelationships, isUsingSortIndexNodes, publicJWKs, storage, schema, cache) {
  const rGetPutCache = await getPutCache(storage, cache, uids)

  for (let i = 0; i < uids.length; i++) {
    await addToResponse(generatedQueryFormatSection, response, { node: rGetPutCache.get(uids[i]) }, graphRelationships?.[i] || null, isUsingSortIndexNodes, storage, schema, cache, publicJWKs) // call desired function on each node
  }

  await implementQueryOptions(generatedQueryFormatSection, response, isUsingSortIndexNodes, publicJWKs, schema)
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
