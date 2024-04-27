import { td, enums } from '#ace'
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
  const updatedX = maybeManuallySetAll(props, requestItem.x)

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

    schemaPropValue = relationshipPropsMap.get(xKey)

    if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-schemaPropValue', `This error is thrown b/c schemaPropValue must be truthy, it is not because the relationship \`${ xGeneratedParent.relationshipName }\` and the xKey \`${ xKey }\` does not align with your schema`, { relationshipName: xGeneratedParent.relationshipName, xKey })
  } else if (xGeneratedParent.nodeName) {
    schemaPropValue = /** @type { td.AceSchemaForwardRelationshipProp | td.AceSchemaReverseRelationshipProp | td.AceSchemaBidirectionalRelationshipProp } */ (passport.schema?.nodes?.[xGeneratedParent.nodeName]?.[xKey])
  }

  if (!schemaPropValue) throw AceError('getXGeneratedByParent__falsy-query-x-id', `This request is failing b/c node name "${xGeneratedParent?.nodeName }" with property name "${ xKey }" is not defined in your schema`, { schemaPropName: xKey, nodeName: xGeneratedParent?.id })

  const props = getProps(xValue)
  const updatedX = maybeManuallySetAll(props, xValue)

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
