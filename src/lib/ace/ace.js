import { td, enums } from '#ace'
import { put } from './storage.js'
import { aceFetch } from './aceFetch.js'
import { stamp } from '../objects/AcePassport.js'
import { getBackup, loadBackup } from './backup.js'
import { installPlugin, uninstallPlugin } from './plugin.js'
import { importGenerateAlgorithm } from '../security/util.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { queryNode, queryRelationship } from './query/query.js'
import { inupNode, inupRelationship, empty } from './mutate.js'
import { getSortIndexKey, getRelationshipProp, getRevokesKey } from '../variables.js'
import { deleteRelationshipsBy_Uids, relationshipPropDeleteData } from './mutateRelationship.js'
import { deleteNodesByUids, nodeDeleteDataAndDeleteFromSchema, nodePropDeleteData, nodePropDeleteDataAndDeleteFromSchema } from './mutateNode.js'
import { addToSchema, schemaUpdateNodeName, schemaUpdateNodePropName, schemaUpdateRelationshipName, schemaUpdateRelationshipPropName } from './mutateSchema.js'


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
    const cryptoJWKs = /** @type { { public: td.AceFnCryptoJWKs, private: td.AceFnCryptoJWKs } } */ ({ private: {}, public: {} })

    /** @type { (td.AceQueryRequestItem | td.AceMutateRequestItem)[] } Request as an array */
    const req = Array.isArray(request) ? request : [ request ]

    /** @type { td.AceFnFullResponse } - Nodes with all properties will be in original, nodes with requested properties from `query.x` will be in now. */
    const res = { now: {}, original: {} }

    await setPrivateJWKs(cryptoJWKs, privateJWKs)
    await setPublicJWKs(cryptoJWKs, publicJWKs)
    await deligate(req, res, passport, sortIndexMap, cryptoJWKs)
    throwIfMissingMustProps(passport)
    await addSortIndicesToGraph(passport, sortIndexMap)
    return conclude($ace, res, passport)
  } catch (e) {
    console.log('error', e)
    throw e
  }
}


/**
 * @param { { public: td.AceFnCryptoJWKs, private: td.AceFnCryptoJWKs } } cryptoJWKs 
 * @param { td.AceFnStringJWKs } [ privateJWKs  ]
 * @returns { Promise<void> }
 */
async function setPrivateJWKs (cryptoJWKs, privateJWKs) {
  if (privateJWKs) {
    for (const name in privateJWKs) {
      cryptoJWKs.private[name] = await crypto.subtle.importKey('jwk', JSON.parse(privateJWKs[name]), importGenerateAlgorithm, true, ['sign'])
    }
  }
}


/**
 * @param { { public: td.AceFnCryptoJWKs, private: td.AceFnCryptoJWKs } } cryptoJWKs 
 * @param { td.AceFnStringJWKs } [ publicJWKs  ]
 * @returns { Promise<void> }
 */
async function setPublicJWKs (cryptoJWKs, publicJWKs) {
  if (publicJWKs) {
    for (const name in publicJWKs) {
      cryptoJWKs.public[name] = await crypto.subtle.importKey('jwk', JSON.parse(publicJWKs[name]), importGenerateAlgorithm, true, ['verify'])
    }
  }
}


/**
 * @param { (td.AceQueryRequestItem | td.AceMutateRequestItem)[] } req 
 * @param { td.AceFnFullResponse } res
 * @param { td.AcePassport } passport
 * @param { td.AceFnSortIndexMap } sortIndexMap
 * @param { { public: td.AceFnCryptoJWKs, private: td.AceFnCryptoJWKs } } cryptoJWKs 
 */
