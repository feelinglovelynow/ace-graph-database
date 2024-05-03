import { enums, td } from '#ace'
import { del, put } from './storage.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { schemaDeleteConclude, schemaDeleteNodes } from './mutateSchema.js'
import { validateUpdateOrDeletePermissions } from './validateUpdateOrDeletePermissions.js'
import { deleteUidFromRelationshipProp, delete_UidFromRelationshipIndex } from './mutateRelationship.js'
import { RELATIONSHIP_PREFIX, getNodeNamePlusRelationshipNameToNodePropNameMapKey, getNodeUidsKey, getRelationshipNameFromProp, getRevokesKey } from '../variables.js'


/**
 * @param { td.AcePassport } passport
 * @param { string[] } uids
 */
export async function deleteNodesByUids (passport, uids) {
  if (!Array.isArray(uids) || !uids.length) throw AceError('aceFn__deleteNodesByUids__invalidUids', 'The request fails b/c uids must be an array of string uids', { uids })

  const graphNodes = await passport.storage.get(uids)

  for (const graphNode of graphNodes.values()) {
    validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, relationship: graphNode.relationship }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, relationship: graphNode.relationship, prop: '*' })))

    const relationshipUidsArray = []

    /** @type { Map<string, { propName: string, relationshipName: string, cascade: boolean }> } <relationshipUid, { propName, relationshipName }> */
    const relationshipUidsMap = new Map()

    for (const propName in graphNode) {
      if (propName.startsWith(RELATIONSHIP_PREFIX)) {
        const relationshipName = getRelationshipNameFromProp(propName)
        const schemaPropName = passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap?.get(getNodeNamePlusRelationshipNameToNodePropNameMapKey(graphNode.node, relationshipName))

        if (schemaPropName) validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop: schemaPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop: schemaPropName })))

        const cascade = schemaPropName ? (passport.schemaDataStructures?.cascade?.get(graphNode.node)?.has(schemaPropName) || false) : false

        for (const relationshipUid of graphNode[propName]) {
          relationshipUidsArray.push(relationshipUid)
          relationshipUidsMap.set(relationshipUid, { propName, relationshipName, cascade })
        }
      } else if (propName !== 'uid') {
        validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop: propName })))
      }
    }

    const nodeUidsKey = getNodeUidsKey(graphNode.node)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (Array.isArray(nodeUids)) {
      for (let i = nodeUids.length - 1; i >= 0; i--) {
        if (nodeUids[i] === graphNode.x.uid) {
          nodeUids.splice(i, 1)
          break
        }
      }
    }
    
    put(nodeUidsKey, nodeUids, passport) // delete uid from $index___nodes___

    /** @type { Map<string, string> } <relationshipNodeUid, relationshipId> */
    const relationshipNodeUids = new Map()
    const graphRelationshipsMap = await passport.storage.get(relationshipUidsArray)

    for (const graphRelationship of graphRelationshipsMap.values()) {
      if (graphRelationship.x.a === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.b, graphRelationship.x._uid)
      if (graphRelationship.x.b === graphNode.x.uid) relationshipNodeUids.set(graphRelationship.x.a, graphRelationship.x._uid)
    }

    const cascadeUids = []
    const graphRelationshipNodesMap = await passport.storage.get([...relationshipNodeUids.keys()])

    for (const graphRelationshipNode of graphRelationshipNodesMap.values()) {
      const _uid = relationshipNodeUids.get(graphRelationshipNode.x.uid)

      if (_uid) {
        const v = relationshipUidsMap.get(_uid)

        if (v) {
          if (v.cascade) cascadeUids.push(graphRelationshipNode.x.uid)
          else if (v.propName) deleteUidFromRelationshipProp(v.propName, _uid, passport, graphRelationshipNode)
        }
      }
    }

    del(graphNode.x.uid, passport)

    for (const _uid of relationshipUidsArray) {
      del(_uid, passport)
      const v = relationshipUidsMap.get(_uid)
      if (v?.relationshipName) await delete_UidFromRelationshipIndex(v.relationshipName, _uid, passport)
    }

    if (cascadeUids.length) await deleteNodesByUids(passport, cascadeUids) // delete uids that are cascade
  }
}


/**
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemNodePropDeleteData } reqItem
 */
export async function nodePropDeleteData (passport, reqItem) {
  if (!Array.isArray(reqItem?.x?.uids) || !reqItem.x.uids.length) throw AceError('aceFn__nodePropDeleteData__invalidUids', 'The request fails b/c reqItem.x.uids must be an array of string uids', { reqItem })
  if (!Array.isArray(reqItem?.x?.props) || !reqItem.x.props.length) throw AceError('aceFn__nodePropDeleteData__invalidProps', 'The request fails b/c reqItem.x.props must be an array of string props', { reqItem })

  const graphNodes = await passport.storage.get(reqItem.x.uids)

  for (const [ uid, graphNode ] of graphNodes) {
    for (const propName of reqItem.x.props) {
      if (typeof graphNode.x[propName] !== 'undefined') {
        if (!passport.schema?.nodes[graphNode.node]?.[propName]) throw AceError('aceFn__nodePropDeleteData__invalidNodePropCombo', 'The node and the prop cannot be deleted b/c they are not defined in your schema', { node: graphNode.node, prop: propName })

        validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop: propName })))
        delete graphNode.x[propName]
        put(uid, graphNode, passport)
      }
    }
  }
}


/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemNodeDeleteDataAndDeleteFromSchema } reqItem
 */
export async function nodeDeleteDataAndDeleteFromSchema (passport, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const requestNodeName of reqItem.x.nodes) {
    const nodeUidsKey = getNodeUidsKey(requestNodeName)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids?.length) {
      await deleteNodesByUids(passport, nodeUids)
      del(nodeUidsKey, passport)
    }

    schemaDeleteNodes(requestNodeName, passport)
    delete passport.schema?.nodes[requestNodeName]
  }

  schemaDeleteConclude(passport)
}

/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemNodePropDeleteDataAndDeleteFromSchema } reqItem
 */
export async function nodePropDeleteDataAndDeleteFromSchema (passport, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { node, prop } of reqItem.x.props) {
    if (!passport.schema?.nodes[node]?.[prop]) throw AceError('nodePropDeleteDataAndDeleteFromSchema__invalidNodePropCombo', 'The node and the prop cannot be deleted b/c they are are not defined in your schema', { node, prop })

    const nodeUidsKey = getNodeUidsKey(node)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids.length) {
      const graphNodes = await passport.storage.get(nodeUids)

      for (const [ uid, graphNode ] of graphNodes) {
        if (typeof graphNode.x[prop] !== 'undefined') {
          validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphNode, passport, { node: graphNode.node, prop }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: graphNode.node, prop })))
          delete graphNode.x[prop]
          put(uid, graphNode, passport)
        }
      }
    }

    delete passport.schema.nodes[node][prop]
    schemaDeleteConclude(passport)
  }
}
