import { error } from './throw.js'
import { td, enums } from '#manifest'
import { Passport } from './Passport.js'
import { aceFetch } from './aceFetch.js'
import { implementQueryOptions } from './queryOptions.js'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'
import { getXGeneratedByParent, getXGeneratedById } from './getXGenerated.js'
import { getRelationshipProp, getSortIndexKey, getRevokesKey, getUniqueIndexKey, getNodeUidsKey, getRelationshipUidsKey } from './variables.js'


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

    /** @type { td.QueryPublicJWKs[] } - Converts `JSON.stringify()` jwks into `CryptoKey` jwks */
    const publicJWKs = []

    /** @type { td.QueryResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.x` will be in now. */
    const response = { now: {}, original: {} }

    /**  @typedef { Map<string, { relationshipName: string, nodePropName: string }> } SchemaRelationshipsMap */

    await setPublicJWKs()

    for (let i = 0; i < request.length; i++) {
      switch (request[i].id) {
        case enums.idsQuery.AceBackup:
          const queryRequestItemAceBackup = /** @type { td.QueryRequestItemAceBackup } */ (request[i])

          passport.revokesAcePermissions?.forEach((value) => { 
            if (value.action === 'read' && value.schema === true) throw error('auth__read-schema', `Because read permissions to the schema is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
            if (value.action === 'read' && value.nodeName) throw error('auth__read-node', `Because read permissions to the node name \`${ value.nodeName }\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
            if (value.action === 'read' && value.relationshipName) throw error('auth__read-relationship', `Because read permissions to the relationship name \`${ value.relationshipName }\` is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })
          })

          /** @type { td.AceBackupResponse } - We'll turn the map into this object */
          const rList = {}
          const listEntries = await passport.cache.storage.list()

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
          if (!passport.schemaDataStructures?.nodeNamesSet) throw error('query__falsy-schemaDataStructures-nodeNamesSet', 'The schema data structure nodeNamesSet must be truthy, this is set based on the schemaDataStructuresOptions passed to new Passport(), pass { desiredSchemaDataStructures: { nodeNamesSet: true } } for this to work', { schemaDataStructuresOptions: passport.schemaDataStructuresOptions })
          if (!passport.schemaDataStructures?.relationshipNamesSet) throw error('query__falsy-schemaDataStructures-relationshipNamesSet', 'The schema data structure relationshipNamesSet must be truthy, this is set based on the schemaDataStructuresOptions passed to new Passport(), pass { desiredSchemaDataStructures: { relationshipNamesSet: true } } for this to work', { schemaDataStructuresOptions: passport.schemaDataStructuresOptions })

          if (passport.schemaDataStructures.nodeNamesSet.has(request[i].id)) {
            const queryRequestItemNode =  /** @type { td.QueryRequestItemNode } */ (request[i])
            const { uids, xGenerated, isUsingSortIndex } = await getInitialUids(queryRequestItemNode, 'getNodes')

            await addNodesToResponse(xGenerated, response, uids, null, isUsingSortIndex, i)
          } else if (passport.schemaDataStructures.relationshipNamesSet.has(request[i].id)) {
            const queryRequestItemRelationship =  /** @type { td.QueryRequestItemRelationship } */ (request[i])
            const { uids, xGenerated, isUsingSortIndex } = await getInitialUids(queryRequestItemRelationship, 'getRelationships')

            await addRelationshipsToResponse(xGenerated, response, uids, isUsingSortIndex, i)
          } else {
            throw error('query__invalid-query-id', `This error is thrown b/c the request id \`${ request[i].id }\` is not a node and it is not a relationship defined in your schema`, { requestId: request[i].id })
          }
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
     * @param { td.QueryRequestItemNode | td.QueryRequestItemRelationship } query
     * @param { 'getNodes' | 'getRelationships' } queryType
     * @returns { Promise<{ uids: any, isUsingSortIndex: any, xGenerated: any }> }
     */
    async function getInitialUids (query, queryType) {
      let uids

      const xGenerated = getXGeneratedById(query, passport, queryType)
      const sortOptions = /** @type { td.QuerySort } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.Sort))
      const findByUid = /** @type { td.QueryFindByUid } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FindByUid))
      const findByUnique = /** @type { td.QueryFindByUnique } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FindByUnique))
      const filterByUids = /** @type { td.QueryFilterByUids } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FilterByUids))
      const filterByUniques = /** @type { td.QueryFilterByUniques } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FilterByUniques))

      if (sortOptions) {
        const indexKey = getSortIndexKey(xGenerated.id, sortOptions.x.property) // IF sorting by an property requested => see if property is a sort index
        if (indexKey) uids = await passport.cache.one(indexKey)
      }

      let isUsingSortIndex = false

      if (uids) isUsingSortIndex = true // IF property is a sort index => tip flag to true
      else {
        let isValid = true

        if (findByUid) uids = [ findByUid.x.uid ]
        else if (filterByUids) {
          uids = filterByUids.x.uids
          if (!uids.length) isValid = false
        } else if (findByUnique) {
          const key = getUniqueIndexKey(xGenerated.id, findByUnique.x.property, findByUnique.x.value)
          const rCache = await passport.cache.one(key)
          const uid = rCache.get(key)
          uids = uid ? [uid ] : []
          if (!uids.length) isValid = false
        } else if (filterByUniques) {
          const keys = filterByUniques.x.uniques.map((value) => {
            return getUniqueIndexKey(xGenerated.id, value.property, value.value)
          })

          const rCache = await passport.cache.many(keys)
          uids = [ ...(rCache.values()) ]
          if (!uids.length) isValid = false
        }

        if (isValid && !uids?.length) {
          uids = queryType === 'getNodes' ?
            await passport.cache.one(getNodeUidsKey(xGenerated.id)) || [] :
            await passport.cache.one(getRelationshipUidsKey(xGenerated.id)) || []
        }
      }

      return {
        uids,
        isUsingSortIndex,
        xGenerated
      }
    }


    /**
     * @param { td.QueryRequestItemGeneratedXSection } xGenerated 
     * @param { td.QueryResponse } response 
     * @param { string[] } uids 
     * @param { any[] | null } graphRelationships
     * @param { boolean } isUsingSortIndex
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addNodesToResponse (xGenerated, response, uids, graphRelationships, isUsingSortIndex, iQuery) {
      const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', nodeName: xGenerated.id, propName: '*' }))

      if (permission && !permission.allowPropName) throw error('auth__read-node', `Because the read node name \`${ xGenerated.id }\` permission is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })

      const rCache = await passport.cache.many(uids)

      for (let i = 0; i < uids.length; i++) {
        const node = rCache.get(uids[i])
        if (isRevokesAllowed(node.x, { permission })) await addPropsToResponse(xGenerated, response, { node }, graphRelationships?.[i] || null, iQuery) // call desired function on each node
      }

      await implementQueryOptions(xGenerated, response, isUsingSortIndex, publicJWKs[iQuery], passport)
    }


    /**
     * @param { td.QueryRequestItemGeneratedXSection } xGenerated 
     * @param { td.QueryResponse } response 
     * @param { string[] } uids 
     * @param { boolean } isUsingSortIndex
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addRelationshipsToResponse (xGenerated, response, uids, isUsingSortIndex, iQuery) {
      const permission = passport.revokesAcePermissions?.get(getRevokesKey({ action: 'read', relationshipName: xGenerated.id, propName: '*' }))

      if (permission && !permission.allowPropName) throw error('auth__read-relationship', `Because the read relationship name \`${ xGenerated.id }\` permission is revoked from your AcePermission's, you cannot do this`, { token: passport.token, source: passport.source })

      const findBy_Uid = /** @type { td.QueryFindBy_Uid } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FindBy_Uid))

      if (findBy_Uid) {
        if (uids.includes(findBy_Uid.x._uid) ) uids = [ findBy_Uid.x._uid ]
      } else {
        const filterBy_Uids = /** @type { td.QueryFilterBy_Uids } */ (xGenerated.priorityOptions.get(enums.idsQueryOptions.FilterBy_Uids))

        if (filterBy_Uids) {
          if (xGenerated.sets.get(enums.idsQueryOptions.FilterBy_Uids)?.size) {
            for (let i = uids.length - 1; i >= 0; i--) {
              if (!xGenerated.sets.get(enums.idsQueryOptions.FilterBy_Uids)?.has(uids[i])) uids.splice(i, 1)
            }
          }
        }
      }

      const rCache = await passport.cache.many(uids)

      for (let i = 0; i < uids.length; i++) {
        const relationship = rCache.get(uids[i])
        if (isRevokesAllowed(relationship.x, { permission })) await addPropsToResponse(xGenerated, response, { relationship }, null, iQuery)
      }

      await implementQueryOptions(xGenerated, response, isUsingSortIndex, publicJWKs[iQuery], passport)
    }


    /**
     * @param { td.QueryRequestItemGeneratedXSection } xGenerated 
     * @param { td.QueryResponse } response 
     * @param { { node?: any, relationship?: any, uid?: string } } item 
     * @param { { key: string, value: any } | null } graphRelationship
     * @param { number } iQuery
     * @returns { Promise<void> }
     */
    async function addPropsToResponse (xGenerated, response, item, graphRelationship, iQuery) {
      let graphItem, _uid = '', uid = ''

      if (item.node) {
        graphItem = item.node
        uid = item.node?.x?.uid
      } else if (item.relationship) {
        graphItem = item.relationship
        _uid = item.relationship?.x?._uid
      } else if (item.uid) {
        uid = item.uid
        graphItem = await passport.cache.one(uid)
      }

      if (!graphItem) {
        response.now[ xGenerated.propName ] = null
        response.original[ xGenerated.propName ] = null
      } else {
        const responseOriginalItem = graphItem.x
        const responseNowItem = /** @type { { [propertyName: string]: any } } */ ({})

        if (graphRelationship?.value) {
          for (const prop in graphRelationship.value) {
            if (prop.startsWith('_')) responseOriginalItem[prop] = graphRelationship.value[prop]
          }
        }

        /** @type { Map<string, td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp> | undefined } */
        const relationshipPropsMap = (item.relationship && passport.schemaDataStructures?.relationshipPropsMap) ? passport.schemaDataStructures.relationshipPropsMap.get(xGenerated.id) : undefined

        for (const xKey in xGenerated.x) { // loop a section of query.x object
          const revokesOptions = item.relationship ?
            { key: getRevokesKey({ action: 'read', relationshipName: xGenerated.id, propName: xKey }) } :
            { key: getRevokesKey({ action: 'read', nodeName: xGenerated.id, propName: xKey }) }

          if (isRevokesAllowed(responseOriginalItem, revokesOptions)) {
            const xValue = xGenerated.x[xKey]
            const isTruthy = xValue === true
            const alias = xValue?.id === enums.idsQueryOptions.Alias ? xValue.x?.alias : null

            /** @type { { schemaNodeProp?: td.SchemaProp | td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp, schemaRelationshipProp?: td.SchemaRelationshipProp } } - If graphItemType is node, add node info to this object  */
            const parentNodeOptions = {}

            if (!item.relationship) {
              parentNodeOptions.schemaNodeProp = passport.schema?.nodes[xGenerated.id]?.[xKey]
              parentNodeOptions.schemaRelationshipProp = (xGenerated.relationshipName) ? passport.schema?.relationships?.[xGenerated.relationshipName]?.x?.props?.[xKey] : undefined
            }

            if (typeof responseOriginalItem[xKey] !== 'undefined') {
              if (isTruthy) responseNowItem[xKey] = responseOriginalItem[xKey]
              else if (alias) responseNowItem[alias] = responseOriginalItem[xKey]
            } else if (parentNodeOptions.schemaRelationshipProp?.id === enums.idsSchema.RelationshipProp && typeof graphRelationship?.value[xKey] !== 'undefined') { // this prop is defined @ schema.relationships
              if (isTruthy) responseNowItem[xKey] = graphRelationship.value[xKey]
              else if (alias) responseNowItem[alias] = graphRelationship?.value[xKey]
            } else if (parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.ForwardRelationshipProp || parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.ReverseRelationshipProp || parentNodeOptions.schemaNodeProp?.id === enums.idsSchema.BidirectionalRelationshipProp) { // this prop is defined @ schema.nodes and is a SchemaRelationshipProp
              const relationshipUids = graphItem[getRelationshipProp(parentNodeOptions.schemaNodeProp.x.relationshipName)]
              await addRelationshipPropsToResponse(uid, relationshipUids, parentNodeOptions.schemaNodeProp, xKey, xValue, xGenerated, responseNowItem, responseOriginalItem, iQuery)
            } else if (item.relationship && xKey !== '$options' && relationshipPropsMap) {
              const schemaNodeProp = relationshipPropsMap.get(xKey)
              const relationshipGeneratedQueryXSection = getXGeneratedByParent(xValue, xKey, passport, xGenerated)  

              if (schemaNodeProp?.id === 'BidirectionalRelationshipProp') {
                const uids = [ responseOriginalItem.a, responseOriginalItem.b ]
                const graphRelationship = { key: responseOriginalItem._uid, value: responseOriginalItem }
                const graphRelationships = [ graphRelationship, graphRelationship ]
                await addNodesToResponse(relationshipGeneratedQueryXSection, { now: responseNowItem, original: responseOriginalItem }, uids, graphRelationships, false, iQuery)
              } else {
                let uid

                if (schemaNodeProp?.id === 'ForwardRelationshipProp') uid = responseOriginalItem.b
                else if (schemaNodeProp?.id === 'ReverseRelationshipProp') uid = responseOriginalItem.a

                if (uid) {
                  await addPropsToResponse(relationshipGeneratedQueryXSection, { now: responseNowItem, original: responseOriginalItem }, { uid }, null, iQuery)
                  
                  if (responseNowItem[relationshipGeneratedQueryXSection.propName]?.length) responseNowItem[relationshipGeneratedQueryXSection.propName] = responseNowItem[relationshipGeneratedQueryXSection.propName][0]
                  if (responseOriginalItem[relationshipGeneratedQueryXSection.propName]?.length) responseOriginalItem[relationshipGeneratedQueryXSection.propName] = responseOriginalItem[relationshipGeneratedQueryXSection.propName][0]
                }
              }
            }
          }
        }

        if (Object.keys(responseNowItem).length) {
          if (response.now[ xGenerated.propName ]?.length) {
            response.now[ xGenerated.propName ].push(responseNowItem)
            response.original[ xGenerated.propName ].push(responseOriginalItem)
          } else {
            response.now[ xGenerated.propName ] = [responseNowItem]
            response.original[ xGenerated.propName ] = [responseOriginalItem]
          }
        }
      }
    }


    /**
     * @param { string } uid
     * @param { string[] } relationshipUids
     * @param { td.SchemaForwardRelationshipProp | td.SchemaReverseRelationshipProp | td.SchemaBidirectionalRelationshipProp | td.SchemaProp } schemaNodeProp
     * @param { string } xKey 
     * @param { any } xValue 
     * @param { td.QueryRequestItemGeneratedXSection } xGenerated 
     * @param { { [propertyName: string]: any } } responseNowItem 
     * @param { any } responseOriginalItem 
     * @param { number } iQuery 
     */
    async function addRelationshipPropsToResponse (uid, relationshipUids, schemaNodeProp, xKey, xValue, xGenerated, responseNowItem, responseOriginalItem, iQuery) {
      if (uid && schemaNodeProp && relationshipUids?.length) {
        let findByUidFound = false
        let findBy_UidFound = false
        let findByUniqueFound = false
        let nodeUids = /** @type { string[] } */ ([])
        const graphRelationships = /** @type { any[] } */ ([])
        const relationshipGeneratedQueryXSection = getXGeneratedByParent(xValue, xKey, passport, xGenerated)  

        const findByUid = /** @type { td.QueryFindByUid } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindByUid))
        const findBy_Uid = /** @type { td.QueryFindBy_Uid } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindBy_Uid))
        const findByUnique = /** @type { td.QueryFindByUnique } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FindByUnique))
        const filterByUniques = /** @type { td.QueryFilterByUniques } */ (relationshipGeneratedQueryXSection.priorityOptions.get(enums.idsQueryOptions.FilterByUniques))
        
        const uniqueKeys = /** @type { string[] } */ ([])

        if (findByUnique) uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.id, findByUnique.x.property, findByUnique.x.value))
        else if (filterByUniques) {
          for (const unique of filterByUniques.x.uniques) {
            uniqueKeys.push(getUniqueIndexKey(relationshipGeneratedQueryXSection.id, unique.property, unique.value))
          }
        }

        const uniqueUids = /** @type { string[] } */ ([])

        if (uniqueKeys.length) {
          (await passport.cache.many(uniqueKeys)).forEach(value => {
            uniqueUids.push(value)
          })
        }

        const rCache = await passport.cache.many(relationshipUids)

        switch (schemaNodeProp.id) {
          case enums.idsSchema.ForwardRelationshipProp:
            rCache.forEach((graphRelationship, graphRelationshipKey) => {
              if (uid === graphRelationship?.x.a) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.b, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
            })
            break
          case enums.idsSchema.ReverseRelationshipProp:
            rCache.forEach((graphRelationship, graphRelationshipKey) => {
              if (uid === graphRelationship?.x.b) validateAndPushUids(relationshipGeneratedQueryXSection, graphRelationship.x.a, graphRelationships, graphRelationship, graphRelationshipKey, nodeUids, findByUid, findBy_Uid, findByUnique, filterByUniques, uniqueUids, findByUidFound, findByUniqueFound, findBy_UidFound)
            })
            break
          case enums.idsSchema.BidirectionalRelationshipProp:
            rCache.forEach((graphRelationship, graphRelationshipKey) => {
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

        if (isValid) await addNodesToResponse(relationshipGeneratedQueryXSection, { now: responseNowItem, original: responseOriginalItem }, nodeUids, graphRelationships, false, iQuery)
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
