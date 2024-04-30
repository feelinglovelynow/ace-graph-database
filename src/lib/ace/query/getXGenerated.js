import { td, enums } from '#ace'
import { getUid } from '../getUid.js'
import { AceError } from '../../objects/AceError.js'


/**
 * @param { td.AceQueryRequestItemNode | td.AceQueryRequestItemRelationship } requestItem
 * @param { td.AcePassport } passport
 * @returns { td.AceQueryRequestItemGeneratedXSection }
 */
export function getXGeneratedById (requestItem, passport) {
  if (requestItem.id !== 'QueryByNode' && requestItem.id !== 'QueryByRelationship') throw AceError('getXGeneratedById__x-id-invalid', 'This request is failing b/c request.x.id is not a truthy string of QueryByNode or QueryByRelationship', { query: requestItem })
  if (requestItem.id === 'QueryByNode' && !passport.schema?.nodes[requestItem.node]) throw AceError('getXGeneratedById__x-section-id-node-invalid', 'This request is failing b/c request.x.nodeName is not a node in your schema', { query: requestItem })
  if (requestItem.id === 'QueryByRelationship' && !passport.schema?.relationships[requestItem.relationship]) throw AceError('getXGeneratedById__x-section-id-relationship-invalid', 'This request is failing b/c request.x.relationshipName is not a relationship in your schema', { query: requestItem })

  const props = getProps(requestItem.x)
  const updatedX = updateWhereUids(passport, maybeManuallySetAll(props, requestItem.x))

  /** @type { td.AceQueryRequestItemGeneratedXSection } */
  const response =  {
    props,
    x: updatedX,
    id: requestItem.id,
    has: enums.has.many,
    xPropName: requestItem.prop,
    resHide: getResHide(updatedX),
    aliasPropName: updatedX?.$o?.alias,
    propName: updatedX?.$o?.alias || requestItem.prop,
  }

  if (/** @type { td.AceQueryRequestItemNode } */(requestItem).node) response.nodeName = /** @type { td.AceQueryRequestItemNode } */(requestItem).node
  else if (/** @type { td.AceQueryRequestItemRelationship } */(requestItem).relationship) response.relationshipName = /** @type { td.AceQueryRequestItemRelationship } */(requestItem).relationship

  return response
}


/**
 * @param { td.AceQueryRequestItemNodeX } xValue
 * @param { string } xKey
 * @param { td.AcePassport } passport
 * @param { td.AceQueryRequestItemGeneratedXSection } xGeneratedParent
 * @returns { td.AceQueryRequestItemGeneratedXSection }
 */
export function getXGeneratedByParent (xValue, xKey, passport, xGeneratedParent) {
  let schemaPropValue


  if (xGeneratedParent.id === 'QueryByRelationship') {
    if (!passport.schemaDataStructures?.relationshipPropsMap) throw AceError('getXGeneratedByParent__falsy-schemaDataStructures-relationshipPropsMap', 'The schema data structure relationshipPropsMap must be truthy, this is set if your schema is defined when you create an AcePassport', { relationshipPropsMap: '' })

    const relationshipPropsMap = xGeneratedParent.relationshipName ? passport.schemaDataStructures.relationshipPropsMap.get(xGeneratedParent.relationshipName) : null

    if (!relationshipPropsMap) throw AceError('getXGeneratedByParent__falsy-relationshipPropsMap', `The schema data structure relationshipPropsMap must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` does not align with any relationships in the map`, { relationshipName: xGeneratedParent.relationshipName })

    const r = relationshipPropsMap.get(xKey)
    schemaPropValue = r?.propValue

    if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-schemaPropValue', `This error is thrown b/c schemaPropValue must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` and the xKey \`${ xKey }\` does not align with your schema`, { relationshipName: xGeneratedParent.relationshipName, xKey })
  } else if (xGeneratedParent.nodeName) {
    schemaPropValue = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[xGeneratedParent.nodeName]?.[xKey])
  }

  if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-query-x-id', `This request is failing b/c node name "${xGeneratedParent?.nodeName }" with property name "${ xKey }" is not defined in your schema`, { schemaPropName: xKey, nodeName: xGeneratedParent?.id })

  const props = getProps(xValue)
  const updatedX = updateWhereUids(passport, maybeManuallySetAll(props, xValue))

  return {
    props,
    x: updatedX,
    xPropName: xKey,
    has: schemaPropValue.x.has,
    resHide: getResHide(updatedX),
    nodeName: schemaPropValue.x.node,
    aliasPropName: updatedX?.$o?.alias,
    propName: updatedX?.$o?.alias || xKey,
    relationshipName: schemaPropValue.x.relationship,
  }
}


