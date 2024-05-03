import { enums, td } from '#ace'
import { del, put } from './storage.js'
import { validateSchema } from './validateSchema.js'
import { AceAuthError, AceError } from '../objects/AceError.js'
import { setSchemaDataStructures } from '../objects/AcePassport.js'
import { DELIMITER, SCHEMA_KEY, getNodeUidsKey, getRelationshipProp, getRelationshipUidsKey, getRevokesKey } from '../variables.js'


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AceMutateRequestItemSchemaAdd } reqItem 
 * @returns { void }
 */
export function addToSchema (passport, res, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  /** @type { td.AceSchema } Deep copy current schema, only assign passport.schema to _schema if _schema passes vaidation */
  let _schema = passport.schema ? JSON.parse(JSON.stringify(passport.schema)) : {}

  // add nodes to schema
  if (reqItem.x.schema.nodes) {
    for (const node in reqItem.x.schema.nodes) {
      if (!_schema) _schema = { nodes: { [node]: reqItem.x.schema.nodes[node] }, relationships: {} }
      else if (!_schema.nodes) _schema.nodes = { [node]: reqItem.x.schema.nodes[node] }
      else if (_schema.nodes[node]) _schema.nodes[node] = { ..._schema.nodes[node], ...reqItem.x.schema.nodes[node] }
      else _schema.nodes[node] = reqItem.x.schema.nodes[node]
    }
  }

  // add relationships to schema
  if (reqItem.x.schema.relationships) {
    for (const relationship in reqItem.x.schema.relationships) {
      if (!_schema) _schema = { nodes: {}, relationships: { [relationship]: reqItem.x.schema.relationships[relationship] } }
      else if (!_schema.relationships) _schema.relationships = { [relationship]: reqItem.x.schema.relationships[relationship] }
      else if (_schema.relationships[relationship]) _schema.relationships[relationship] = { ..._schema.relationships[relationship], ...reqItem.x.schema.relationships[relationship] }
      else _schema.relationships[relationship] = reqItem.x.schema.relationships[relationship]
    }
  }

  put(SCHEMA_KEY, validateSchema(_schema), passport)
  passport.schema = _schema
  setSchemaDataStructures(passport)
  if (reqItem.prop) res.now[reqItem.prop] = passport.schema
}


/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemSchemaUpdateNodeName } reqItem
 */
export async function schemaUpdateNodeName (passport, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { nowName, newName } of reqItem.x.nodes) {
    if (!passport.schema?.nodes[nowName]) throw AceError('schemaUpdateNodeName__invalidNowName', 'The node cannot be renamed b/c it is not defined in your schema', { nowName, newName })

    // update node on each graphNode
    const nodeUidsKey = getNodeUidsKey(nowName)
    const nodeUids = await passport.storage.get(nodeUidsKey)

    if (nodeUids.length) {
      const graphNodes = await passport.storage.get(nodeUids)

      for (const [ uid, graphNode ] of graphNodes) {
        graphNode.node = newName
        put(uid, graphNode, passport)
      }
    }


    // update nodeUidsKey
    const newNodeUidsKey = getNodeUidsKey(newName)
    put(newNodeUidsKey, nodeUids, passport)
    del(nodeUidsKey, passport)


    // update schema
    const nodeRelationshipPropsSet = passport.schemaDataStructures?.nodeRelationshipPropsMap?.get(nowName)

    if (nodeRelationshipPropsSet) {
      for (const pointer of nodeRelationshipPropsSet) {
        const split = pointer.split(DELIMITER)

        if (split.length !== 2) throw AceError('schemaUpdateNodeName__invalidSplit', 'Split should have a length of 2, the first index should be a node name and the second should be a relationship prop name', { split })

        /** @type { * } */
        let x = passport.schema.nodes[split[0]][split[1]].x

        if (x.node !== nowName) throw AceError('schemaUpdateNodeName__invalidNode', 'The x.node should equal the nowName', { xDotNode: x.node, nowName })

        /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */
        x = x

        x.node = newName
        passport.schema.nodes[newName] = passport.schema.nodes[nowName]
        delete passport.schema.nodes[nowName]
      }
    }

    schemaDeleteConclude(passport)
  }
}


/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemSchemaUpdateNodePropName } reqItem
 */
export async function schemaUpdateNodePropName (passport, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { node, nowName, newName } of reqItem.x.props) {
    if (!passport.schema?.nodes[node]) throw AceError('schemaUpdateNodePropName__invalidNode', `The prop cannot be renamed b/c the node ${node} it is not defined in your schema`, { node, nowName, newName })
    if (!passport.schema?.nodes[node]?.[nowName]) throw AceError('schemaUpdateNodePropName__invalidProp', `The prop cannot be renamed b/c the node ${node} and the prop ${nowName} is not defined in your schema`, { node, nowName, newName })

    // update prop on each graphNode
    const nodeUids = await passport.storage.get(getNodeUidsKey(node))

    if (nodeUids.length) {
      const graphNodes = await passport.storage.get(nodeUids)

      for (const [uid, graphNode] of graphNodes) {
        if (typeof graphNode.x[nowName] !== 'undefined') {
          graphNode.x[newName] = graphNode.x[nowName]
          delete graphNode.x[nowName]
          put(uid, graphNode, passport)
        }
      }
    }

    // update schema
    passport.schema.nodes[node][newName] = passport.schema.nodes[node][nowName]
    delete passport.schema.nodes[node][nowName]
    schemaDeleteConclude(passport)
  }
}



/** 
 * @param { td.AceMutateRequestItemNodeDeleteDataAndDeleteFromSchemaNode } reqNodeName
 * @param { td.AcePassport } passport
 */

