import { td, enums } from '#ace'
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
 * @param { td.AceFnFetchOptions } options
 * @returns { Promise<td.AceFnResponse> }
 */
export async function ace({ worker, request, privateJWKs, publicJWKs }) {
  return await aceFetch({
    url: worker + '/ace',
    body: { request, privateJWKs, publicJWKs }
  })
}


/**
 * Chat w/ Ace Graph Database
 * @param { td.AceFnOptions } options
 * @returns { Promise<td.AceFnResponse> }
*/
export async function _ace (options) {
  try {
    await stamp(options.passport)
    
    const publicJWKs = /** @type { td.AceFnCryptoJWKs } */ ({})
    const privateJWKs = /** @type { td.AceFnCryptoJWKs } */ ({})
    const newUidsMap = /** @type { td.AceFnNewUids } */ (new Map())
    const nodeUidsMap = /** @type { td.AceFnNodeUidsMap } */ (new Map())
    const sortIndexMap = /** @type { td.AceFnSortIndexMap } */ (new Map())
    const updateRequestItems = /** @type { td.AceFnUpdateRequestItems } */ ({ nodes: null, relationships: null })

    /** @type { (td.AceQueryRequestItem | td.AceMutateRequestItem)[] } Request as an array */
    const request = Array.isArray(options.request) ? options.request : [options.request ]

    /** @type { string[] } - The options.passport.cache.deleteSet converted into an array */
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
      if (options.privateJWKs) {
        for (const name in options.privateJWKs) {
          privateJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(options.privateJWKs[name]), getAlgorithmOptions('import'), true, ['sign'])
        }
      }
    }


    async function setPublicJWKs () {
      if (options.publicJWKs) {
        for (const name in options.publicJWKs) {
          publicJWKs[name] = await crypto.subtle.importKey('jwk', JSON.parse(options.publicJWKs[name]), getAlgorithmOptions('import'), true, ['verify'])
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
            /** @type { td.AceMutateRequestItemSchemaAndData } */(request[i]).x.nodes.forEach((/** @type { string } */ nodeName) => {
              nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
            })
          }

          if (request[i].id === enums.idsAce.InsertNode) {
            const nodeName = /** @type { td.AceMutateRequestItemInsertNode } */ (request[i]).nodeName
            nodeNamesMap.set(getNodeUidsKey(nodeName), nodeName)
          }
        }

        if (updateUids.node.length) updateRequestItems.nodes = await many(updateUids.node, options.passport.cache)
        if (updateUids.relationship.length) updateRequestItems.relationships = await many(updateUids.relationship, options.passport.cache)

        if (nodeNamesMap.size) {
          const keys = [ ...nodeNamesMap.keys() ]
          const rCache = await many(keys, options.passport.cache)

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

          case enums.idsAce.PluginInstall:
            const responseInstall = await _ace({ passport: options.passport, ...requestItem.x.install })
            if (requestItem.property) response.now[requestItem.property] = responseInstall
            break

          case enums.idsAce.PluginUninstall:
            const responseUninstall = await _ace({ passport: options.passport, request: requestItem.x.request })
            if (requestItem.property) response.now[requestItem.property] = responseUninstall
            break

          case enums.idsAce.QueryNode:
            await queryNode(requestItem, options.passport, response, publicJWKs, iRequest)
            break

          case enums.idsAce.QueryRelationship:
            await queryRelationship(requestItem, options.passport, response, publicJWKs, iRequest)
            break

          case enums.idsAce.SchemaGet:
            await schemaGet(requestItem)
            break

          case enums.idsAce.SchemaAdd:
            const addToSchemaResponse = addToSchema(options.passport, requestItem.x)
            if (requestItem.property) response.now[requestItem.property] = addToSchemaResponse
            setSchemaDataStructures(options.passport)
            break

          case enums.idsAce.BackupGet:
            await backupGet(requestItem)
            break

          case enums.idsAce.BackupLoad:
            await fileToGraph(requestItem)
            break

          case enums.idsAce.InsertNode:
          case enums.idsAce.UpdateNode:
            await inupNode(requestItem, options.passport, nodeUidsMap, sortIndexMap, newUidsMap, updateRequestItems, privateJWKs)
            break

          case enums.idsAce.InsertRelationship:
          case enums.idsAce.UpdateRelationship:
            await inupRelationship(requestItem, options.passport, updateRequestItems, newUidsMap)
            break

          case enums.idsAce.DataDeleteNodes:
            if (requestItem.x?.uids?.length) await deleteNodesByUids(requestItem.x.uids, options.passport)
            break

          case enums.idsAce.DataDeleteRelationships:
            if (requestItem.x?._uids?.length) await deleteRelationshipsBy_Uids(requestItem.x._uids, options.passport)
            break

          case enums.idsAce.DataDeleteNodeProps:
            if (requestItem.x?.uids?.length && requestItem.x?.props?.length) await dataDeleteNodeProps(requestItem, options.passport)
            break

          case enums.idsAce.DataDeleteRelationshipProps:
            if (requestItem.x?._uids?.length && requestItem.x?.props?.length) await dataDeleteRelationshipProps(requestItem, options.passport)
            break

          case enums.idsAce.SchemaAndDataDeleteNodes:
            await schemaAndDataDeleteNodes(requestItem, nodeUidsMap, options.passport)
            break
        }
      }

      if (options.passport.cache.deleteSet.size) {
        options.passport.cache.deleteSet.forEach((/** @type { string } */ uid) => deletedKeys.push(uid))
        options.passport.cache.storage.delete(deletedKeys)
      }


      /**
       * @param { td.AceMutateRequestItemEmpty } requestItem
       * @returns { Promise<void> }
       */
      async function empty (requestItem) {
        throwIfAnyGenericRevokes()
        options.passport.cache.storage.deleteAll() // empty storage

        nodeUidsMap.clear() // clear nodeUidsMap

        // empty passport schema
        options.passport.schema = undefined
        options.passport.schemaDataStructures = {}
        
        if (requestItem.property) response.now[requestItem.property] = { success: true }
      }


      /** @param { td.AceQueryRequestItemBackupGet } requestItem */
      async function backupGet (requestItem) {
        options.passport.revokesAcePermissions?.forEach((/** @type { td.AceGraphPermission } */ value) => {
          if (value.action === 'read' && value.schema === true) throw AceAuthError(enums.permissionActions.read, options.passport, { schema: true })
          if (value.action === 'read' && value.nodeName) throw AceAuthError(enums.permissionActions.read, options.passport, { nodeName: value.nodeName })
          if (value.action === 'read' && value.relationshipName) throw AceAuthError(enums.permissionActions.read, options.passport, { relationshipName: value.relationshipName })
        })

        /** @type { td.AceBackupResponse } - We'll turn the map into this object */
        const rList = {}
        const listMap = await options.passport.cache.storage.list()

        listMap.forEach((/** @type { any } */value, /** @type { string } */key) => { // skip if in deleteSet AND see if in putMap first
          if (!options.passport.cache.deleteSet.has(key)) rList[key] = options.passport.cache.putMap.get(key) || value
        })

        options.passport.cache.putMap.forEach((/** @type { any } */ value, /** @type { string } */ key) => { // if something is in putMap and not in listMap => add to rList
          if (!listMap.has(key)) rList[key] = value
        })

        response.now[requestItem.property] = rList
      }


      /** @param { td.AceMutateRequestItemBackupLoad } requestItem */
      async function fileToGraph (requestItem) {
        if (typeof requestItem?.x?.backup !== 'string') throw AceError('mutate__invalid-backup', 'This request fails b/c requestItemXBackup is not a string', { requestItemXBackup: requestItem?.x?.backup })

        throwIfAnyGenericRevokes()
        options.passport.cache.storage.deleteAll()
        options.passport.cache.storage.put(JSON.parse(requestItem.x.backup))
      }


      function throwIfAnyGenericRevokes () {
        options.passport.revokesAcePermissions?.forEach((/** @type { td.AceGraphPermission } */ value) => {
          if (value.action === enums.permissionActions.inup || value.action === enums.permissionActions.insert || value.action === enums.permissionActions.update || value.action === enums.permissionActions.delete) {
            if (value.schema === true) throw AceAuthError(value.action, options.passport, { schema: true })
            if (value.nodeName) throw AceAuthError(value.action, options.passport, { nodeName: value.nodeName })
            if (value.relationshipName) throw AceAuthError(value.action, options.passport, { relationshipName: value.relationshipName })
          }
        })
      }
    }


    /**
     * @param { td.AceQueryRequestItemSchemaGet } requstItem 
     */
    function schemaGet (requstItem) {
      if (options.passport.revokesAcePermissions?.has(getRevokesKey({ action: 'read', schema: true }))) throw AceAuthError(enums.permissionActions.read, options.passport, { schema: true })
      response.now[requstItem.property] = options.passport.schema
    }


    async function addSortIndicesToGraph () {
      if (sortIndexMap.size) {
        for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
          const nodes = [ ...(await many(uids, options.passport.cache)).values() ]
            .sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

          options.passport.cache.putMap.set(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid))
        }
      }
    }


    function throwIfMissingMustProps () {
      if (options.passport.cache.putMap.size) {
        for (const requestItem of options.passport.cache.putMap.values()) {
          const x = /** @type { td.AceMutateRequestItemInsertRelationshipX } */ (/** @type {*} */ (requestItem.x))
          const mustProps = requestItem.subId ? options.passport.schemaDataStructures?.mustPropsMap?.get(requestItem.subId) : null // the must props for a specific node or relationship

          if (mustProps) {
            mustProps.forEach((/** @type { td.AceSchemaProp | td.AceSchemaRelationshipProp | td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ prop, /** @type { string } */propName) => {

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
              const putEntry = options.passport.cache.putMap.get(relationshipUid)

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

      if (options.passport.cache.putMap.size) { // convert from map to object for do storage
        options.passport.cache.putMap.forEach((/** @type { string } */v, /** @type { string } */ k) => {
          if (!options.passport.cache.deleteSet.has(k)) putObj[k] = v // ensure this put is not being deleted
        })

        options.passport.cache.storage.put(putObj)
      }

      if (newUidsMap.size) newUidsMap.forEach((/** @type { string } */ v, /** @type { string } */ k) => newUids[k] = v) // convert from map to object for response

      response.now.$ace = { newUids, deletedKeys }

      return /** @type { td.AceFnResponse } */ (response.now)
    }
  } catch (e) {
    console.log('error', e)
    throw e
  }
}
