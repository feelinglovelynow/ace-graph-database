import { enums, td } from '#ace'
import { del, put } from './storage.js'
import { AceError } from '../objects/AceError.js'
import { validateUpdateOrDeletePermissions } from './validateUpdateOrDeletePermissions.js'
import { getNodeNamePlusRelationshipNameToNodePropNameMapKey, getRelationshipNameFromProp, getRelationshipProp, getRelationshipUidsKey, getRevokesKey } from '../variables.js'


/**
 * @param { string } prop 
 * @param { string } _uid 
 * @param { td.AcePassport } passport 
 * @param { any } relationshipNode 
 */
export function deleteUidFromRelationshipProp (prop, _uid, passport, relationshipNode) {
  if (!Array.isArray(relationshipNode?.[prop])) throw AceError('aceFn__deleteUidFromRelationshipProp__notArray', 'The request fails b/c !Array.isArray(relationshipNode?.[prop])', { relationshipNode, prop })

  const relationshipName = getRelationshipNameFromProp(prop)
  const schemaPropName = passport.schemaDataStructures?.nodeNamePlusRelationshipNameToNodePropNameMap?.get(getNodeNamePlusRelationshipNameToNodePropNameMapKey(relationshipNode.node, relationshipName))

  if (schemaPropName) validateUpdateOrDeletePermissions(enums.permissionActions.delete, relationshipNode, passport, { node: relationshipNode.node, prop: schemaPropName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, node: relationshipNode.node, prop: schemaPropName })))

  if (relationshipNode[prop].length === 1 && relationshipNode[prop][0] === _uid) delete relationshipNode[prop]
  else {
    for (let i = 0; i < relationshipNode[prop].length; i++) {
      if (_uid === relationshipNode[prop][i]) relationshipNode[prop].splice(i, 1)
    }

    if (!relationshipNode[prop].length) delete relationshipNode[prop]
  }

  put(relationshipNode.x.uid, relationshipNode, passport)
}


/**
 * @param { string } relationshipName 
 * @param { string } _uid 
 * @param { td.AcePassport } passport
 */
export async function delete_UidFromRelationshipIndex (relationshipName, _uid, passport) {
  if (!relationshipName) throw AceError('aceFn__delete_UidFromRelationshipIndex__falsyRelationshipName', 'The request fails b/c relationshipName must be truthy', { relationshipName, _uid })

  const relationshipUidsKey = getRelationshipUidsKey(relationshipName)
  const relationshipUidsArray = (await passport.storage.get(relationshipUidsKey)) || []
  const relationshipUidsSet = new Set(relationshipUidsArray)

  relationshipUidsSet.delete(_uid) // remove relationship _uid from relationship index

  if (relationshipUidsSet.size) put(relationshipUidsKey, [ ...relationshipUidsSet ], passport)
  else del(relationshipUidsKey, passport)
}


/**
 * @param { string[] } _uids
 * @param { td.AcePassport } passport
 */
export async function deleteRelationshipsBy_Uids (passport, _uids) {
  if (!Array.isArray(_uids) || !_uids.length) throw AceError('aceFn__deleteRelationshipsBy_Uids__invalid_Uids', 'The request fails b/c _uids must be an array of string uids', { _uids })

  const graphRelationships = /** @type { Map<string, td.AceGraphRelationship> }*/ (await passport.storage.get(_uids))
  const notAllowedDeleteProps = new Set(['_uid', 'a', 'b'])

  for (const graphRelationship of graphRelationships.values()) {
    validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphRelationship, passport, { relationship: graphRelationship.relationship }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationship: graphRelationship.relationship, prop: '*' })))

    for (const propName in graphRelationship) {
      if (!notAllowedDeleteProps.has(propName)) validateUpdateOrDeletePermissions(enums.permissionActions.delete, graphRelationship, passport, { relationship: graphRelationship.relationship, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationship: graphRelationship.relationship, prop: propName })))
    }

    await delete_UidFromRelationshipIndex(graphRelationship.relationship, graphRelationship.x._uid, passport)

    const relationshipNodes = await passport.storage.get([graphRelationship.x.a, graphRelationship.x.b])

    for (const relationshipNode of relationshipNodes.values()) {
      deleteUidFromRelationshipProp(getRelationshipProp(graphRelationship.relationship), graphRelationship.x._uid, passport, relationshipNode)
    }
  }

  _uids.forEach(_uid => del(_uid, passport)) // add @ end b/c above we need info from this relationship
}


/**
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemRelationshipPropDeleteData } reqItem
 */
export async function relationshipPropDeleteData (passport, reqItem) {
  if (!Array.isArray(reqItem?.x?._uids) || !reqItem.x._uids.length) throw AceError('aceFn__relationshipPropDeleteData__invalid_Uids', 'The request fails b/c reqItem.x._uids must be an array of string uids', { reqItem })
  if (!Array.isArray(reqItem?.x?.props) || !reqItem.x.props.length) throw AceError('aceFn__relationshipPropDeleteData__invalidProps', 'The request fails b/c reqItem.x.props must be an array of string props', { reqItem })

  const relationshipNodes = await passport.storage.get(reqItem.x._uids)

  for (const relationshipNode of relationshipNodes.values()) {
    for (const propName of reqItem.x.props) {
      if (typeof relationshipNode.x[propName] !== 'undefined') {
        if (!passport.schema?.relationships[relationshipNode.x.relationship]?.props?.[propName]) throw AceError('aceFn__relationshipPropDeleteData__invalidRelationshipPropCombo', 'The relationship and the prop cannot be deleted b/c they are not defined in your schema', { relationship: relationshipNode.x.relationship, prop: propName })

        validateUpdateOrDeletePermissions(enums.permissionActions.delete, relationshipNode, passport, { relationship: relationshipNode.relationshipName, prop: propName }, passport.revokesAcePermissions?.get(getRevokesKey({ action: enums.permissionActions.delete, relationship: relationshipNode.relationshipName, prop: propName })))
        delete relationshipNode.x[propName]
        put(relationshipNode.x._uid, relationshipNode, passport)
      }
    }
  }
}