async function deligate (req, res, passport, sortIndexMap, cryptoJWKs) {
  for (let iReq = 0; iReq < req.length; iReq++) {
    switch (req[iReq].id) {
      case enums.idsAce.Empty:
        await empty(passport, res, /** @type { td.AceMutateRequestItemEmpty } */(req[iReq]))
        break


      case enums.idsAce.PluginInstall:
        await installPlugin(passport, res, /** @type { td.AceMutateRequestItemPluginInstall } */(req[iReq]))
        break


      case enums.idsAce.PluginUninstall:
        await uninstallPlugin(passport, res, /** @type { td.AceMutateRequestItemPluginUninstall } */(req[iReq]))
        break


      case enums.idsAce.NodeQuery:
        await queryNode(passport, res, cryptoJWKs.public, iReq, /** @type { td.AceQueryRequestItemNode } */(req[iReq]))
        break


      case enums.idsAce.RelationshipQuery:
        await queryRelationship(passport, res, cryptoJWKs.public, iReq, /** @type { td.AceQueryRequestItemRelationship } */(req[iReq]))
        break


      case enums.idsAce.SchemaGet:
        await getSchema(passport, res, /** @type { td.AceQueryRequestItemSchemaGet } */(req[iReq]))
        break


      case enums.idsAce.SchemaAdd:
        addToSchema(passport, res, /** @type { td.AceMutateRequestItemSchemaAdd } */(req[iReq]))
        break


      case enums.idsAce.BackupGet:
        await getBackup(passport, res, /** @type { td.AceQueryRequestItemBackupGet } */(req[iReq]))
        break


      case enums.idsAce.BackupLoad:
        await loadBackup(passport, /** @type { td.AceMutateRequestItemBackupLoad } */(req[iReq]))
        break


      case enums.idsAce.NodeInsert:
      case enums.idsAce.NodeUpdate:
      case enums.idsAce.NodeUpsert:
        await inupNode(passport, sortIndexMap, cryptoJWKs.private, /** @type { td.AceMutateRequestItemNodeInsert | td.AceMutateRequestItemNodeUpdate } */(req[iReq]))
        break


      case enums.idsAce.RelationshipInsert:
      case enums.idsAce.RelationshipUpdate:
      case enums.idsAce.RelationshipUpsert:
        await inupRelationship(passport, /** @type { td.AceMutateRequestItemRelationshipInsert | td.AceMutateRequestItemRelationshipUpdate } */(req[iReq]))
        break


      case enums.idsAce.NodeDeleteData:
        await deleteNodesByUids(passport, /** @type { td.AceMutateRequestItemNodeDeleteData } */(req[iReq]).x.uids)
        break


      case enums.idsAce.RelationshipDeleteData:
        await deleteRelationshipsBy_Uids(passport, /** @type { td.AceMutateRequestItemRelationshipDeleteData } */(req[iReq]).x._uids)
        break


      case enums.idsAce.NodePropDeleteData:
        await nodePropDeleteData(passport, /** @type { td.AceMutateRequestItemNodePropDeleteData } */(req[iReq]))
        break


      case enums.idsAce.RelationshipPropDeleteData:
        await relationshipPropDeleteData(passport, /** @type { td.AceMutateRequestItemRelationshipPropDeleteData } */(req[iReq]))
        break


      case enums.idsAce.NodeDeleteDataAndDeleteFromSchema:
        await nodeDeleteDataAndDeleteFromSchema(passport, /** @type { td.AceMutateRequestItemNodeDeleteDataAndDeleteFromSchema } */(req[iReq]))
        break


      case enums.idsAce.NodePropDeleteDataAndDeleteFromSchema:
        await nodePropDeleteDataAndDeleteFromSchema(passport, /** @type { td.AceMutateRequestItemNodePropDeleteDataAndDeleteFromSchema } */(req[iReq]))
        break


      case enums.idsAce.SchemaUpdateNodeName:
        await schemaUpdateNodeName(passport, /** @type { td.AceMutateRequestItemSchemaUpdateNodeName } */(req[iReq]))
        break


      case enums.idsAce.SchemaUpdateNodePropName:
        await schemaUpdateNodePropName(passport, /** @type { td.AceMutateRequestItemSchemaUpdateNodePropName } */(req[iReq]))
        break


      case enums.idsAce.SchemaUpdateRelationshipName:
        await schemaUpdateRelationshipName(passport, /** @type { td.AceMutateRequestItemSchemaUpdateRelationshipName } */(req[iReq]))
        break


      case enums.idsAce.SchemaUpdateRelationshipPropName:
        await schemaUpdateRelationshipPropName(passport, /** @type { td.AceMutateRequestItemSchemaUpdateRelationshipPropName } */(req[iReq]))
        break
    }
  }
}


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AceQueryRequestItemSchemaGet } reqItem 
 * @returns { void }
 */
function getSchema (passport, res, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'read', schema: true }))) throw AceAuthError(enums.permissionActions.read, passport, { schema: true })
  res.now[reqItem.prop] = passport.schema
}


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceFnSortIndexMap } sortIndexMap 
 * @returns { Promise<void> }
 */
async function addSortIndicesToGraph (passport, sortIndexMap) {
  if (sortIndexMap.size) {
    for (const { nodeName, nodePropName, uids } of sortIndexMap.values()) {
      const nodes = [ ...(await passport.storage.get(uids)).values() ]
        .sort((a, b) => Number(a[nodePropName] > b[nodePropName]) - Number(a[nodePropName] < b[nodePropName])) // order ascending

      put(getSortIndexKey(nodeName, nodePropName), nodes.map(n => n.uid), passport)
    }
  }
}