export function schemaDeleteNodes (reqNodeName, passport) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  if (passport.schema) {
    /** @type { Set<string> } - As we flow through nodes, the relationships that need to be deleted will be added here */
    const deleteRelationshipSet = new Set()

    /** @type { Map<string, { schemaNodeName: string, propName: string }> } - <schemaNodeName___propName, { schemaNodeName, propName }> */
    const deletePropsMap = new Map()

    for (const schemaNodeName in passport.schema.nodes) {
      for (const propName in passport.schema.nodes[schemaNodeName]) {
        const schemaPropX = /** @type { td.AceSchemaNodeRelationshipX } */ (passport.schema.nodes[schemaNodeName][propName].x)

        if (schemaPropX?.node === reqNodeName) {
          deleteRelationshipSet.add(schemaPropX.relationship)
          deletePropsMap.set(schemaNodeName + DELIMITER + propName, { schemaNodeName, propName })
        }
      }
    }

    for (const relationshipName of deleteRelationshipSet) {
      delete passport.schema.relationships[relationshipName]
    }

    for (const { schemaNodeName, propName } of deletePropsMap.values()) {
      delete passport.schema.nodes[schemaNodeName][propName]
    }
  }
}


/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemSchemaUpdateRelationshipName } reqItem
 */
export async function schemaUpdateRelationshipName (passport, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { nowName, newName } of reqItem.x.relationships) {
    if (!passport.schema?.relationships[nowName]) throw AceError('schemaUpdateRelationshipName__invalidNowName', 'The relationship cannot be renamed b/c it is not defined in your schema', { nowName, newName })

    // update relationship on each graphRelationship
    const relationshipUidsKey = getRelationshipUidsKey(nowName)
    const relationshipUids = await passport.storage.get(relationshipUidsKey)

    if (relationshipUids.length) {
      const graphNodeUids = [] // put a and b node uids here
      const graphRelationships = await passport.storage.get(relationshipUids)

      // update graphRelationship.relationship
      for (const [ uid, graphRelationship ] of graphRelationships) {
        graphRelationship.relationship = newName
        put(uid, graphRelationship, passport)
        graphNodeUids.push(graphRelationship.x.a)
        graphNodeUids.push(graphRelationship.x.b)
      }

      const graphNodes = await passport.storage.get(graphNodeUids)
      const nowRelationshipProp = getRelationshipProp(nowName)
      const newRelationshipProp = getRelationshipProp(newName)

      // update graphNode.$r__[ nowName ]
      for (const [ uid, graphNode ] of graphNodes) {
        if (graphNode[nowRelationshipProp]) {
          graphNode[newRelationshipProp] = graphNode[nowRelationshipProp]
          delete graphNode[nowRelationshipProp]
          put(uid, graphNode, passport)
        }
      }
    }

    // update relationshipUidsKey
    const newRelationshipUidsKey = getRelationshipUidsKey(newName)
    put(newRelationshipUidsKey, relationshipUids, passport)
    del(relationshipUidsKey, passport)

    // update schema relationship
    passport.schema.relationships[newName] = passport.schema.relationships[nowName]
    delete passport.schema.relationships[nowName]

    // update schema node props
    const relationshipNodeProps = passport.schemaDataStructures?.relationshipPropsMap?.get(nowName)

    if (relationshipNodeProps) {
      for (const [ propName, { propNode, propValue } ] of relationshipNodeProps) {
        propValue.x.relationship = newName
        passport.schema.nodes[propNode][propName] = propValue
      }
    }

    schemaDeleteConclude(passport)
  }
}


/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemSchemaUpdateRelationshipPropName } reqItem
 */
export async function schemaUpdateRelationshipPropName (passport, reqItem) {
  if (passport.revokesAcePermissions?.has(getRevokesKey({ action: enums.permissionActions.write, schema: true }))) throw AceAuthError(enums.permissionActions.write, passport, { schema: true })

  for (const { relationship, nowName, newName } of reqItem.x.props) {
    if (!passport.schema?.relationships[relationship]) throw AceError('schemaUpdateRelationshipPropName__invalidRelationship', `The prop cannot be renamed b/c the relationship ${ relationship } it is not defined in your schema`, { relationship, nowName, newName })
    if (!passport.schema?.relationships[relationship]?.props?.[nowName]) throw AceError('schemaUpdateRelationshipPropName__invalidProp', `The prop cannot be renamed b/c the relationship ${ relationship } and the prop ${ nowName } is not defined in your schema`, { relationship, nowName, newName })

    // update prop on each graphRelationship
    const relationshipUids = await passport.storage.get(getRelationshipUidsKey(relationship))

    if (relationshipUids.length) {
      const graphRelationships = await passport.storage.get(relationshipUids)

      for (const [ uid, graphRelationship ] of graphRelationships) {
        if (typeof graphRelationship.x[nowName] !== 'undefined') {
          graphRelationship.x[newName] = graphRelationship.x[nowName]
          delete graphRelationship.x[nowName]
          put(uid, graphRelationship, passport)
        }
      }
    }

    // update schema
    const props = passport.schema.relationships[relationship].props

    if (props) {
      props[newName] = props[nowName]
      delete props[nowName]
      schemaDeleteConclude(passport)
    }
  }
}


/**
 * @param { td.AcePassport } passport
 * @returns { void }
 */
export function schemaDeleteConclude (passport) {
  if (passport.schema) {
    validateSchema(passport.schema)
    put(SCHEMA_KEY, passport.schema, passport)
    setSchemaDataStructures(passport)
  }
}
