import { error } from './throw.js'
import { td, enums } from '#manifest'
import { Passport } from './Passport.js'
import { aceFetch } from './aceFetch.js'
import { implementQueryOptions } from './queryOptions.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { NODE_UIDS_KEY, getRelationshipProp, getSortIndexKey, getRevokesKey, getUniqueIndexKey } from './variables.js'
import { getGeneratedXQuerySectionByParent, getGeneratedXQuerySectionById } from './getGeneratedXQuerySection.js'


/**
 * @param { td.AceCore } core
 * @param { td.QueryRequest } request 
 * @returns { Promise<any> }
 */
export async function query (core, request) {
  return aceFetch(core, enums.pathnames.query, { body: { request, publicJWKs: core.publicJWKs } })
}


/**
 * @param { Passport } passport
 * @param { { request: td.QueryRequest, publicJWKs?: { [keyName: string]: string } } } body - Query request
 * @returns { Promise<any> }
 */
export async function _query (passport, body) {
  try {
    await passport.stamp()

    /** @type { td.QueryRequestItem[] } - Ensure we are always dealing with an array */
    const request = Array.isArray(body.request) ? body.request : [ body.request ]

    /** @type { QueryCache } - Store nodes we look up in this cache map, so if the nodes are requested again (w/in a relationship), we can retrieve the nodes from this cache map */
    const cache = new Map()

    /** @type { td.QueryPublicJWKs[] } - Converts `JSON.stringify()` jwks into `CryptoKey` jwks */
    const publicJWKs = []

    /** @type { td.QueryResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.x` will be in now. */
    const response = { now: {}, original: {} }

    /**
     * @typedef { Map<string, any> } QueryCache
     * @typedef { Map<string, { relationshipName: string, nodePropName: string }> } SchemaRelationshipsMap
     */

    await setPublicJWKs()

    for (let i = 0; i < request.length; i++) {
      switch (request[i].id) {
        case enums.idsQuery.AceBackup:
          const queryRequestItemAceBackup = /** @type { td.QueryRequestItemAceBackup } */ (request[i])

          passport.revokesAcePermissions?.forEach((value) => { 
            if (value.action === 'read' && value.schema === true) throw error('auth__read-schema', `Because read permissions to the schema is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
            if (value.action === 'read' && value.nodeName) throw error('auth__read-node', `Because read permissions to the node name \`${value.nodeName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
            if (value.action === 'read' && value.relationshipName) throw error('auth__read-relationship', `Because read permissions to the relationship name \`${value.relationshipName}\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          })

          /** @type { { [k: string]: any } } - We'll turn the map into this object */
          const rList = {}
          const listEntries = await passport.storage.list()

          listEntries.forEach((value, key) => {
            rList[key] = value
          })

          response.now[queryRequestItemAceBackup.property] = rList
          break
        case enums.idsQuery.AceSchema:
          const queryRequestItemAceSchema = /** @type { td.QueryRequestItemAceSchema } */ (request[i])

          if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'read', schema: true }))) throw error('auth__read-schema', 'Because the read schema permission is revoked from your AcePermission\'s, you cannot do this', { token: passport.token, source: passport.source })
          response.now[queryRequestItemAceSchema.property] = passport.schema
          break
        default:
          const queryRequestItemNode =  /** @type { td.QueryRequestItemNode } */ (request[i])
          const { uids, generatedXQuerySection, isUsingSortIndexNodes } = await getInitialUids(queryRequestItemNode)

          await addNodesToResponse(generatedXQuerySection, response, uids, null, isUsingSortIndexNodes, i)
          break
      }
    }

    return response.now



    async function setPublicJWKs () {
      if (body.publicJWKs) {
        const jwks = /** @type { td.QueryPublicJWKs } */ ({})

        for (const key in body.publicJWKs) {
          jwks[key] = await crypto.subtle.importKey('jwk', JSON.parse(body.publicJWKs[key]), getAlgorithmOptions('import'), true, ['verify'])
        }
      }
    }


    /**
     * @param { td.QueryRequestItemNode } query
     * @returns { Promise<{ uids: any, isUsingSortIndexNodes: any, generatedXQuerySection: any }> }
     */
    async function getInitialUids (query) {
      let uids

      const generatedXQuerySection = getGeneratedXQuerySectionById(query, query.property, passport)
      const sortOptions = /** @type { td.QuerySort } */ (generatedXQuerySection.priorityOptions.get(enums.idsQueryOptions.Sort))
      const findByUid = /** @type { td.QueryFindByUid } */ (generatedXQuerySection.priorityOptions.get(enums.idsQueryOptions.FindByUid))
      const findByUnique = /** @type { td.QueryFindByUnique } */ (generatedXQuerySection.priorityOptions.get(enums.idsQueryOptions.FindByUnique))
      const filterByUids = /** @type { td.QueryFilterByUids } */ (generatedXQuerySection.priorityOptions.get(enums.idsQueryOptions.FilterByUids))
      const filterByUniques = /** @type { td.QueryFilterByUniques } */ (generatedXQuerySection.priorityOptions.get(enums.idsQueryOptions.FilterByUniques))

      if (sortOptions) {
        const indexKey = getSortIndexKey(generatedXQuerySection.nodeName, sortOptions.x.property) // IF sorting by an property requested => see if property is a sort index
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
          const key = getUniqueIndexKey(generatedXQuerySection.nodeName, findByUnique.x.property, findByUnique.x.value)
          const rGetPutCache = await getPutCache([ key ])
          const uid = rGetPutCache.get(key)
          uids = uid ? [uid ] : []
          if (!uids.length) isValid = false
        } else if (filterByUniques) {
          const keys = filterByUniques.x.uniques.map((value) => {
            return getUniqueIndexKey(generatedXQuerySection.nodeName, value.property, value.value)
          })

          const rGetPutCache = await getPutCache(keys)
          uids = [ ...(rGetPutCache.values()) ]
          if (!uids.length) isValid = false
        }

        if (isValid && !uids?.length) {
          const allNodes = await passport.storage.get(NODE_UIDS_KEY)
          uids = allNodes ? allNodes[generatedXQuerySection.nodeName] : [] // IF property is not a sort index => get unsorted node uids from $nodeUids in database
        }
      }

      return {
        uids,
        isUsingSortIndexNodes,
        generatedXQuerySection
      }
    }


    /**
     * @param { td.QueryRequestItemGeneratedXSection } generatedXQuerySection 
     * @param { td.QueryResponse } response 
     * @param { string[] } uids 
     * @param { any[] | null } graphRelationships
     * @param { boolean } isUsingSortIndexNodes
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addNodesToResponse (generatedXQuerySection, response, uids, graphRelationships, isUsingSortIndexNodes, iQuery) {
      const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', nodeName: generatedXQuerySection.nodeName, propName: '*' }))

      if (permission && !permission.allowPropName) throw error('auth__read-node', `Because the read node name \`${ generatedXQuerySection.nodeName }\` permission is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })

      const rGetPutCache = await getPutCache(uids)

      for (let i = 0; i < uids.length; i++) {
        const node = rGetPutCache.get(uids[i])
        if (isRevokesAllowed(node.x, { permission })) await addPropsToResponse(generatedXQuerySection, response, { node }, graphRelationships?.[i] || null, iQuery) // call desired function on each node
      }

      await implementQueryOptions(generatedXQuerySection, response, isUsingSortIndexNodes, publicJWKs[iQuery], passport)
    }


    /**
     * @param { td.QueryRequestItemGeneratedXSection } generatedXQuerySection 
     * @param { td.QueryResponse } response 
     * @param { { node?: any, uid?: string } } item 
     * @param { { key: string, value: any } | null } graphRelationship
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addPropsToResponse (generatedXQuerySection, response, item, graphRelationship, iQuery) {
      let graphNode = item.node

      const uid = item.uid || item.node?.x?.uid

      if (!graphNode && uid) {
        const rGetPutCache = await getPutCache([ uid ])
        graphNode = rGetPutCache.get(uid)
      }

      if (!graphNode) {
        response.now[ generatedXQuerySection.property ] = null
        response.original[ generatedXQuerySection.property ] = null
      } else {
        const responseOriginalNode = graphNode.x
        const responseCurrentNode = /** @type { { [propertyName: string]: any } } */ ({})

        if (graphRelationship?.value) {
          for (const prop in graphRelationship.value) {
            if (prop.startsWith('_')) responseOriginalNode[prop] = graphRelationship.value[prop]
          }
        }

        for (const xKey in generatedXQuerySection.x) { // loop a section of query.x object
          if (isRevokesAllowed(responseOriginalNode, { key: getRevokesKey({ action: 'read', nodeName: generatedXQuerySection.nodeName, propName: xKey }) })) {
            const xValue = generatedXQuerySection.x[xKey]
            const isTruthy = xValue === true
            const alias = xValue?.id === enums.idsQueryOptions.Alias ? xValue.x?.alias : null
            const schemaNodeProp = passport.schema?.nodes[generatedXQuerySection.nodeName]?.[xKey]
            const schemaRelationshipProp = generatedXQuerySection.relationshipName ? /**@type { any } */ (passport.schema?.relationships)?.[generatedXQuerySection.relationshipName]?.x?.props?.[xKey] : null

            if (xKey === 'uid') { // not a prop defined in the schema
              if (isTruthy) responseCurrentNode.uid = uid
              else if (alias) responseCurrentNode[alias] = uid
            } else if (xKey === '_uid' && graphRelationship) { // not a prop defined in the schema
              if (isTruthy) responseCurrentNode._uid = graphRelationship.key
              else if (alias) responseCurrentNode[alias] = graphRelationship.key
            } else if (schemaRelationshipProp?.id === enums.idsSchema.RelationshipProp && typeof graphRelationship?.value[xKey] !== 'undefined') { // this prop is defined @ schema.relationships
              if (isTruthy) responseCurrentNode[xKey] = graphRelationship.value[xKey]
              else if (alias) responseCurrentNode[alias] = graphRelationship?.value[xKey]
            } else if (schemaNodeProp?.id === enums.idsSchema.Prop) { // this prop is defined @ schema.nodes and is a SchemaProp        
              if (isTruthy) responseCurrentNode[xKey] = graphNode.x[xKey]
              else if (alias) responseCurrentNode[alias] = graphNode.x[xKey]      
            } else if (schemaNodeProp?.id === enums.idsSchema.ForwardRelationshipProp || schemaNodeProp?.id === enums.idsSchema.ReverseRelationshipProp || schemaNodeProp?.id === enums.idsSchema.BidirectionalRelationshipProp) { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
              const relationshipUids = graphNode[getRelationshipProp(schemaNodeProp.x.relationshipName)]
              const relationshipGeneratedQueryXSection = getGeneratedXQuerySectionByParent(xValue, xKey, passport, generatedXQuerySection)        

              if (relationshipUids?.length) {
                let findByUidFound = false
                let findBy_UidFound = false
                let findByUniqueFound = false
                let nodeUids = /** @type { string[] } */ ([])
                const graphRelationships = /** @type { any[] } */ ([])

                const findByUid = /** @type { td.QueryFindByUid } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindByUid))
                const findBy_Uid = /** @type { td.QueryFindBy_Uid } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindBy_Uid))
                const findByUnique = /** @type { td.QueryFindByUnique } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindByUnique))
                const filterByUniques = /** @type { td.QueryFilterByUniques } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterByUniques))
                
                const uniqueKeys = /** @type { string[] } */ ([])

                if (findByUnique) uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.nodeName, findByUnique.x.property, findByUnique.x.value))
                else if (filterByUniques) {
                  for (const unique of filterByUniques.x.uniques) {
                    uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.nodeName, unique.property, unique.value))
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
                      if (uid === graphRelationship?.x.a) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.b, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
                    })
                    break
                  case enums.idsSchema.ReverseRelationshipProp:
                    rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                      if (uid === graphRelationship?.x.b) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
                    })
                    break
                  case enums.idsSchema.BidirectionalRelationshipProp:
                    rGetPutCache.forEach((graphRelationship, graphRelationshipKey) => {
                      validateAndPushUids(relationshipGeneratedQueryXSection, uid === graphRelationship?.x.a ? graphRelationship?.x.b : graphRelationship?.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
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

                if (isValid) await addNodesToResponse(relationshipGeneratedQueryXSection, { now: responseCurrentNode, original: responseOriginalNode }, nodeUids, graphRelationships, false, iQuery)
              }
            }
          }
        }

        if (Object.keys(responseCurrentNode).length) {
          if (response.now[generatedXQuerySection.property]?.length) {
            response.now[generatedXQuerySection.property].push(responseCurrentNode)
            response.original[generatedXQuerySection.property].push(responseOriginalNode)
          } else {
            response.now[generatedXQuerySection.property] = [responseCurrentNode]
            response.original[generatedXQuerySection.property] = [responseOriginalNode]
          }
        }
      }
    }


    /**
     * @param { td.QueryRequestItemGeneratedXSection } relationshipGeneratedQueryXSection 
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
    function validateAndPushUids (relationshipGeneratedQueryXSection, uid, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound) {
      const filterByUids = /** @type { td.QueryFilterByUids } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterByUids))
      const filterBy_Uids = /** @type { td.QueryFilterBy_Uids } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterBy_Uids))

      if (!filterByUids || relationshipGeneratedQueryXSection.sets.get(enums.idsQueryOptions.FilterByUids)?.has(uid)) {
        if (!filterBy_Uids || relationshipGeneratedQueryXSection.sets.get(enums.idsQueryOptions.FilterBy_Uids)?.has(graphRelationshipKey)) {
          if (!filterByUniques || relationshipGeneratedQueryXSection.sets.get(enums.idsQueryOptions.FilterByUniques)?.has(uid)) {
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
