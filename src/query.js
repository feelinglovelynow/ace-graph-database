import { error } from './throw.js'
import { td, enums } from '#manifest'
import { stamp } from './passport.js'
import { fetchJSON } from './fetchJSON.js'
import { implementQueryOptions } from './queryOptions.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { NODE_UIDS_KEY, getRelationshipProp, getSortIndexKey, getRevokesKey, getUniqueIndexKey } from './variables.js'
import { getGeneratedQueryFormatSectionByParent, getGeneratedQueryFormatSectionById } from './getGeneratedQueryFormatSection.js'


/**
 * @param { td.AceCore } core
 * @param { td.QueryRequest } request 
 * @returns { Promise<any> }
 */
export async function query (core, request) {
  return fetchJSON(core.url + enums.endpoints.query, core.token, { body: JSON.stringify(request) })
}


/**
 * @param { td.AcePassport } passport
 * @param { td.QueryRequest } request
 * @returns { Promise<any> }
 */
export async function _query (passport, request) {
  try {
    await stamp(passport)

    /** @type { td.QueryRequestArray } - Ensure we are always dealing with an array */
    const arrayRequests = Array.isArray(request) ? request : [ request ]

    /** @type { QueryCache } - Store nodes we look up in this cache map, so if the nodes are requested again (w/in a relationship), we can retrieve the nodes from this cache map */
    const cache = new Map()

    /** @type { td.QueryPublicJWKs[] } - Converts `JSON.stringify()` jwks into `CryptoKey` jwks */
    const publicJWKs = []

    /** @type { td.QueryResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.format` will be in current. */
    const response = { current: {}, original: {} }

    /**
     * @typedef { Map<string, any> } QueryCache
     * @typedef { Map<string, { relationshipName: string, nodePropName: string }> } SchemaRelationshipsMap
     */

    for (let iQuery = 0; iQuery < arrayRequests.length; iQuery++) {
      const query = arrayRequests[iQuery]
      await setPublicJWKs(query, iQuery)
      const { uids, generatedQueryFormatSection, isUsingSortIndexNodes } = await getInitialUids(query)
      await addNodesToResponse(generatedQueryFormatSection, response, uids, null, isUsingSortIndexNodes, iQuery)
    }

    return response.current


    /**
     * @param { td.QueryRequestDefault } query
     * @param { number } iQuery
     */
    async function setPublicJWKs (query, iQuery) {
      if (query.publicJWKs) {
        const jwks = /** @type { td.QueryPublicJWKs } */ ({})

        for (const key in query.publicJWKs) {
          jwks[key] = await crypto.subtle.importKey('jwk', JSON.parse(query.publicJWKs[key]), getAlgorithmOptions('import'), true, ['verify'])
        }

        publicJWKs[iQuery] = jwks
      }
    }


    /**
     * @param { td.QueryRequestDefault } query
     * @returns { Promise<{ uids: any, isUsingSortIndexNodes: any, generatedQueryFormatSection: any }> }
     */
    async function getInitialUids (query) {
      let uids

      const generatedQueryFormatSection = getGeneratedQueryFormatSectionById(query.format, query.property, passport)
      const sortOptions = /** @type { td.QuerySort } */ (generatedQueryFormatSection.priorityOptions.get(enums.idsQuery.Sort))
      const findByUid = /** @type { td.QueryFindByUid } */ (generatedQueryFormatSection.priorityOptions.get(enums.idsQuery.FindByUid))
      const findByUnique = /** @type { td.QueryFindByUnique } */ (generatedQueryFormatSection.priorityOptions.get(enums.idsQuery.FindByUnique))
      const filterByUids = /** @type { td.QueryFilterByUids } */ (generatedQueryFormatSection.priorityOptions.get(enums.idsQuery.FilterByUids))
      const filterByUniques = /** @type { td.QueryFilterByUniques } */ (generatedQueryFormatSection.priorityOptions.get(enums.idsQuery.FilterByUniques))

      if (sortOptions) {
        const indexKey = getSortIndexKey(generatedQueryFormatSection.nodeName, sortOptions.x.property) // IF sorting by an property requested => see if property is a sort index
        if (indexKey) uids = await passport.storage.get(indexKey)
      }

      let isUsingSortIndexNodes = false

      if (uids) isUsingSortIndexNodes = true // IF property is a sort index => tip flag to true
      else {
        let isValid = true

        if (findByUid) uids = [ findByUid.x.uid ]
        else if (filterByUids) {
          uids = filterByUids.x.uids
          if (!uids.length) isValid = false
        } else if (findByUnique) {
          const key = getUniqueIndexKey(generatedQueryFormatSection.nodeName, findByUnique.x.property, findByUnique.x.value)
          const rGetPutCache = await getPutCache([ key ])
          const uid = rGetPutCache.get(key)
          uids = uid ? [uid ] : []
          if (!uids.length) isValid = false
        } else if (filterByUniques) {
          const keys = filterByUniques.x.uniques.map((value) => {
            return getUniqueIndexKey(generatedQueryFormatSection.nodeName, value.property, value.value)
          })

          const rGetPutCache = await getPutCache(keys)
          uids = [ ...(rGetPutCache.values()) ]
          if (!uids.length) isValid = false
        }

        if (isValid && !uids?.length) {
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
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addNodesToResponse (generatedQueryFormatSection, response, uids, graphRelationships, isUsingSortIndexNodes, iQuery) {
      const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', nodeName: generatedQueryFormatSection.nodeName, propName: '*' }))

      if (permission && !permission.allowPropName) throw error('auth__read-node', `Because the read node name \`${ generatedQueryFormatSection.nodeName }\` permission is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
      else {
        const rGetPutCache = await getPutCache(uids)

        for (let i = 0; i < uids.length; i++) {
          const node = rGetPutCache.get(uids[i])
          if (isRevokesAllowed(node.x, { permission })) await addPropsToResponse(generatedQueryFormatSection, response, { node }, graphRelationships?.[i] || null, iQuery) // call desired function on each node
        }

        await implementQueryOptions(generatedQueryFormatSection, response, isUsingSortIndexNodes, publicJWKs[iQuery], passport)
      }
    }


    /**
     * @param { td.QueryRequestFormatGenerated } generatedQueryFormatSection 
     * @param { td.QueryResponse } response 
     * @param { { node?: any, uid?: string } } item 
     * @param { { key: string, value: any } | null } graphRelationship
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addPropsToResponse (generatedQueryFormatSection, response, item, graphRelationship, iQuery) {
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

        if (graphRelationship?.value) {
          for (const prop in graphRelationship.value) {
            if (prop.startsWith('_')) responseOriginalNode[prop] = graphRelationship.value[prop]
          }
        }

        for (const queryFormatPropertyKey in generatedQueryFormatSection.x) { // loop a section of query.format object
          if (isRevokesAllowed(responseOriginalNode, { key: getRevokesKey({ action: 'read', nodeName: generatedQueryFormatSection.nodeName, propName: queryFormatPropertyKey }) })) {
            const queryFormatPropertyValue = generatedQueryFormatSection.x[queryFormatPropertyKey]
            const isTruthy = queryFormatPropertyValue === true
            const alias = queryFormatPropertyValue?.id === enums.idsQuery.Alias ? queryFormatPropertyValue.x?.alias : null
            const schemaNodeProp = passport.schema?.nodes[generatedQueryFormatSection.nodeName]?.[queryFormatPropertyKey]
            const schemaRelationshipProp = generatedQueryFormatSection.relationshipName ? /**@type { any } */ (passport.schema?.relationships)?.[generatedQueryFormatSection.relationshipName]?.x?.props?.[queryFormatPropertyKey] : null

            if (queryFormatPropertyKey === 'uid') { // not a prop defined in the schema
              if (isTruthy) responseCurrentNode.uid = uid
              else if (alias) responseCurrentNode[alias] = uid
            } else if (queryFormatPropertyKey === '_uid' && graphRelationship) { // not a prop defined in the schema
              if (isTruthy) responseCurrentNode._uid = graphRelationship.key
              else if (alias) responseCurrentNode[alias] = graphRelationship.key
            } else if (schemaRelationshipProp?.id === enums.idsSchema.RelationshipProp && typeof graphRelationship?.value[queryFormatPropertyKey] !== 'undefined') { // this prop is defined @ schema.relationships
              if (isTruthy) responseCurrentNode[queryFormatPropertyKey] = graphRelationship.value[queryFormatPropertyKey]
              else if (alias) responseCurrentNode[alias] = graphRelationship?.value[queryFormatPropertyKey]
            } else if (schemaNodeProp?.id === enums.idsSchema.Prop) { // this prop is defined @ schema.nodes and is a SchemaProp        
              if (isTruthy) responseCurrentNode[queryFormatPropertyKey] = graphNode.x[queryFormatPropertyKey]
              else if (alias) responseCurrentNode[alias] = graphNode.x[queryFormatPropertyKey]      
            } else if (schemaNodeProp?.id === enums.idsSchema.ForwardRelationshipProp || schemaNodeProp?.id === enums.idsSchema.ReverseRelationshipProp || schemaNodeProp?.id === enums.idsSchema.BidirectionalRelationshipProp) { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
              const relationshipUids = graphNode[getRelationshipProp(schemaNodeProp.x.relationshipName)]
              const relationshipGeneratedQueryFormatSection = getGeneratedQueryFormatSectionByParent(queryFormatPropertyValue, queryFormatPropertyKey, passport, generatedQueryFormatSection)        

              if (relationshipUids?.length) {
                let findByUidFound = false
                let findBy_UidFound = false
                let findByUniqueFound = false
                let nodeUids = /** @type { string[] } */ ([])
                const graphRelationships = /** @type { any[] } */ ([])

                const findByUid = /** @type { td.QueryFindByUid } */ (relationshipGeneratedQueryFormatSection.priorityOptions.get(enums.idsQuery.FindByUid))
                const findBy_Uid = /** @type { td.QueryFindBy_Uid } */ (relationshipGeneratedQueryFormatSection.priorityOptions.get(enums.idsQuery.FindBy_Uid))
                const findByUnique = /** @type { td.QueryFindByUnique } */ (relationshipGeneratedQueryFormatSection.priorityOptions.get(enums.idsQuery.FindByUnique))
                const filterByUniques = /** @type { td.QueryFilterByUniques } */ (relationshipGeneratedQueryFormatSection.priorityOptions.get(enums.idsQuery.FilterByUniques))
                
                const uniqueKeys = /** @type { string[] } */ ([])

                if (findByUnique) uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryFormatSection.nodeName, findByUnique.x.property, findByUnique.x.value))
                else if (filterByUniques) {
                  for (const unique of filterByUniques.x.uniques) {
                    uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryFormatSection.nodeName, unique.property, unique.value))
                  }
                }

                const uniqueUids = /** @type { string[] } */ ([])

                if (uniqueKeys.length) {
                  const rGetPutCache = await getPutCache(uniqueKeys)
                  uniqueUids.push(...[ ...rGetPutCache.values() ])
                }

                const rGetPutCache = await getPutCache(relationshipUids)

                switch (schemaNodeProp.id) {
                  case enums.idsSchema.ForwardRelationshipProp:
                    rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                      if (uid === graphRelationship?.x.a) validateAndPushUids(relationshipGeneratedQueryFormatSection, graphRelationship.x.b, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
                    })
                    break
                  case enums.idsSchema.ReverseRelationshipProp:
                    rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                      if (uid === graphRelationship?.x.b) validateAndPushUids(relationshipGeneratedQueryFormatSection, graphRelationship.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
                    })
                    break
                  case enums.idsSchema.BidirectionalRelationshipProp:
                    rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                      validateAndPushUids(relationshipGeneratedQueryFormatSection, uid === graphRelationship?.x.a ? graphRelationship?.x.b : graphRelationship?.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
                    })
                    break
                }

                let isValid = true

                if (findByUid) {
                  if (findByUidFound) nodeUids = [ findByUid.x.uid ]
                  else isValid = false
                }

                if (findByUnique) {
                  if (findByUniqueFound) nodeUids = [ uniqueUids[0] ]
                  else isValid = false
                }

                if (findBy_Uid) {
                  if (findBy_UidFound) nodeUids = [ findBy_Uid.x._uid ]
                  else isValid = false
                }

                if (isValid) await addNodesToResponse(relationshipGeneratedQueryFormatSection, { current: responseCurrentNode, original: responseOriginalNode }, nodeUids, graphRelationships, false, iQuery)
              }
            }
          }
        }

        if (Object.keys(responseCurrentNode).length) {
          if (response.current[generatedQueryFormatSection.property]?.length) {
            response.current[generatedQueryFormatSection.property].push(responseCurrentNode)
            response.original[generatedQueryFormatSection.property].push(responseOriginalNode)
          } else {
            response.current[generatedQueryFormatSection.property] = [responseCurrentNode]
            response.original[generatedQueryFormatSection.property] = [responseOriginalNode]
          }
        }
      }
    }


    /**
     * @param { td.QueryRequestFormatGenerated } relationshipGeneratedQueryFormatSection 
     * @param { string } uid 
     * @param { any[] } graphRelationships 
     * @param { any } graphRelationship 
     * @param { string } graphRelationshipKey 
     * @param { string[] } nodeUids 
     * @param { td.QueryFindByUid } findByUid 
     * @param { td.QueryFindBy_Uid } findBy_Uid 
     * @param { td.QueryFindByUnique } findByUnique
     * @param { td.QueryFilterByUniques } filterByUniques 
     * @param { string[] } uniqueUids 
     * @param { boolean } findByUidFound 
     * @param { boolean } findByUniqueFound 
     * @param { boolean } findBy_UidFound 
     */
    function validateAndPushUids (relationshipGeneratedQueryFormatSection, uid, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound) {
      const filterByUids = /** @type { td.QueryFilterByUids } */ (relationshipGeneratedQueryFormatSection.priorityOptions.get(enums.idsQuery.FilterByUids))
      const filterBy_Uids = /** @type { td.QueryFilterBy_Uids } */ (relationshipGeneratedQueryFormatSection.priorityOptions.get(enums.idsQuery.FilterBy_Uids))

      if (!filterByUids || relationshipGeneratedQueryFormatSection.sets.get(enums.idsQuery.FilterByUids)?.has(uid)) {
        if (!filterBy_Uids || relationshipGeneratedQueryFormatSection.sets.get(enums.idsQuery.FilterBy_Uids)?.has(graphRelationshipKey)) {
          if (!filterByUniques || relationshipGeneratedQueryFormatSection.sets.get(enums.idsQuery.FilterByUniques)?.has(uid)) {
            nodeUids.push(uid)
            graphRelationships.push({ key: graphRelationshipKey, value: graphRelationship.x })

            if (findByUid && findByUid.x.uid === uid) findByUidFound = true
            else if (findBy_Uid && findBy_Uid.x._uid === graphRelationshipKey) findBy_UidFound = true
            else if (findByUnique && uniqueUids.length && uniqueUids[0] === uid) findByUniqueFound = true
          }
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
