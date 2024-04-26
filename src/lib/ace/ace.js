import { td, enums } from '#ace'
import { put } from './storage.js'
import { aceFetch } from '../aceFetch.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { queryNode, queryRelationship } from './query/query.js'
import { getAlgorithmOptions } from '../security/getAlgorithmOptions.js'
import { setSchemaDataStructures, stamp } from '../objects/AcePassport.js'
import { getSortIndexKey, getRelationshipProp, getRevokesKey } from '../variables.js'
import { dataDeleteNodeProps, dataDeleteRelationshipProps, deleteNodesByUids, deleteRelationshipsBy_Uids, inupNode, inupRelationship, addToSchema, schemaAndDataDeleteNodes } from './mutate.js'


/**
 * Chat w/ Ace Graph Database
 * @param { td.AceFnFetchOptions } options
 * @returns { Promise<td.AceFnResponse> }
 */
export async function ace ({ host, request, privateJWKs, publicJWKs }) {
  return await aceFetch({ host, body: { request, privateJWKs, publicJWKs } })
}


/**
 * Chat w/ Ace Graph Database
 * @param { td.AceFnOptions } options
 * @returns { Promise<td.AceFnResponse> }
*/
export async function _ace ({ passport, request, publicJWKs, privateJWKs }) {
  try {
    await stamp(passport)

    const sortIndexMap = /** @type { td.AceFnSortIndexMap } */ (new Map())
    const $ace = /** @type { td.AceFn$ } */ ({ newUids: {}, deletedKeys: [] })
    const updateRequestItems = /** @type { td.AceFnUpdateRequestItems } */ ({ nodes: null, relationships: null })
    const cryptoJWKs = /** @type { { public: td.AceFnCryptoJWKs, private: td.AceFnCryptoJWKs } } */ ({ private: {}, public: {} })

    /** @type { (td.AceQueryRequestItem | td.AceMutateRequestItem)[] } Request as an array */
    const arrayRequest = Array.isArray(request) ? request : [ request ]

    /** @type { td.AceFnFullResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.x` will be in now. */
    const response = { now: {}, original: {} }

    await setPrivateJWKs()
    await setPublicJWKs()
    await preDeligate()
    await deligate()
    throwIfMissingMustProps()
    await addSortIndicesToGraph()
    return conclude()


    async function setPrivateJWKs () {
      if (privateJWKs) {
        for (const name in privateJWKs) {
          cryptoJWKs.private[name] = await crypto.subtle.importKey('jwk', JSON.parse(privateJWKs[name]), getAlgorithmOptions('import'), true, ['sign'])
        }
      }
    }


    async function setPublicJWKs () {
      if (publicJWKs) {
        for (const name in publicJWKs) {
          cryptoJWKs.public[name] = await crypto.subtle.importKey('jwk', JSON.parse(publicJWKs[name]), getAlgorithmOptions('import'), true, ['verify'])
        }
      }
    }


    async function deligate () {
      for (let iRequest = 0; iRequest < arrayRequest.length; iRequest++) {
        switch (arrayRequest[iRequest].id) {
          case enums.idsAce.Empty:
            await empty(/** @type { td.AceMutateRequestItemEmpty } */(arrayRequest[iRequest]))
            await preDeligateMiddleware(iRequest)
            break


          case enums.idsAce.InstallPlugin:
            const ipReq = /** @type { td.AceMutateRequestItemInstallPlugin } */ (arrayRequest[iRequest])

            const ipOptions = /** @type { td.AceFnOptions } */ ({
              passport: passport,
              request: ipReq.x.install.request,
              publicJWKs: ipReq.x.install.publicJWKs,
              privateJWKs: ipReq.x.install.privateJWKs,
            })

            const ipRes = await _ace(ipOptions)
            if (ipReq.prop) response.now[ipReq.prop] = ipRes
            await preDeligateMiddleware(iRequest)
            break


          case enums.idsAce.UninstallPlugin:
            const upReq = /** @type { td.AceMutateRequestItemUninstallPlugin } */ (arrayRequest[iRequest])
            const responseUninstall = await _ace({ passport: passport, request: upReq.x.request })
            if (upReq.prop) response.now[upReq.prop] = responseUninstall
            await preDeligateMiddleware(iRequest)
            break


          case enums.idsAce.QueryByNode:
            await queryNode(/** @type { td.AceQueryRequestItemNode } */(arrayRequest[iRequest]), passport, response, cryptoJWKs.public, iRequest)
            break


          case enums.idsAce.QueryByRelationship:
            await queryRelationship(/** @type { td.AceQueryRequestItemRelationship } */(arrayRequest[iRequest]), passport, response, cryptoJWKs.public, iRequest)
            break


          case enums.idsAce.GetSchema:
            await schemaGet(/** @type { td.AceQueryRequestItemGetSchema } */(arrayRequest[iRequest]))
            break


          case enums.idsAce.AddToSchema:
            const atsReq = /** @type { td.AceMutateRequestItemAddToSchema } */ (arrayRequest[iRequest])
            const atsRes = addToSchema(passport, atsReq.x.schema)
            if (atsReq.prop) response.now[atsReq.prop] = atsRes
            setSchemaDataStructures(passport)
            break


          case enums.idsAce.GetBackup:
            await getBackup(/** @type { td.AceQueryRequestItemGetBackup } */(arrayRequest[iRequest]))
            break


          case enums.idsAce.LoadBackup:
            await fileToGraph(/** @type { td.AceMutateRequestItemLoadBackup } */(arrayRequest[iRequest]))
            await preDeligateMiddleware(iRequest)
            break


          case enums.idsAce.AddNodeToGraph:
          case enums.idsAce.UpdateGraphNode:
            await inupNode(/** @type { td.AceMutateRequestItemAddNodeToGraph | td.AceMutateRequestItemUpdateGraphNode } */(arrayRequest[iRequest]), passport, sortIndexMap, updateRequestItems, cryptoJWKs.private)
            break


          case enums.idsAce.AddRelationshipToGraph:
          case enums.idsAce.UpdateGraphRelationship:
            await inupRelationship(/** @type { td.AceMutateRequestItemAddRelationshipToGraph | td.AceMutateRequestItemUpdateGraphRelationship } */(arrayRequest[iRequest]), passport, updateRequestItems)
            break


          case enums.idsAce.DataDeleteNodes:
            const ddnReq = /** @type { td.AceMutateRequestItemDataDeleteNodes } */ (arrayRequest[iRequest])
            if (ddnReq.x?.uids?.length) await deleteNodesByUids(ddnReq.x.uids, passport)
            break


          case enums.idsAce.DataDeleteRelationships:
            const ddrReq = /** @type { td.AceMutateRequestItemDataDeleteRelationships } */ (arrayRequest[iRequest])
            if (ddrReq.x?._uids?.length) await deleteRelationshipsBy_Uids(ddrReq.x._uids, passport)
            break


          case enums.idsAce.DataDeleteNodeProps:
            const ddnpReq = /** @type { td.AceMutateRequestItemDataDeleteNodeProps } */ (arrayRequest[iRequest])
            if (ddnpReq.x?.uids?.length && ddnpReq.x?.props?.length) await dataDeleteNodeProps(ddnpReq, passport)
            break


          case enums.idsAce.DataDeleteRelationshipProps:
            const ddrpReq = /** @type { td.AceMutateRequestItemDataDeleteRelationshipProps } */ (arrayRequest[iRequest])
            if (ddrpReq.x?._uids?.length && ddrpReq.x?.props?.length) await dataDeleteRelationshipProps(ddrpReq, passport)
            break


          case enums.idsAce.SchemaAndDataDeleteNodes:
            await schemaAndDataDeleteNodes(/** @type { td.AceMutateRequestItemSchemaAndDataDeleteNodes } */(arrayRequest[iRequest]), passport)
            break
        }
      }


      /**
       * @param { td.AceMutateRequestItemEmpty } requestItem
       * @returns { Promise<void> }
       */
      async function empty (requestItem) {
        throwIfAnyGenericRevokes()
        passport.storage.deleteAll() // empty storage

        // empty passport schema
        passport.schema = undefined
        passport.schemaDataStructures = {}
        
        if (requestItem.prop) response.now[requestItem.prop] = { success: true }
      }


      /** @param { td.AceQueryRequestItemGetBackup } requestItem */
      async function getBackup (requestItem) {
        passport.revokesAcePermissions?.forEach((/** @type { td.AceGraphPermission } */ value) => {
          if (value.action === 'read' && value.schema === true) throw AceAuthError(enums.permissionActions.read, passport, { schema: true })
          if (value.action === 'read' && value.node) throw AceAuthError(enums.permissionActions.read, passport, { node: value.node })
          if (value.action === 'read' && value.relationship) throw AceAuthError(enums.permissionActions.read, passport, { relationship: value.relationship })
        })

        /** @type { td.AceBackupResponse } - We'll turn the map into this object */
        const rList = {}
        const listMap = await passport.storage.list()

        listMap.forEach((value, key) => { // skip if in deletedKeys
          if (!passport.$aceDataStructures.deletedKeys.has(key)) rList[key] = value
        })

        response.now[requestItem.prop] = rList
      }


      /** @param { td.AceMutateRequestItemLoadBackup } requestItem */
      async function fileToGraph (requestItem) {
        if (typeof requestItem?.x?.backup !== 'string') throw AceError('mutate__invalid-backup', 'This request fails b/c requestItemXBackup is not a string', { requestItemXBackup: requestItem?.x?.backup })

        throwIfAnyGenericRevokes()
        passport.storage.deleteAll()
        passport.storage.put(JSON.parse(requestItem.x.backup))
      }


      function throwIfAnyGenericRevokes () {
        passport.revokesAcePermissions?.forEach((/** @type { td.AceGraphPermission } */ value) => {
          if (value.action === enums.permissionActions.inup || value.action === enums.permissionActions.insert || value.action === enums.permissionActions.update || value.action === enums.permissionActions.delete) {
            if (value.schema === true) throw AceAuthError(value.action, passport, { schema: true })
            if (value.node) throw AceAuthError(value.action, passport, { node: value.node })
            if (value.relationship) throw AceAuthError(value.action, passport, { relationship: value.relationship })
          }
        })
      }
    }


    async function preDeligate () {
      /** @type { { node: string[], relationship: string[] } } - We will convert uids to graph nodes to help with updating */
      const updateUids = { node: [], relationship: [] }

      if (arrayRequest) {
        for (let i = 0; i < arrayRequest.length; i++) {
          if (arrayRequest[i].id === enums.idsAce.UpdateGraphNode) {
            const mutateRequestItemUpdateGraphNode = /** @type { td.AceMutateRequestItemUpdateGraphNode } */(arrayRequest[i])
            updateUids.node.push(mutateRequestItemUpdateGraphNode.x.uid)
          }

          if (arrayRequest[i].id === enums.idsAce.UpdateGraphRelationship) {
            updateUids.relationship.push(/** @type { td.AceMutateRequestItemUpdateGraphRelationship } */(arrayRequest[i]).x._uid)
          }
        }
      }

      updateRequestItems.nodes = (!updateUids.node.length) ? [] : await passport.storage.get(updateUids.node)
      updateRequestItems.relationships = (!updateUids.relationship.length) ? [] : await passport.storage.get(updateUids.relationship)
    }


    /**
     * @param { number } iRequest 
     */
    async function preDeligateMiddleware (iRequest) {
      if (iRequest + 1 !== arrayRequest.length) await preDeligate()
    }


    /**
     * @param { td.AceQueryRequestItemGetSchema } requstItem 
     */
    function schemaGet (requstItem) {
      if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'read', schema: true }))) throw AceAuthError(enums.permissionActions.read, passport, { schema: true })
      response.now[requstItem.prop] = passport.schema
    }


    async function addSortIndicesToGraph () {
      if (sortIndexMap.size) {
        for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
          const nodes = [ ...(await passport.storage.get(uids)).values() ]
            .sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

          put(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid), passport)
        }
      }
    }


    function throwIfMissingMustProps () {
      if (passport.$aceDataStructures.putMap.size) {
        for (const requestItem of passport.$aceDataStructures.putMap.values()) {
          const x = /** @type { td.AceMutateRequestItemAddRelationshipToGraphX } */ (/** @type {*} */ (requestItem.x))
          const mustProps = requestItem.subId ? passport.schemaDataStructures?.mustPropsMap?.get(requestItem.subId) : null // the must props for a specific node or relationship

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

                  if (!x[getRelationshipProp(bidirectionalRelationshipProp.x.relationship)]?.length) {
                    throw AceError('mutate__missing-must-defined-relationship', 'Please ensure relationships that must be defined, are defined.', { requiredPropName: propName, bidirectionalRelationshipProp, requestItem })
                  }
                  break
              }
            })
          }
        }


        /**
         * @param { td.AceMutateRequestItemAddRelationshipToGraph } rSchemaRelationshipProp 
         * @param { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp } schemaRelationshipProp 
         * @param { string } propName 
         */
        function validateNotBidirectionalMustProps (rSchemaRelationshipProp, schemaRelationshipProp, propName) {
          let isValid = false
          const storageUids = []
          const relationshipNodes = []
          const isInverse = schemaRelationshipProp.id === 'ReverseRelationshipProp'
          const x = /** @type { td.AceMutateRequestItemAddRelationshipToGraphX } */ (rSchemaRelationshipProp.x)
          const relationshipUids = x[getRelationshipProp(schemaRelationshipProp.x.relationship)]

          if (relationshipUids) {
            for (const relationshipUid of relationshipUids) {
              const putEntry = passport.$aceDataStructures.putMap.get(relationshipUid)

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

          if (!isValid) throw AceError('mutate__missing-must-defined-relationship', `${ propName } is invalid because it is missing relationship props that must be defined, please ensure relationships that must be defined, are defined.`, { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp })
        }
      }
    }


    /** @returns { td.AceFnResponse } */
    function conclude () {
      if (passport.$aceDataStructures.deletedKeys.size) passport.$aceDataStructures.deletedKeys.forEach(uid => $ace.deletedKeys.push(uid))
      if (passport.$aceDataStructures.newUids.size) passport.$aceDataStructures.newUids.forEach((value, key) => $ace.newUids[key] = value)

      response.now.$ace = $ace
      return /** @type { td.AceFnResponse } */ (response.now)
    }
  } catch (e) {
    console.log('error', e)
    throw e
  }
}
