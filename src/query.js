import { error } from './throw.js'
import { td, enums } from '#manifest'
import { stamp } from './passport.js'
import { fetchJSON } from './fetchJSON.js'
import { implementQueryOptions } from './queryOptions.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { NODE_UIDS_KEY, getRelationshipProp, getSortIndexKey, getRevokesKey, getUniqueIndexKey } from './variables.js'
import { getGeneratedQueryFormatSectionByParent, getGeneratedQueryFormatSectionById } from './getGeneratedQueryFormatSection.js'


/**
 * @param { string } url 
 * @param { string | null } token 
 * @param { td.QueryRequest } request 
 * @returns { Promise<any> }
 */
export async function query (url, token, request) {
  return fetchJSON(url + enums.endpoints.query, token, { body: JSON.stringify(request) })
}


/**
 * @param { td.AcePassport } passport
 * @param { td.QueryRequest } request
 * @returns { Promise<any> }
 */
export async function _query (passport, request) {
  try {
    await stamp(passport)

    /** @type { td.QueryPublicJWKs } - Converts `JSON.stringify()` jwks into `CryptoKey` jwks */
    const publicJWKs = {}

    /** @type { QueryCache } - Store nodes we look up in this cache map, so if the nodes are requested again (w/in a relationship), we can retrieve the nodes from this cache map */
    const cache = new Map()

    /** @type { td.QueryResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.format` will be in current. */
    const response = { current: {}, original: {} }

    /**
     * @typedef { Map<string, any> } QueryCache
     * @typedef { Map<string, { relationshipName: string, nodePropName: string }> } SchemaRelationshipsMap
     */

    await setPublicJWKs()
    const { uids, generatedQueryFormatSection, isUsingSortIndexNodes } = await getInitialUids()
    await addNodesToResponse(generatedQueryFormatSection, response, uids, null, isUsingSortIndexNodes)
    return response.current


    async function setPublicJWKs () {
      if (request.publicJWKs) {
        for (const key in request.publicJWKs) {
          publicJWKs[key] = await crypto.subtle.importKey('jwk', JSON.parse(request.publicJWKs[key]), getAlgorithmOptions('import'), true, ['verify'])
        }
      }
    }


    /** @returns { Promise<{ uids: any, isUsingSortIndexNodes: any, generatedQueryFormatSection: any }> } */
    async function getInitialUids () {
      let uids, sortOptions, findByUniqueOptions, findByUid
      const generatedQueryFormatSection = getGeneratedQueryFormatSectionById(request.format, request.property, passport)

      if (request.format.x.$options) {
        for (const o of request.format.x.$options) {
          if (o.id === enums.idsQuery.Sort) { sortOptions = o; break }
          if (o.id === enums.idsQuery.FindByUid) { findByUid = o; break }
          if (o.id === enums.idsQuery.FindByUnique) { findByUniqueOptions = o; break }
        }
      }

      if (sortOptions) {
        const indexKey = getSortIndexKey(generatedQueryFormatSection.nodeName, sortOptions.x.property) // IF sorting by an property requested => see if property is a sort index
        if (indexKey) uids = await passport.storage.get(indexKey)
      }

      let isUsingSortIndexNodes = false

      if (uids) isUsingSortIndexNodes = true // IF property is a sort index => tip flag to true
      else {
        if (findByUid) uids = [ findByUid.x.uid ]
        else if (findByUniqueOptions) {
          const uid = await passport.storage.get(getUniqueIndexKey(generatedQueryFormatSection.nodeName, findByUniqueOptions.x.property, findByUniqueOptions.x.value))
          uids = uid ? [uid ] : []
        }

        if (!uids?.length) {
          const allNodes = await passport.storage.get(NODE_UIDS_KEY)
          uids = allNodes ? allNodes[generatedQueryFormatSection.nodeName] : [] // IF property is not a sort index => get unsorted node uids from $nodeUids in database
        }
      }

      return {
        uids,
        isUsingSortIndexNodes,
        generatedQueryFormatSection
      }
    }


    /**
     * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
     * @param { td.QueryResponse } response 
     * @param { string[] } uids 
     * @param { any[] | null } graphRelationships
     * @param { boolean } isUsingSortIndexNodes
     * @returns { Promise<void> }
     */
    async function addNodesToResponse (generatedQueryFormatSection, response, uids, graphRelationships, isUsingSortIndexNodes) {
      const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', nodeName: generatedQueryFormatSection.nodeName, propName: '*' }))

      if (permission && !permission.allowPropName) throw error('auth__read-node', `Because the read node name \`${ generatedQueryFormatSection.nodeName }\` permission is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
      else {
        const rGetPutCache = await getPutCache(uids)

        for (let i = 0; i < uids.length; i++) {
          const node = rGetPutCache.get(uids[i])
          if (isRevokesAllowed(node.x, { permission })) await addPropsToResponse(generatedQueryFormatSection, response, { node }, graphRelationships?.[i] || null) // call desired function on each node
        }

        await implementQueryOptions(generatedQueryFormatSection, response, isUsingSortIndexNodes, publicJWKs, passport)
      }
    }


    /**
     * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
     * @param { td.QueryResponse } response 
     * @param { { node?: any, uid?: string } } item 
     * @param { { key: string, value: any } | null } graphRelationship
     * @returns { Promise<void> }
     */
    async function addPropsToResponse (generatedQueryFormatSection, response, item, graphRelationship) {
      let graphNode = item.node

      const uid = item.uid || item.node?.x?.uid

      if (!graphNode && uid) {
        const rGetPutCache = await getPutCache([ uid ])
        graphNode = rGetPutCache.get(uid)
      }

      if (!graphNode) {
        response.current[ generatedQueryFormatSection.property ] = null
        response.original[ generatedQueryFormatSection.property ] = null
      } else {
        const responseOriginalNode = graphNode.x
        const responseCurrentNode = /** @type { { [propertyName: string]: any } } */ ({})

        for (const queryFormatPropertyKey in generatedQueryFormatSection.x) { // loop a section of query.format object
          if (isRevokesAllowed(responseOriginalNode, { key: getRevokesKey({ action: 'read', nodeName: generatedQueryFormatSection.nodeName, propName: queryFormatPropertyKey }) })) {
            const queryFormatPropertyValue = generatedQueryFormatSection.x[queryFormatPropertyKey]
            const isTruthy = queryFormatPropertyValue === true
            const alias = queryFormatPropertyValue?.id === enums.idsQuery.Alias ? queryFormatPropertyValue.x?.alias : null
            const schemaNodeProp = passport.schema?.nodes[generatedQueryFormatSection.nodeName]?.[queryFormatPropertyKey]
            const schemaRelationshipProp = generatedQueryFormatSection.relationshipName ? /**@type { any } */ (passport.schema?.relationships)?.[generatedQueryFormatSection.relationshipName]?.props?.[queryFormatPropertyKey] : null

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
              const relationshipGeneratedQueryFormatSection = getGeneratedQueryFormatSectionByParent(queryFormatPropertyValue, queryFormatPropertyKey, passport, generatedQueryFormatSection)        

              if (relationshipUids?.length) {
                const nodeUids = /** @type { string[] } */ ([])
                const graphRelationships = /** @type { any[] } */ ([])
                const rGetPutCache = await getPutCache(relationshipUids)

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

                await addNodesToResponse(relationshipGeneratedQueryFormatSection, { current: responseCurrentNode, original: responseOriginalNode }, nodeUids, graphRelationships, false)
              }
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
     * If key is in cache, return cache version. If key is not in cache, return storage version and populate cache.
     * @param { string[] } keys 
     * @returns { Promise<Map<string, any>> }
     */
    async function getPutCache (keys) {
      const storageKeys = []
      const response = new Map()

      for (const key of keys) {
        const cacheFind = cache.get(key)

        if (cacheFind) response.set(key, cacheFind)
        else storageKeys.push(key)
      }

      if (storageKeys.length) {
        const storageResponse = await passport.storage.get(keys)

        storageResponse.forEach((/** @type { any } */ value, /** @type { string } */ key) => {
          response.set(key, value)
          cache.set(key, value)
        })
      }

      return response
    }


    /**
     * @param { { [propName: string]: any; } } node
     * @param { { key?: string, permission?: any } } options
     * @returns { boolean }
     */
    function isRevokesAllowed (node, options) {
      let revokesValue
      let isAllowed = false

      if (options.key) revokesValue = passport.revokesAcePermissions?.get(options.key)
      if (options.permission) revokesValue = options.permission

      if (!revokesValue) isAllowed = true
      else if (passport?.user?.uid && node?.[revokesValue?.allowPropName] && passport.user.uid === node[revokesValue.allowPropName]) isAllowed = true

      return isAllowed
    }
  } catch (e) {
    console.log('error', e)
    throw e
  }
}
