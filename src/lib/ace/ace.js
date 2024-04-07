import { core } from './core.js'
import { td, enums } from '#manifest'
import { aceFetch } from '../aceFetch.js'
import { many } from '../objects/AceCache.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { queryNode, queryRelationship } from './query/query.js'
import { getAlgorithmOptions } from '../security/getAlgorithmOptions.js'
import { setSchemaDataStructures, stamp } from '../objects/AcePassport.js'
import { getSortIndexKey, getRelationshipProp, getNodeUidsKey, getRevokesKey } from '../variables.js'
import { dataDeleteNodeProps, dataDeleteRelationshipProps, deleteNodesByUids, deleteRelationshipsBy_Uids, inupNode, inupRelationship, addToSchema, schemaAndDataDeleteNodes } from './mutate.js'


/**
 * Chat w/ Ace Graph Database
 * @param { td.AceFnOptions } options
 * @param { td.AceFnRequest } request
 * @returns { Promise<td.AceFnResponse> }
 */
export async function ace (options, request) {
  return await aceFetch(options, '/ace', { body: { request, privateJWKs: options.privateJWKs, publicJWKs: options.publicJWKs } })
}


/**
 * Chat w/ Ace Graph Database
 * @param { td.AcePassport } passport
 * @param { { request: td.AceFnRequest, privateJWKs?: { [keyName: string]: string }, publicJWKs?: { [keyName: string]: string } } } body - Mutation request
 * @returns { Promise<td.AceFnResponse> }
*/
export async function _ace (passport, body) {
  try {
    await stamp(passport)
    
    const publicJWKs = /** @type { td.AceFnJWKs } */ ({})
    const privateJWKs = /** @type { td.AceFnJWKs } */ ({})
    const newUidsMap = /** @type { td.AceFnNewUids } */ (new Map())
    const nodeUidsMap = /** @type { td.AceFnNodeUidsMap } */ (new Map())
    const sortIndexMap = /** @type { td.AceFnSortIndexMap } */ (new Map())
    const updateRequestItems = /** @type { td.AceFnUpdateRequestItems } */ ({ nodes: null, relationships: null })

    /** @type { (td.AceQueryRequestItem | td.AceMutateRequestItem)[] } Request as an array */
    const request = Array.isArray(body.request) ? body.request : [ body.request ]

    /** @type { string[] } - The passport.cache.deleteSet converted into an array */
    let deletedKeys = []

    /** @type { td.AceFnFullResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.x` will be in now. */
    const response = { now: {}, original: {} }

    await setPrivateJWKs()
    await setPublicJWKs()
    await prepLoop()
    await deligate()
    throwIfMissingMustProps()
    await addSortIndicesToGraph()
    return conclude()


    async function setPrivateJWKs () {
      if (body.privateJWKs) {
        for (const name in body.privateJWKs) {
          privateJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(body.privateJWKs[name]), getAlgorithmOptions('import'), true, ['sign'])
        }
      }
    }


    async function setPublicJWKs () {
      if (body.publicJWKs) {
        for (const name in body.publicJWKs) {
          publicJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(body.publicJWKs[name]), getAlgorithmOptions('import'), true, ['verify'])
        }
      }
    }


    async function prepLoop () {
      if (request) {
        /** @type { Map<string, string> } - <nodeUidsKey, nodeName> Map of node names we will get uids for */
        const nodeNamesMap = new Map()

        /** @type { { node: string[], relationship: string[] } } - We will convert uids to graph nodes to help with updating */
        const updateUids = { node: [], relationship: [] }

        for (let i = 0; i < request.length; i++) {
          if (request[i].id === enums.idsAce.UpdateNode) {
            const mutateRequestItemUpdateNode = /** @type { td.AceMutateRequestItemUpdateNode } */(request[i])
            const nodeName = mutateRequestItemUpdateNode.nodeName

            nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
            updateUids.node.push(mutateRequestItemUpdateNode.x.uid)
          }

          if (request[i].id === enums.idsAce.UpdateRelationship) {
            updateUids.relationship.push(/** @type { td.AceMutateRequestItemUpdateRelationship } */(request[i]).x._uid)
          }

          if (request[i].id === enums.idsAce.SchemaAndDataDeleteNodes) {
            /** @type { td.AceMutateRequestItemSchemaAndData } */(request[i]).x.nodes.forEach(nodeName => {
              nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
            })
          }

          if (request[i].id === enums.idsAce.InsertNode) {
            const nodeName = /** @type { td.AceMutateRequestItemInsertNode } */ (request[i]).nodeName
            nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
          }
        }

        if (updateUids.node.length) updateRequestItems.nodes = await many(updateUids.node, passport.cache)
        if (updateUids.relationship.length) updateRequestItems.relationships = await many(updateUids.relationship, passport.cache)

        if (nodeNamesMap.size) {
          const keys = [...nodeNamesMap.keys() ]
          const rCache = await many(keys, passport.cache)

          for (const key of keys) {
            const nodeName = nodeNamesMap.get(key)
            if (nodeName) nodeUidsMap.set(nodeName, rCache.get(key) || [])
          }
        }
      }
    }

    async function deligate () {
      let preLoopDone = false
      const preLoopSet = new Set([ enums.idsAce.Empty, enums.idsAce.Core, enums.idsAce.SchemaAdd ])

      for (let iRequest = 0; iRequest < request.length; iRequest++) {
        const requestItem = request[iRequest]

        if (!preLoopDone && !preLoopSet.has(/** @type {*} */ (requestItem.id))) {
          prepLoop()
          preLoopDone = true
        }

        switch (requestItem.id) {
          case enums.idsAce.Empty:
            await empty(requestItem)
            break
          case enums.idsAce.Core:
            const coreResponse = await core(passport)
            if (requestItem.property) response.now[requestItem.property] = coreResponse
            break
          case enums.idsAce.QueryNode:
            await queryNode(requestItem, passport, response, publicJWKs, iRequest)
            break
          case enums.idsAce.QueryRelationship:
            await queryRelationship(requestItem, passport, response, publicJWKs, iRequest)
            break
          case enums.idsAce.SchemaGet:
            await schemaGet(requestItem)
            break
          case enums.idsAce.SchemaAdd:
            const addToSchemaResponse = addToSchema(passport, requestItem.x)
            if (requestItem.property) response.now[requestItem.property] = addToSchemaResponse
            setSchemaDataStructures(passport)
            break
          case enums.idsAce.BackupGet:
            await backupGet(requestItem)
            break
          case enums.idsAce.BackupSave:
            await backupSave(requestItem)
            break
          case enums.idsAce.InsertNode:
          case enums.idsAce.UpdateNode:
            await inupNode(requestItem, passport, nodeUidsMap, sortIndexMap, newUidsMap, updateRequestItems, privateJWKs)
            break
          case enums.idsAce.InsertRelationship:
          case enums.idsAce.UpdateRelationship:
            await inupRelationship(requestItem, passport, updateRequestItems, newUidsMap)
            break
          case enums.idsAce.DataDeleteNodes:
            if (requestItem.x?.uids?.length) await deleteNodesByUids(requestItem.x.uids, passport)
            break
          case enums.idsAce.DataDeleteRelationships:
            if (requestItem.x?._uids?.length) await deleteRelationshipsBy_Uids(requestItem.x._uids, passport)
            break
          case enums.idsAce.DataDeleteNodeProps:
            if (requestItem.x?.uids?.length && requestItem.x?.props?.length) await dataDeleteNodeProps(requestItem, passport)
            break
          case enums.idsAce.DataDeleteRelationshipProps:
            if (requestItem.x?._uids?.length && requestItem.x?.props?.length) await dataDeleteRelationshipProps(requestItem, passport)
            break
          case enums.idsAce.SchemaAndDataDeleteNodes:
            await schemaAndDataDeleteNodes(requestItem, nodeUidsMap, passport)
            break
        }
      }

      if (passport.cache.deleteSet.size) {
        passport.cache.deleteSet.forEach(uid => deletedKeys.push(uid))
        passport.cache.storage.delete(deletedKeys)
      }


      /**
       * @param { td.AceMutateRequestItemEmpty } requestItem
       * @returns { Promise<void> }
       */
      async function empty (requestItem) {
        throwIfAnyGenericRevokes()
        passport.cache.storage.deleteAll() // empty storage

        nodeUidsMap.clear() // clear nodeUidsMap

        // empty passport schema
        passport.schema = undefined
        passport.schemaDataStructures = {}
        
        if (requestItem.property) response.now[requestItem.property] = { success: true }
      }


      /** @param { td.AceQueryRequestItemAceBackup } requestItem */
      async function backupGet (requestItem) {
        passport.revokesAcePermissions?.forEach((value) => {
          if (value.action === 'read' && value.schema === true) throw AceAuthError(enums.permissionActions.read, passport, { schema: true })
          if (value.action === 'read' && value.nodeName) throw AceAuthError(enums.permissionActions.read, passport, { nodeName: value.nodeName })
          if (value.action === 'read' && value.relationshipName) throw AceAuthError(enums.permissionActions.read, passport, { relationshipName: value.relationshipName })
        })

        /** @type { td.AceBackupResponse } - We'll turn the map into this object */
        const rList = {}
        const listMap = await passport.cache.storage.list()

        listMap.forEach((value, key) => { // skip if in deleteSet AND see if in putMap first
          if (!passport.cache.deleteSet.has(key)) rList[key] = passport.cache.putMap.get(key) || value
        })

        passport.cache.putMap.forEach((value, key) => { // if something is in putMap and not in listMap => add to rList
          if (!listMap.has(key)) rList[key] = value
        })

        response.now[requestItem.property] = rList
      }


      /** @param { td.AceMutateRequestItemBackup } requestItem */
      async function backupSave (requestItem) {
        if (typeof requestItem?.x?.backup !== 'string') throw AceError('mutate__invalid-backup', 'This request fails b/c requestItemXBackup is not a string', { requestItemXBackup: requestItem?.x?.backup })

        throwIfAnyGenericRevokes()
        passport.cache.storage.deleteAll()
        passport.cache.storage.put(JSON.parse(requestItem.x.backup))
      }


      function throwIfAnyGenericRevokes () {
        passport.revokesAcePermissions?.forEach(value => {
          if (value.action === enums.permissionActions.inup || value.action === enums.permissionActions.insert || value.action === enums.permissionActions.update || value.action === enums.permissionActions.delete) {
            if (value.schema === true) throw AceAuthError(value.action, passport, { schema: true })
            if (value.nodeName) throw AceAuthError(value.action, passport, { nodeName: value.nodeName })
            if (value.relationshipName) throw AceAuthError(value.action, passport, { relationshipName: value.relationshipName })
          }
        })
      }
    }


    /**
     * @param { td.AceQueryRequestItemAceSchema } requstItem 
     */
    function schemaGet (requstItem) {
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'read', schema: true }))) throw AceAuthError(enums.permissionActions.read, passport, { schema: true })
      response.now[requstItem.property] = passport.schema
    }


    async function addSortIndicesToGraph () {
      if (sortIndexMap.size) {
        for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
          const nodes = [ ...(await many(uids, passport.cache)).values() ]
            .sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

          passport.cache.putMap.set(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid))
        }
      }
    }


    function throwIfMissingMustProps () {
      if (passport.cache.putMap.size) {
        for (const requestItem of passport.cache.putMap.values()) {
          const x = /** @type { td.AceMutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))
          const mustProps = requestItem.subId ? passport.schemaDataStructures?.mustPropsMap?.get(requestItem.subId) : null // the must props for a specific node or relationship

          if (mustProps) {
            mustProps.forEach((prop, propName) => {

              switch (prop.id) {
                case enums.idsSchema.Prop:
                case enums.idsSchema.RelationshipProp:
                  const schemaProp = /** @type { td.AceSchemaProp } */ (prop)
                  const letEmKnow = () => AceError('mutate__invalid-property-value', `Please ensure all required props are included and align with the data type in the schema, an example of where this is not happening yet is: Node: "${ requestItem.nodeName }", Prop: "${ propName }", Data Type: "${ schemaProp.x.dataType }"`, { nodeName: requestItem.nodeName, requestItem, propName, dataType: schemaProp.x.dataType })

                  switch (schemaProp.x.dataType) {
                    case 'isoString':
                      if (typeof x?.[propName] !== 'string') throw letEmKnow()
                      break
                    default:
                      if (typeof x?.[propName] !== schemaProp.x.dataType) throw letEmKnow()
                      break
                  }
                  break
                case enums.idsSchema.ForwardRelationshipProp:
                case enums.idsSchema.ReverseRelationshipProp:
                  validateNotBidirectionalMustProps((requestItem), prop, propName)
                  break
                case enums.idsSchema.BidirectionalRelationshipProp:
                  const bidirectionalRelationshipProp = /** @type { td.AceSchemaBidirectionalRelationshipProp } */ (prop)

                  if (!x[getRelationshipProp(bidirectionalRelationshipProp.x.relationshipName)]?.length) {
                    throw AceError('mutate__missing-must-defined-relationship', 'Please ensure relationships that must be defined, are defined.', { requiredPropName: propName, bidirectionalRelationshipProp, requestItem })
                  }
                  break
              }
            })
          }
        }


        /**
         * @param { td.AceMutateRequestItemInsertRelationship } rSchemaRelationshipProp 
         * @param { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp } schemaRelationshipProp 
         * @param { string } propName 
         */
        function validateNotBidirectionalMustProps (rSchemaRelationshipProp, schemaRelationshipProp, propName) {
          let isValid = false
          const storageUids = []
          const relationshipNodes = []
          const isInverse = schemaRelationshipProp.id === 'ReverseRelationshipProp'
          const x = /** @type { td.AceMutateRequestItemInsertRelationshipX } */ (rSchemaRelationshipProp.x)
          const relationshipUids = x[getRelationshipProp(schemaRelationshipProp.x.relationshipName)]

          if (relationshipUids) {
            for (const relationshipUid of relationshipUids) {
              const putEntry = passport.cache.putMap.get(relationshipUid)

              if (putEntry) relationshipNodes.push(putEntry)
              else storageUids.push(relationshipUid)
            }

            if (relationshipNodes.length) {
              for (const relationshipNode of relationshipNodes) {
                if (x.uid === relationshipNode[isInverse ? 'b' : 'a']) {
                  isValid = true
                  break
                }
              }
            }
          }

          if (!isValid) throw AceError('mutate__missing-must-defined-relationship', `${propName} is invalid because it is missing relationship props that must be defined, please ensure relationships that must be defined, are defined.`, { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp })
        }
      }
    }


    /** @returns { td.AceFnResponse } */
    function conclude () {
      let newUids = /** @type { { [k: string]: string } } */ ({})

      /** @type { { [k: string]: any } } - Convert putMap into an object that is ready for Cloudflare Storage */
      const putObj = {}

      if (passport.cache.putMap.size) { // convert from map to object for do storage
        passport.cache.putMap.forEach((v, k) => {
          if (!passport.cache.deleteSet.has(k)) putObj[k] = v // ensure this put is not being deleted
        })

        passport.cache.storage.put(putObj)
      }

      if (newUidsMap.size) newUidsMap.forEach((v, k) => newUids[k] = v) // convert from map to object for response

      response.now.$ace = { newUids, deletedKeys }

      return /** @type { td.AceFnResponse } */ (response.now)
    }
  } catch (e) {
    console.log('error', e)
    throw e
  }
}