/**
 * IF props is empty manually set $o.all to true (if $o.all is set don't overwrite $o.all)
 * @param { Set<string> } props
 * @param { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX | boolean } [ x ]
 * @returns { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX | * }
 */
function maybeManuallySetAll (props, x) {
  let res

  if (typeof x === 'boolean') {
    if (x) res = { $o: { all: true } }
    else res = x
  } else {
    if (props.size && x) res = x
    else if (!x || !x.$o) res = { $o: { all: true } }
    else res = { $o: { all: true, ...x.$o } }
  }

  return res
}


/**
 * @param { td.AcePassport } passport
 * @param { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX } [ x ]
 * @returns { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX | * }
 */
function updateWhereUids (passport, x) {
  // find
  if (x?.$o?.findByUid) x.$o.findByUid = getUid(passport, { uid: x.$o.findByUid })
  if (x?.$o?.findBy_Uid) x.$o.findBy_Uid = getUid(passport, { uid: x.$o.findBy_Uid })
  if (x?.$o?.findByPropValue) x.$o.findByPropValue[2] = getUid(passport, { uid: x.$o.findByPropValue[2] })

  // filter
  if (x?.$o?.filterByUids) x.$o.filterByUids = getUid(passport, { uids: x.$o.filterByUids })
  if (x?.$o?.filterBy_Uids) x.$o.filterBy_Uids = getUid(passport, { uids: x.$o.filterBy_Uids })
  if (x?.$o?.filterByPropValue) x.$o.filterByPropValue[2] = getUid(passport, { uid: x.$o.filterByPropValue[2] })

  // groups
  if (x?.$o?.findByOr) x.$o.findByOr = updateWhereGroupUids(passport, x.$o.findByOr)
  if (x?.$o?.findByAnd) x.$o.findByAnd = updateWhereGroupUids(passport, x.$o.findByAnd)
  if (x?.$o?.filterByOr) x.$o.filterByOr = updateWhereGroupUids(passport, x.$o.filterByOr)
  if (x?.$o?.filterByAnd) x.$o.filterByAnd = updateWhereGroupUids(passport, x.$o.filterByAnd)

  return x
}


/**
 * @param { td.AcePassport } passport
 * @param { td.AceQueryFilterGroup } group
 * @returns { td.AceQueryFilterGroup }
 */
function updateWhereGroupUids (passport, group) {
  for (const groupItem of group) {
    if (Array.isArray(groupItem) && groupItem.length === 3 && typeof groupItem[2] === 'string') groupItem[2] = getUid(passport, { uid: groupItem[2] })
    else if (/** @type { td.AceQueryWhereOr } */ (groupItem).or) updateWhereGroupUids(passport, /** @type { td.AceQueryWhereOr } */(groupItem).or)
    else if (/** @type { td.AceQueryWhereAnd } */ (groupItem).and) updateWhereGroupUids(passport, /** @type { td.AceQueryWhereAnd } */(groupItem).and)
  }

  return group
}


/**
 * @param { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX } [ x ]  
 * @returns { Set<string> }
 */
function getProps (x) {
  const set = new Set(Object.keys(x || {}) || [])

  set.delete('$o')

  return set
}


/**
 * @param { td.AceQueryRequestItemNodeX | td.AceQueryRequestItemRelationshipX } [ x ]
 * @returns { Set<string> | null }
 */
function getResHide (x) {
  return x?.$o?.resHide ? new Set(x.$o?.resHide) : null
}