/**
 * @param { td.AcePassport } passport 
 * @returns { void } 
 */
function throwIfMissingMustProps (passport) {
  if (passport.$aceDataStructures.putMap.size) {
    for (const [ uid, reqItem ] of passport.$aceDataStructures.putMap) {
      const x = /** @type { td.AceMutateRequestItemRelationshipInsertX } */ (/** @type {*} */ (reqItem.x))
      const lowerName = reqItem.node ? 'node' : 'relationship'
      const mustProps = passport.schemaDataStructures?.mustPropsMap?.get(reqItem[lowerName]) // the must props for a specific node or relationship

      if (mustProps) {
        mustProps.forEach((/** @type { td.AceSchemaProp | td.AceSchemaRelationshipProp | td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ prop, /** @type { string } */propName) => {

          switch (prop.id) {
            case enums.idsSchema.Prop:
            case enums.idsSchema.RelationshipProp:
              const schemaProp = /** @type { td.AceSchemaProp } */ (prop)

              switch (schemaProp.x.dataType) {
                case 'isoString':
                  if (typeof x?.[propName] !== 'string') throw getMustPropsEror(lowerName, reqItem, propName, schemaProp)
                  break
                default:
                  if (typeof x?.[propName] !== schemaProp.x.dataType) throw getMustPropsEror(lowerName, reqItem, propName, schemaProp)
                  break
              }
              break
            case enums.idsSchema.ForwardRelationshipProp:
            case enums.idsSchema.ReverseRelationshipProp:
              validateNotBidirectionalMustProps(reqItem, prop, propName, passport)
              break
            case enums.idsSchema.BidirectionalRelationshipProp:
              const bidirectionalRelationshipProp = /** @type { td.AceSchemaBidirectionalRelationshipProp } */ (prop)

              if (!x[getRelationshipProp(bidirectionalRelationshipProp.x.relationship)]?.length) {
                throw AceError('aceFn__missingMustRelationshipProps', 'Please ensure relationships that must be defined, are defined.', { requiredPropName: propName, bidirectionalRelationshipProp, reqItem })
              }
              break
          }
        })
      }
    }
  }
}


/**
 * @param { td.AceMutateRequestItemRelationshipInsert } rSchemaRelationshipProp 
 * @param { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp } schemaRelationshipProp 
 * @param { string } propName 
 * @param { td.AcePassport } passport 
 * @returns { void } 
 */
function validateNotBidirectionalMustProps (rSchemaRelationshipProp, schemaRelationshipProp, propName, passport) {
  let isValid = false
  const storageUids = []
  const relationshipNodes = []
  const isInverse = schemaRelationshipProp.id === 'ReverseRelationshipProp'
  const x = /** @type { td.AceMutateRequestItemRelationshipInsertX } */ (rSchemaRelationshipProp.x)
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

  if (!isValid) throw AceError('aceFn__missingMustDefinedRelationship', `${ propName } is invalid because it is missing relationship props that must be defined, please ensure relationships that must be defined, are defined.`, { requiredPropName: propName, schemaRelationshipProp, rSchemaRelationshipProp })
}


/**
 * @param { 'node' | 'relationship' } lowerName 
 * @param { any } reqItem 
 * @param { string } propName 
 * @param { td.AceSchemaProp } schemaProp 
 * @returns { td.AceError }
 */
function getMustPropsEror (lowerName, reqItem, propName, schemaProp) {
  return AceError('aceFn__invalidPropValue', `Please ensure your reqItem has all required props and each prop aligns with the data type in the schema, an example of where this is not happening yet is: ${ lowerName }: "${ reqItem[lowerName] }", prop: "${ propName }", data type: "${ schemaProp.x.dataType }"`, { [lowerName]: reqItem[lowerName], reqItem, propName, dataType: schemaProp.x.dataType })
}


/**
 * @param { td.AceFn$ } $ace 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AcePassport } passport 
 * @returns { td.AceFnResponse }
 */
function conclude ($ace, res, passport) {
  if (passport.$aceDataStructures.deletedKeys.size) passport.$aceDataStructures.deletedKeys.forEach(uid => $ace.deletedKeys.push(uid))
  if (passport.$aceDataStructures.newUids.size) passport.$aceDataStructures.newUids.forEach((value, key) => $ace.newUids[key] = value)

  res.now.$ace = $ace
  return /** @type { td.AceFnResponse } */ (res.now)
}
