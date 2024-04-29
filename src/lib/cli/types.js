import { DELIMITER } from '../variables.js'
import { isObjPopulated } from '../isObjPopulated.js'


/**
 * @param { { nodes: any; relationships: any; } | null } schema
 */
export function typedefs (schema) {
  const typedefs = getSchemaTypedefs(schema)

  return `import * as enums from './enums.js'


${ typedefs.Nodes }${ typedefs.Relationships }/** AceGraph
 *
 * @typedef { object } AceGraphRelationship
 * @property { string } relationship
 * @property { AcGraphRelationshipX } x
 * @typedef { { a: string, b: string, _uid: string, [propName: string]: any } } AcGraphRelationshipX
 * 
 * @typedef { object } AceGraphPermission
 * @property { string } uid
 * @property { enums.permissionActions } action
 * @property { boolean } [ schema ]
 * @property { string } [ node ]
 * @property { string } [ relationship ]
 * @property { string } [ propName ]
 * @property { string } [ allowPropName ]
 */


/** AceError
 *
 * @typedef { { id: string, detail: string, [errorItemKey: string]: any} } AceError
 * @typedef { { node?: string, relationship?: string, prop?: string, schema?: boolean } } AceAuthErrorOptions
 */


/** AceCLI
 *
 * @typedef { Map<string, string> } AceCLIOptions
 */


/** AceFn
 *
 * @typedef { object } AceFnOptions
 * @property { AcePassport } passport
 * @property { AceFnRequest } request
 * @property { AceFnStringJWKs } [ privateJWKs ]
 * @property { AceFnStringJWKs } [ publicJWKs ]
 *
 * @typedef { AceQueryRequestItem | AceMutateRequestItem | (AceQueryRequestItem | AceMutateRequestItem)[] } AceFnRequest
 * @typedef { { [prop: string]: any, $ace: AceFn$ } } AceFnResponse
 * @typedef { { now: { [k: string]: any }, original: { [k: string]: any } } } AceFnFullResponse
 * @typedef { { success: true } } AceFnEmptyResponse
 *
 * @typedef { object } AceFnFetchOptions
 * @property { string } host - Host URL for the Cloudflare Worker that points to your Ace Graph Database
 * @property { AceFnRequest } request
 * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling \`id: 'Start'\` from \`mutate()\`
 * @property { { [jwkName: string]: string } } [ publicJWKs ]
 * @property { { [jwkName: string]: string } } [ privateJWKs ]
 *
 * @typedef { { [key: string]: string } } AceFnStringJWKs
 * @typedef { { [key: string]: CryptoKey } } AceFnCryptoJWKs
 *
 * @typedef { { newUids: { [uid: string]: string }, deletedKeys: string[] } } AceFn$
 * @typedef { { newUids: Map<string, string>, deletedKeys: Set<string>, putMap: Map<string, any> } } AceFn$DataStructure
 *
 * @typedef { { nodes: any, relationships: any } } AceFnUpdateRequestItems - If updating we store the orignal items here, based on the uid (nodes) or _uid (relationships)
 * 
 * @typedef { Map<string, { nodeName: string, nodePropName: string, uids: string[] }> } AceFnSortIndexMap - As we find properties that according to the schema need a sort index insert we will keep track of them here. Once we get them all together, we sort them, and then add to graph.
 */


/** AcePlugin
 *
 * @typedef { object } AcePlugin
 * @property { AceInstallPlugin } install
 *
 * @typedef { object } AceInstallPlugin
 * @property { AceFnRequest } request
 * @property { AceFnStringJWKs } [ publicJWKs ]
 * @property { AceFnStringJWKs } [ privateJWKs ]
 *
 * @typedef { object } AceUninstallPlugin
 */


/** AcePassport
 *
 * @typedef { object } AcePassport
 * @property { Ace_CF_DO_Storage } storage
 * @property { enums.passportSource } source - The source function that created this passport
 * @property { AcePassportUser } user
 * @property { AceFn$DataStructure } $aceDataStructures
 * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling mutate > Initalize
 * @property { AceSchema } [ schema ]
 * @property { Map<string, AceGraphPermission> } [ revokesAcePermissions ]
 * @property { boolean } [ isEnforcePermissionsOn ]
 * @property { AcePassportSchemaDataStructures } [ schemaDataStructures ]
 *
 * @typedef { object } AcePassportUser
 * @property { string } uid
 * @property { string } password
 * @property { { uid: string, revokesAcePermissions: { uid: string, action: enums.permissionActions, nodeName?: string, relationshipName?: string, propName?: string, schema?: boolean, allowPropName?: string }[] } } [ role ]
 *
 * @typedef { object } AcePassportSchemaDataStructures
 * @property { Set<string> } [ nodeNamesSet ]
 * @property { Set<string> } [ relationshipNamesSet ]
 * @property { Map<string, Set<string>> } [ cascade ]
 * @property { Map<string, Set<string>> } [ nodeRelationshipPropsMap ]
 * @property { Map<string, string> } [ nodeNamePlusRelationshipNameToNodePropNameMap ]
 * @property { Map<string, Map<string, AceSchemaForwardRelationshipProp | AceSchemaReverseRelationshipProp | AceSchemaBidirectionalRelationshipProp>> } [ relationshipPropsMap ]
 * @property { Map<string, Map<string, (AceSchemaProp | AceSchemaRelationshipProp | AceSchemaForwardRelationshipProp | AceSchemaReverseRelationshipProp | AceSchemaBidirectionalRelationshipProp)>> } [ mustPropsMap ]
 *
 * @typedef { object } AcePassportOptions
 * @property { enums.passportSource } source - The source function that created this passport
 * @property { Ace_CF_DO_Storage } [ storage ] - Cloudflare Durable Object Storage (Ace Graph Database)
 * @property { AcePassportUser } [ user ]
 * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling mutate > Start
 * @property { AceSchema } [ schema ]
 * @property { AcePassportSchemaDataStructures } [ schemaDataStructures ]
 * @property { Request } [ request ]
 * @property { Map<string, AceGraphPermission> } [ revokesAcePermissions ]
 * @property { boolean } [ isEnforcePermissionsOn ]
 */


/** AceSchema
 *
 * @typedef { { nodes: { [nodeName: string]: AceSchemaNodeValue }, relationships: { [relationshipName: string]: AceSchemaRelationshipValue } } } AceSchema
 * @typedef { { [nodePropName: string]: AceSchemaProp | AceSchemaForwardRelationshipProp | AceSchemaReverseRelationshipProp | AceSchemaBidirectionalRelationshipProp } } AceSchemaNodeValue
 *
 * @typedef { AceSchemaRelationshipValueOneToOne | AceSchemaRelationshipValueOneToMany | AceSchemaRelationshipValueManyToMany } AceSchemaRelationshipValue
 * 
 * @typedef { object } AceSchemaRelationshipValueOneToOne
 * @property { typeof enums.idsSchema.OneToOne  } id - This is a one to one relationship
 * @property { AceSchemaRelationshipProps  } [ props ]
 * 
 * @typedef { object } AceSchemaRelationshipValueOneToMany
 * @property { typeof enums.idsSchema.OneToMany  } id - This is a one to many relationship
 * @property { AceSchemaRelationshipProps  } [ props ]
 * 
 * @typedef { object } AceSchemaRelationshipValueManyToMany
 * @property { typeof enums.idsSchema.ManyToMany  } id - This is a many to many relationship
 * @property { AceSchemaRelationshipProps  } [ props ]
 *
 * @typedef { object } AceSchemaProp
 * @property { typeof enums.idsSchema.Prop  } id - This is a standard node prop
 * @property { AceSchemaPropX } x
 *
 * @typedef { object } AceSchemaRelationshipProp
 * @property { typeof enums.idsSchema.RelationshipProp } id - This is a relationship prop
 * @property { AceSchemaPropX } x
 *
 * @typedef { object } AceSchemaForwardRelationshipProp
 * @property { typeof enums.idsSchema.ForwardRelationshipProp } id - A \`Forward\` direction node relationship prop. For example, if the relationship name is \`isFollowing\`, the \`following\` prop is the \`Forward\` prop and the \`followers\` prop is the \`Reverse\` prop
 * @property { AceSchemaNodeRelationshipX } x
 *
 * @typedef { object } AceSchemaReverseRelationshipProp
 * @property { typeof enums.idsSchema.ReverseRelationshipProp } id - A \`Reverse\` direction node relationship prop. For example, if the relationship name is \`isFollowing\`, the \`following\` prop is the \`Forward\` prop and the \`followers\` prop is the \`Reverse\` prop
 * @property { AceSchemaNodeRelationshipX } x
 *
 * @typedef { object } AceSchemaBidirectionalRelationshipProp
 * @property { typeof enums.idsSchema.BidirectionalRelationshipProp } id - A \`Bidirectional\` node relationship prop. Meaning there is only one prop name and it represents both directions. For example if we a relationship name of \`isFriendsWith\`, the \`friends\` prop is the \`Bidirectional\` prop
 * @property { AceSchemaNodeRelationshipX } x
 *
 * @typedef { object } AceSchemaPropX
 * @property { enums.dataTypes } dataType - The data type for this property
 * @property { boolean } [ mustBeDefined ] - Must this schema prop be defined
 * @property { boolean } [ sortIndex ] - Should Ace maintain a sort index for this property. The index will be an array of all this node's uid's in the order they are when all these node's are sorted by this property.
 * @property { boolean } [ uniqueIndex ] - Should Ace maintain a unique index for this property. This way you'll know no nodes in your graph have the same value for this property and a AceQueryFind will be faster if searching by this property.
 * @property { string } [ description ] - Custom description that Ace will add to other types, example: query / mutation types
 *
 * @typedef { object } AceSchemaNodeRelationshipX
 * @property { enums.has } has - Does this node have a max of \`one\` of these props or a max of \`many\`
 * @property { string } node - The node name that this prop points to
 * @property { string } relationship - Each node prop that is a relationship must also align with a relationship name. This way the relationship can have its own props.
 * @property { boolean } [ mustBeDefined ] - Must each node in the graph, that aligns with this relationship, have this relationship defined
 * @property { string } [ description ] - Custom description that Ace will add to other types, example: query / mutation types
 * @property { boolean } [ cascade ] - When this schema.node is deleted, also delete the node that this prop points to
 *
 * @typedef { { [propName: string]: AceSchemaRelationshipProp } } AceSchemaRelationshipProps - Props for this relationship
 */


/** AceMutate
 *
 * @typedef { AceMutateRequestItemLoadBackup | AceMutateRequestItemPlugin | AceMutateRequestItemEmpty | AceMutateRequestItemInsert | AceMutateRequestItemUpdate | AceMutateRequestItemUpsert | AceMutateRequestItemDataDelete | AceMutateRequestItemSchemaAndData | AceMutateRequestItemAddToSchema } AceMutateRequestItem
 * @typedef { AceMutateRequestItemAddNodeToGraph | AceMutateRequestItemAddRelationshipToGraph } AceMutateRequestItemInsert
 * @typedef { AceMutateRequestItemUpdateGraphNode | AceMutateRequestItemUpdateGraphRelationship } AceMutateRequestItemUpdate
 * @typedef { AceMutateRequestItemUpsertGraphNode | AceMutateRequestItemUpsertGraphRelationship } AceMutateRequestItemUpsert
 * @typedef { AceMutateRequestItemDataDeleteNodes | AceMutateRequestItemDataDeleteRelationships | AceMutateRequestItemDataDeleteNodeProps | AceMutateRequestItemDataDeleteRelationshipProps } AceMutateRequestItemDataDelete
 * @typedef { AceMutateRequestItemSchemaAndDataDeleteNodes | AceMutateRequestItemSchemaAndDataDeleteNodeProps | AceMutateRequestItemSchemaAndDataUpdateNameOfNodes | AceMutateRequestItemSchemaAndDataUpdateNameOfNodeProps } AceMutateRequestItemSchemaAndData
 * @typedef { AceMutateRequestItemInstallPlugin | AceMutateRequestItemUninstallPlugin } AceMutateRequestItemPlugin
 *
 * @typedef { object } AceMutateRequestItemLoadBackup
 * @property { typeof enums.idsAce.LoadBackup } id
 * @property { { backup: string } } x
 *
 * @typedef { object } AceMutateRequestItemEmpty
 * @property { typeof enums.idsAce.Empty } id - Delete all data and schema from graph
 * @property { string } [ prop ]
 *
 * @typedef { object } AceMutateRequestItemInstallPlugin
 * @property { typeof enums.idsAce.InstallPlugin } id
 * @property { string } [ prop ]
 * @property { AceMutateRequestItemInstallPluginX } x
 * @typedef { object } AceMutateRequestItemInstallPluginX
 * @property { AceInstallPlugin } install
 *
 * @typedef { object } AceMutateRequestItemUninstallPlugin
 * @property { typeof enums.idsAce.UninstallPlugin } id
 * @property { string } [ prop ]
 * @property { { request: AceFnRequest } } x${ typedefs.mutate.AddNodeToGraphType }${ typedefs.mutate.AddRelationshipToGraphType }${ typedefs.mutate.UpdateGraphNodeType }${ typedefs.mutate.UpdateGraphRelationshipType }${ typedefs.mutate.UpsertGraphNodeType }${ typedefs.mutate.UpsertGraphRelationshipType }
 * 
 * @typedef { AceMutateRequestItemUpdateGraphNode & { [relationshipProp: string]: string[] } } AceMutateRequestItemNodeWithRelationships
 * 
 * @typedef { object } AceMutateRequestItemDataDeleteNodes
 * @property { typeof enums.idsAce.DataDeleteNodes } id
 * @property { AceMutateRequestItemDataDeleteNodesX } x
 * @typedef { object } AceMutateRequestItemDataDeleteNodesX
 * @property { string[] } uids - The uids you'd love deleted. To cascade delete, add cascade to your schema
 *
 * @typedef { object } AceMutateRequestItemDataDeleteRelationships
 * @property { typeof enums.idsAce.DataDeleteRelationships } id
 * @property { { _uids: string[] } } x
 *
 * @typedef { object } AceMutateRequestItemDataDeleteNodeProps
 * @property { typeof enums.idsAce.DataDeleteNodeProps } id
 * @property { { uids: string[], props: string[] } } x
 *
 * @typedef { object } AceMutateRequestItemDataDeleteRelationshipProps
 * @property { typeof enums.idsAce.DataDeleteRelationshipProps } id
 * @property { { _uids: string[], props: string[] } } x
 *
 * @typedef { ${ typedefs.mutate.SchemaAndDataDeleteNodesType || 'string' } } AceMutateRequestItemSchemaAndDataDeleteNodesNode
 * 
 * @typedef { object } AceMutateRequestItemSchemaAndDataDeleteNodes
 * @property { typeof enums.idsAce.SchemaAndDataDeleteNodes } id
 * @property { AceMutateRequestItemSchemaAndDataDeleteNodesX } x
 * @typedef { object } AceMutateRequestItemSchemaAndDataDeleteNodesX
 * @property { AceMutateRequestItemSchemaAndDataDeleteNodesNode[] } nodes
 *
 * @typedef { object } AceMutateRequestItemSchemaAndDataDeleteNodeProps
 * @property { typeof enums.idsAce.SchemaAndDataDeleteNodeProps } id
 * @property { AceMutateRequestItemSchemaAndDataDeleteNodePropsX } x
 * @typedef { object } AceMutateRequestItemSchemaAndDataDeleteNodePropsX
 * @property { ${ typedefs.mutate.SchemaAndDataDeleteNodePropsType || '{ node: string, prop: string }[]' } } props
 *
 * @typedef { object } AceMutateRequestItemSchemaAndDataUpdateNameOfNodes
 * @property { typeof enums.idsAce.SchemaAndDataUpdateNameOfNodes } id
 * @property { AceMutateRequestItemSchemaAndDataUpdateNameOfNodesX } x
 * @typedef { object } AceMutateRequestItemSchemaAndDataUpdateNameOfNodesX
 * @property { ${ typedefs.mutate.SchemaAndDataUpdateNameOfNodesType || '{ nowName: string, newName: string }[]' } } nodes
 *
 * @typedef { object } AceMutateRequestItemSchemaAndDataUpdateNameOfNodeProps
 * @property { typeof enums.idsAce.SchemaAndDataUpdateNameOfNodeProps } id
 * @property { AceMutateRequestItemSchemaAndDataUpdateNameOfNodePropsX } x
 * @typedef { object } AceMutateRequestItemSchemaAndDataUpdateNameOfNodePropsX
 * @property { ${ typedefs.mutate.SchemaAndDataUpdateNameOfNodePropsType || '{ node: string, nowName: string, newName: string }[]' } } props
 *
 * @typedef { object } AceMutateRequestItemAddToSchema
 * @property { typeof enums.idsAce.AddToSchema } id
 * @property { string } [ prop ]
 * @property { AceMutateRequestItemAddToSchemaX } x
 * @typedef { object } AceMutateRequestItemAddToSchemaX
 * @property { AceSchema } schema
 *
 * @typedef { object } AceMutateRequestOptions
 * @property { string } [ privateJWK ]
 *
 * @typedef { { [propName: string]: any } } AceMutateRequestItemAddRelationshipToGraphX
 */${ typedefs.mutate.AddNodeToGraphTypes }${ typedefs.mutate.AddRelationshipToGraphTypes }${ typedefs.mutate.UpdateGraphNodeTypes }${ typedefs.mutate.UpdateGraphRelationshipTypes }${ typedefs.mutate.UpsertGraphNodeTypes }${ typedefs.mutate.UpsertGraphRelationshipTypes }


/** AceQuery
 * 
${ typedefs.query.NodeType }
 *
${ typedefs.query.RelationshipType }
 *
 * @typedef { AceQueryRequestItemNode | AceQueryRequestItemRelationship | AceQueryRequestItemGetBackup | AceQueryRequestItemGetSchema } AceQueryRequestItem
 *
 * @typedef { boolean | { alias: string } } AceQueryXPropValue
 * 
 * @typedef { object } AceQueryRequestItemGeneratedXSection
 * @property { string } xPropName
 * @property { string } propName
 * @property { string } [ aliasPropName ]
 * @property { enums.has } has
 * @property { string } [ id ]
 * @property { string } [ nodeName ]
 * @property { string } [ relationshipName ]
 * @property { AceQueryRequestItemNodeX } x
 * @property { Set<string> | null } resHide
 * @property { Set<string> } props
 *
 * @typedef { { [key: string]: CryptoKey } } AceQueryPublicJWKs
 *
 * @typedef { { node?: any, relationship?: any, uid?: string } } AceQueryAddPropsItem
 * 
 * @typedef { { [propertyName: string]: any,   uid?: AceQueryXPropValue,   $o?: AceQueryRequestItemNodeOptions } } AceQueryRequestItemNodeX
 * @typedef { { [propertyName: string]: any,   _uid?: AceQueryXPropValue,  $o?: AceQueryRequestItemNodeOptions } } AceQueryRequestItemRelationshipX
 * 
 * @typedef { object } AceQueryRequestItemNodeOptions
 * @property { enums.queryOptions[] } [ flow ]
 * @property { string } [ alias ]
 * @property { boolean } [ all ]
 * @property { AceQuerySort } [ sort ]
 * @property { string } [ findByUid ]
 * @property { string } [ findBy_Uid ]
 * @property { AceQueryFindByUnique } [ findByUnique ]
 * @property { string[] } [ filterByUids ]
 * @property { string[] } [ filterBy_Uids ]
 * @property { AceQueryFilterByUniques } [ filterByUniques ]
 * @property { { [jwkName: string]: string } } [ publicJWKs ]
 * @property { string } [ countAsProp ] - Find the count for the number of items in the response and then add this value as this \`prop\` to each node in the response
 * @property { AceQuerySumAsProperty } [ sumAsProp ]
 * @property { AceQueryAverageAsProperty } [ avgAsProp ]
 * @property { AceQueryMinAmountAsProperty } [ minAmtAsProp ]
 * @property { AceQueryMaxAmountAsProperty } [ maxAmtAsProp ]
 * @property { AceQueryDerivedProperty } [ newProps ]
 * @property { AceQueryPropertyAdjacentToResponse } [ propAdjToRes ]
 * @property { AceQueryFindGroup } [ findByOr ]
 * @property { AceQueryFindGroup } [ findByAnd ]
 * @property { AceQueryWherePropValue } [ findByPropValue ]
 * @property { AceQueryWherePropProp } [ findByPropProp ]
 * @property { AceQueryWherePropRes } [ findByPropRes ]
 * @property { string } [ findByDefined ]
 * @property { string } [ findByUndefined ]
 * @property { AceQueryFilterGroup } [ filterByOr ]
 * @property { AceQueryFilterGroup } [ filterByAnd ]
 * @property { string } [ filterByDefined ]
 * @property { string } [ filterByUndefined ]
 * @property { AceQueryWherePropValue } [ filterByPropValue ]
 * @property { AceQueryWherePropProp } [ filterByPropProp ]
 * @property { AceQueryWherePropRes } [ filterByPropRes ]
 * @property { AceQueryLimit } [ limit ]
 * @property { string[] } [ resHide ] - Array of props you'd love to hide in the response
 * @property { AceQueryPropertyAsResponse } [ propAsRes ]
 * @property { boolean } [ countAsRes ] - Display the count of results as the response
 * @property { string } [ sumAsRes ] - Loop the items in the response, calculate the sum of this property, amongst all response items and set it as the response
 * @property { string } [ avgAsRes ] - Loop the items in the response, calculate the average of this property, amongst all response items and set it as the response
 * @property { string } [ minAmtAsRes ] - Loop the items in the response, find the min amount of this property, amongst all response items and set it as the response
 * @property { string } [ maxAmtAsRes ] - Loop the items in the response, find the max amount of this property, amongst all response items and set it as the response
 * @property { string } [ minNodeAsRes ] - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { string } [ maxNodeAsRes ] - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * 
 * @typedef { object } AceQueryRequestItemRelationshipOptions
 * @property { enums.queryOptions[] } [ flow ]
 * @property { string } [ alias ]
 * @property { boolean } [ all ]
 * @property { AceQuerySort } [ sort ]
 * @property { string } [ findBy_Uid ]
 * @property { string[] } [ filterBy_Uids ]
 * @property { { [jwkName: string]: string } } [ publicJWKs ]
 * @property { string } [ countAsProp ] - Find the count for the number of items in the response and then add this value as this \`prop\` to each node in the response
 * @property { AceQuerySumAsProperty } [ sumAsProp ]
 * @property { AceQueryAverageAsProperty } [ avgAsProp ]
 * @property { AceQueryMinAmountAsProperty } [ minAmtAsProp ]
 * @property { AceQueryMaxAmountAsProperty } [ maxAmtAsProp ]
 * @property { AceQueryDerivedProperty } [ newProps ]
 * @property { AceQueryPropertyAdjacentToResponse } [ propAdjToRes ]
 * @property { AceQueryFindGroup } [ findByOr ]
 * @property { AceQueryFindGroup } [ findByAnd ]
 * @property { string } [ findByDefined ]
 * @property { string } [ findByUndefined ]
 * @property { AceQueryWherePropValue } [ findByPropValue ]
 * @property { AceQueryWherePropProp } [ findByPropProp ]
 * @property { AceQueryWherePropRes } [ findByPropRes ]
 * @property { AceQueryFilterGroup } [ filterByOr ]
 * @property { AceQueryFilterGroup } [ filterByAnd ]
 * @property { string } [ filterByDefined ]
 * @property { string } [ filterByUndefined ]
 * @property { AceQueryWherePropValue } [ filterByPropValue ]
 * @property { AceQueryWherePropProp } [ filterByPropProp ]
 * @property { AceQueryWherePropRes } [ filterByPropRes ]
 * @property { AceQueryLimit } [ limit ]
 * @property { string[] } [ resHide ] - Array of props you'd love to hide in the response
 * @property { AceQueryPropertyAsResponse } [ propAsRes ]
 * @property { boolean } [ countAsRes ] - Display the count of results as the response
 * @property { string } [ sumAsRes ] - Loop the items in the response, calculate the sum of this property, amongst all response items and set it as the response
 * @property { string } [ avgAsRes ] - Loop the items in the response, calculate the average of this property, amongst all response items and set it as the response
 * @property { string } [ minAmtAsRes ] - Loop the items in the response, find the min amount of this property, amongst all response items and set it as the response
 * @property { string } [ maxAmtAsRes ] - Loop the items in the response, find the max amount of this property, amongst all response items and set it as the response
 * @property { string } [ minNodeAsRes ] - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { string } [ maxNodeAsRes ] - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } AceQueryWhereItemProp
 * @property { string } prop
 * @property { string[] } [ relationships ]
 *
 * @typedef { * } AceQueryWhereItemValue
 * @typedef { object } AceQueryWhereItemRes - An array from response, so if you'd love to point to response.abc.xyz[10].yay this value would be [ 'abc', 'xyz', 10, 'yay' ]
 * @property { any[] } res - An array from response, so if you'd love to point to response.abc.xyz[10].yay this value would be [ 'abc', 'xyz', 10, 'yay' ]
 *
 * @typedef { { or: AceQueryFindGroup } } AceQueryWhereOr
 * @typedef { { and: AceQueryFindGroup } } AceQueryWhereAnd
 * @typedef { { isPropDefined: string } } AceQueryWhereDefined
 * @typedef { { isPropUndefined: string } } AceQueryWhereUndefined
 * @typedef { [ AceQueryWhereItemProp, enums.queryWhereSymbol, AceQueryWhereItemProp ] } AceQueryWherePropProp
 * @typedef { [ AceQueryWhereItemProp, enums.queryWhereSymbol, AceQueryWhereItemValue ] } AceQueryWherePropValue
 * @typedef { [ AceQueryWhereItemProp, enums.queryWhereSymbol, AceQueryWhereItemRes ] } AceQueryWherePropRes
 * @typedef { (AceQueryWherePropValue | AceQueryWherePropProp | AceQueryWherePropRes | AceQueryWhereDefined | AceQueryWhereUndefined | AceQueryWhereOr | AceQueryWhereAnd)[] } AceQueryFindGroup
 * @typedef { (AceQueryWherePropValue | AceQueryWherePropProp | AceQueryWherePropRes | AceQueryWhereDefined | AceQueryWhereUndefined | AceQueryWhereOr | AceQueryWhereAnd)[] } AceQueryFilterGroup
 *
 * @typedef { object } AceQueryFilterByUniques
 * @property { AceQueryFilterByUniquesXUnique[] } uniques - With this array of unique values, returns an array of valid nodes (valid meaning: found in graph via unique index & $o qualifiying)
 * @typedef { object } AceQueryFilterByUniquesXUnique
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } prop - Find node by this prop that has a unique index
 *
 * @typedef { object } AceQueryFindByUnique
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } prop - Find node by this prop that has a unique index
 *
 * @typedef { object } AceQueryRequestItemGetSchema
 * @property { typeof enums.idsAce.GetSchema } id
 * @property { string } prop
 *
 * @typedef { object } AceQueryRequestItemGetBackup
 * @property { typeof enums.idsAce.GetBackup } id
 * @property { string } prop
 * 
 * @typedef { object } AceQueryValue
 * @property { any } value
 *
 * @typedef { object } AceQuerySort
 * @property { enums.sortHow } how
 * @property { string } prop
 * 
 * @typedef { object } AceQueryLimit
 * @property { number } [ skip ]
 * @property { number } [ count ]
 *
 * @typedef { object } AceQueryProperty
 * @property { string } prop - String property name
 * @property { string[] } [ relationships ] - If this property is not on the node, list the relationship properties to get to the desired nodes
 *
 * @typedef { object } AceQuerySumAsProperty
 * @property { string } computeProp - Add the sum of the \`computeProperty\` of each node in the response
 * @property { string } newProp - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 *
 * @typedef { object } AceQueryPropertyAsResponse
 * @property { string } prop - String that is the prop name that you would love to show as the response
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to source. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.enum, the relationships will be \`[ 'role' ]\`, property is \`'enum'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } AceQueryPropertyAdjacentToResponse
 * @property { string } sourceProp
 * @property { string } adjacentProp
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to see, as the response. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.enum, the relationships will be \`[ 'role' ]\`, property is \`'enum'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } AceQueryAverageAsProperty
 * @property { string } computeProp - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response
 * @property { string } newProp - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 *
 * @typedef { object } AceQueryMinAmountAsProperty
 * @property { string } computeProp - Find the smallest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProp - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 *
 * @typedef { object } AceQueryMaxAmountAsProperty
 * @property { string } computeProp - Find the largest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProp - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 *
 * @typedef { { [propName: string]: AceQueryDerivedGroup } } AceQueryDerivedProperty
 * @typedef { { add: AceQueryDerivedGroupItem[], subtract?: never, multiply?: never, divide?: never } | { subtract: AceQueryDerivedGroupItem[], add?: never, multiply?: never, divide?: never } | { multiply: AceQueryDerivedGroupItem[], add?: never, subtract?: never, divide?: never } | { divide: AceQueryDerivedGroupItem[], add?: never, subtract?: never, multiply?: never } } AceQueryDerivedGroup
 * @typedef { number | string | AceQueryProperty | AceQueryDerivedGroup } AceQueryDerivedGroupItem
*/${ typedefs.query.Nodes } ${ typedefs.query.Relationships } ${ typedefs.query.RelationshipPropTypes }


/** Cloudflare
 *
 * @typedef { object } Ace_CF_Env
 * @property { Ace_CF_DO_Namespace } AceGraphDatabase
 *
 * @typedef { object } Ace_CF_DO_Namespace
 * @property { (name: string) => string } idFromName
 * @property { (name: string) => Ace_CF_DO_Stub } get
 *
 * @typedef { object } Ace_CF_DO_Stub
 * @property { (request: Request) => Promise<any> } fetch
 *
 * @typedef { function } Ace_CF_DO_StoragePut
 * @param { string | { [k: string]: any }  } keyOrEntries - Is a string if .put(key, value) / Is an object of entries if .put(entries)
 * @param { any  } [ value ] - Defined if .put(key, value) / Undefined if .put(entries)
 * @returns { Promise<any> }
 *
 * @typedef { object } Ace_CF_DO_Storage
 * @property { (key: string | string[]) => any } get
 * @property { Ace_CF_DO_StoragePut } put
 * @property { (options?: Ace_CF_DO_StorageListOptions) => Promise<Map<string, any>> } list - Returns all keys and values associated with the current Durable Object in ascending sorted order based on the keys UTF-8 encodings.
 * @property { (key: string | string[]) => Promise<boolean> } delete
 * @property { (options?: Ace_CF_DO_StoragePutDeleteOptions) => Promise<void> } deleteAll
 * @property { (callback: (txn: any) => Promise<void>) => Promise<void> } transaction
 *
 * @typedef { object } Ace_CF_DO_StorageListOptions
 * @property { string } [ start ] - Key at which the list results should start, inclusive.
 * @property { string } [ startAfter ] - Key after which the list results should start, exclusive. Cannot be used simultaneously with start.
 * @property { string } [ end ] - Key at which the list results should end, exclusive.
 * @property { string } [ prefix ] - Restricts results to only include key-value pairs whose keys begin with the prefix.
 * @property { boolean } [ reverse ] - If true, return results in descending order instead of the default ascending order.
 * @property { number } [ limit ] - Maximum number of key-value pairs to return.
 *
 * @typedef { object } Ace_CF_DO_StoragePutDeleteOptions
 * @property { boolean } allowUnconfirmed
 * @property { boolean } noCache
 *
 * @typedef { object } Ace_CF_DO_State
 * @property { Ace_CF_DO_Storage } storage
 */


/** AceBackup
 *
 * @typedef { { [k: string]: any }  } AceBackupResponse
 */
`
}


/**
 * @param { { nodes: any; relationships: any; } | null } schema
 */
function getSchemaTypedefs (schema) {
  /** @type { Map<string, { schemaNodeName: string, schemaNodePropName: string, schemaProp: any }[]> }> } <relationshipName, ({ schemaNodeName, schemaNodePropName: string, schemaProp: AceSchemaBidirectionalRelationshipProp } | { schemaNodePropName: string, schemaProp: AceSchemaForwardRelationshipProp } | { schemaNodePropName: string, schemaProp: SchemaReverseRelationshipPro }p)[]> */
  const relationshipMap = new Map()

  const typedefs = {
    Nodes: '',
    Relationships: '',
    query: {
      Nodes: '',
      NodeType: '',
      NodeProps: '',
      NodePipes: '',
      Relationships: '',
      RelationshipType: '',
      RelationshipProps: '',
      RelationshipPipes: '',
      RelationshipPropTypes: '',
    },
    mutate: {
      AddNodeToGraphType: '',
      UpdateGraphNodeType: '',
      UpsertGraphNodeType: '',
      AddNodeToGraphPipes: '',
      UpdateGraphNodePipes: '',
      UpsertGraphNodePipes: '',
      AddNodeToGraphTypes: '',
      UpdateGraphNodeTypes: '',
      UpsertGraphNodeTypes: '',
      AddRelationshipToGraphType: '',
      UpdateGraphRelationshipType: '',
      UpsertGraphRelationshipType: '',
      AddRelationshipToGraphPipes: '',
      UpdateGraphRelationshipPipes: '',
      UpsertGraphRelationshipPipes: '',
      AddRelationshipToGraphTypes: '',
      UpdateGraphRelationshipTypes: '',
      UpsertGraphRelationshipTypes: '',
      SchemaAndDataDeleteNodesType: '',
      SchemaAndDataDeleteNodePropsType: '',
      SchemaAndDataUpdateNameOfNodesType: '',
      SchemaAndDataUpdateNameOfNodePropsType: '',
    }
  }


  if (isObjPopulated(schema?.nodes)) {
    typedefs.Nodes += '/** Nodes: (from schema)'
    typedefs.mutate.AddNodeToGraphTypes += '\n\n\n/** Mutate: Insert node (from schema)'
    typedefs.mutate.UpdateGraphNodeTypes += '\n\n\n/** Mutate: Update node (from schema)'
    typedefs.mutate.UpsertGraphNodeTypes += '\n\n\n/** Mutate: Upsert node (from schema)'

    for (const schemaNodeName in schema?.nodes) {
      typedefs.query.NodeProps = '' // reset props from previous loop

      typedefs.Nodes += `\n * @typedef { object } ${ schemaNodeName }\n * @property { string } [ uid ]`

      typedefs.query.NodePipes += `${ schemaNodeName }QueryRequestItemNode | `

      typedefs.mutate.AddNodeToGraphPipes += `${ schemaNodeName }MutateRequestItemAddNodeToGraph | `

      typedefs.mutate.UpdateGraphNodePipes += `${ schemaNodeName }MutateRequestItemUpdateGraphNode | `

      typedefs.mutate.UpsertGraphNodePipes += `${ schemaNodeName }MutateRequestItemUpsertGraphNode | `

      typedefs.mutate.UpsertGraphNodePipes += `${ schemaNodeName }MutateRequestItemUpsertGraphNode | `

      typedefs.mutate.SchemaAndDataUpdateNameOfNodesType += `{ nowName: '${ schemaNodeName }', newName: string } | `

      typedefs.mutate.AddNodeToGraphTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemAddNodeToGraph
 * @property { typeof enums.idsAce.AddNodeToGraph } id - Insert Node
 * @property { '${ schemaNodeName}' } node - Insert \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestItemInsertX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestItemInsertX
 * @property { AceMutateRequestOptions } [ $o ] - Mutation insert options
 * @property { string } [ uid ] - If you are setting your own \`uid\`, it must be a unique \`uid\` to all other relationships or nodes in your graph. If you are allowing Ace to set this uid, it must look like this \`_:chris\` - The beginning must have the uid prefix which is \`_:\` and the end must have a unique identifier string, this way you can reuse this uid in other mutations`

      typedefs.mutate.UpdateGraphNodeTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemUpdateGraphNode
 * @property { typeof enums.idsAce.UpdateGraphNode } id - Update Node
 * @property { '${ schemaNodeName }' } node - Update \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestUpdateItemX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestUpdateItemX
 * @property { AceMutateRequestOptions } [ $o ] - Mutation update options
 * @property { string } uid - The node's unique identifier`

      typedefs.mutate.UpsertGraphNodeTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemUpsertGraphNode
 * @property { typeof enums.idsAce.UpsertGraphNode } id - Upsert Node
 * @property { '${ schemaNodeName }' } node - Upsert \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestUpsertItemX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestUpsertItemX
 * @property { AceMutateRequestOptions } [ $o ] - Mutation upsert options
 * @property { string } uid - The node's unique identifier`      

      for (const schemaNodePropName in schema.nodes[schemaNodeName]) {
        const schemaProp = schema.nodes[schemaNodeName][schemaNodePropName]

        typedefs.mutate.SchemaAndDataDeleteNodePropsType += `{ node: '${ schemaNodeName }', prop: '${ schemaNodePropName }' } | `

        typedefs.mutate.SchemaAndDataUpdateNameOfNodePropsType += `{ node: '${ schemaNodeName }', nowName: '${ schemaNodePropName }', newName: string } | `

        switch (schemaProp.id) {
          case 'Prop':
            const dataType = getDataType(schemaProp.x.dataType)
            typedefs.Nodes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] ${ schemaProp.x.description || '' }`
            typedefs.mutate.AddNodeToGraphTypes += `\n * @property { ${ dataType } } ${ schemaProp.x.mustBeDefined ? schemaNodePropName : '[ ' + schemaNodePropName + ' ]'} - Set to a value with a \`${ dataType }\` data type to set the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
            typedefs.mutate.UpdateGraphNodeTypes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] - Set to a value with a \`${ dataType }\` data type to update the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
            typedefs.mutate.UpsertGraphNodeTypes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] - Set to a value with a \`${ dataType }\` data type to upsert the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
            typedefs.query.NodeProps += `\n * @property { AceQueryXPropValue } [ ${ schemaNodePropName } ] - ${ getQueryPropDescription({ propName: schemaNodePropName, nodeName: schemaNodeName, schemaPropDescription: schemaProp.x.description }) }`
            break
          case 'ForwardRelationshipProp':
          case 'ReverseRelationshipProp':
          case 'BidirectionalRelationshipProp':
            const relationshipMapValue = relationshipMap.get(schemaProp.x.relationship) || []

            relationshipMapValue.push({ schemaNodeName, schemaNodePropName, schemaProp })
            relationshipMap.set(schemaProp.x.relationship, relationshipMapValue)

            typedefs.Nodes += `\n * @property { ${ schemaProp.x.node }${ schemaProp.x.has === 'many' ? '[]' : '' } } [ ${ schemaNodePropName } ]`

            let queryProps = ''

            for (const relationshipNodePropName in schema.nodes[schemaProp.x.node]) {
              const rSchemaProp = schema.nodes[schemaProp.x.node][relationshipNodePropName]

              queryProps += rSchemaProp.id === 'Prop' ?
                `\n * @property { AceQueryXPropValue } [ ${ relationshipNodePropName } ] - ${ getQueryPropDescription({ propName: relationshipNodePropName, nodeName: schemaProp.x.node, schemaPropDescription: rSchemaProp.x.description }) }` :
                `\n * @property { boolean | ${ getNodePropXPropName(schemaProp.x.node, relationshipNodePropName) } } [ ${ relationshipNodePropName} ] - ${ getQueryByRelationshipPropDescription(schemaProp.x.node, relationshipNodePropName, rSchemaProp) }`
            }

            if (schema.relationships?.[schemaProp.x.relationship]?.props) {
              const props = schema.relationships?.[schemaProp.x.relationship].props

              for (const relationshipPropName in props) {
                queryProps += `\n * @property { AceQueryXPropValue } [ ${ relationshipPropName} ] - ${getQueryPropDescription({ propName: relationshipPropName, relationshipName: schemaProp.x.relationship, schemaPropDescription: props[relationshipPropName].x.description })}`
              }
            }

            const relationshipPropName = getNodePropXPropName(schemaNodeName, schemaNodePropName)

            typedefs.query.NodeProps += `\n * @property { boolean | ${ relationshipPropName } } [ ${ schemaNodePropName } ] - ${ getQueryByRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`

            if (!typedefs.query.RelationshipPropTypes) typedefs.query.RelationshipPropTypes += '\n\n\n/** Query: Node relationship props (from schema)\n *'

            typedefs.query.RelationshipPropTypes += `
 * @typedef { object } ${ relationshipPropName }
 * @property { AceQueryRequestItemNodeOptions } [ $o ]
 * @property { AceQueryXPropValue } [ _uid ] - ${ getQueryPropDescription({ propName: '_uid', relationshipName: schemaProp.x.relationship })}
 * @property { AceQueryXPropValue } [ uid ] - ${ getQueryPropDescription({ propName: 'uid', nodeName: schemaProp.x.node })}${ queryProps }
 *`
            break
        }
      }

      if (!typedefs.query.Nodes) typedefs.query.Nodes += `\n\n\n/** Query: Node's (from schema)\n`

      typedefs.query.Nodes +=` *
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNode
 * @property { typeof enums.idsAce.QueryByNode } id
 * @property { '${ schemaNodeName }' } node
 * @property { string } prop
 * @property { ${ schemaNodeName }QueryRequestItemNodeX } [ x ]
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNodeX
 * @property { AceQueryXPropValue } [ uid ]
 * @property { AceQueryRequestItemNodeOptions } [ $o ]${ typedefs.query.NodeProps }
`

      typedefs.Nodes += '\n *'
    }
  }


  if (isObjPopulated(schema?.relationships)) {
    typedefs.Relationships += '/** Relationships: (from schema)'
    typedefs.mutate.AddRelationshipToGraphTypes += '\n\n\n/** Mutate: Insert Relationships (from schema):'
    typedefs.mutate.UpdateGraphRelationshipTypes += '\n\n\n/** Mutate: Update Relationships (from schema):'
    typedefs.mutate.UpsertGraphRelationshipTypes += '\n\n\n/** Mutate: Update Relationships (from schema):'

    for (const schemaRelationshipName in schema?.relationships) {
      typedefs.query.RelationshipProps = '' // reset props from previous loop

      typedefs.Relationships += `\n * @typedef { object } ${ schemaRelationshipName }\n * @property { string } [ _uid ]`

      typedefs.query.RelationshipPipes += `${ schemaRelationshipName }QueryRequestItemRelationship | `

      typedefs.mutate.AddRelationshipToGraphPipes += `${ schemaRelationshipName }MutateRequestItemAddRelationshipToGraph | `

      typedefs.mutate.UpdateGraphRelationshipPipes += `${ schemaRelationshipName }MutateRequestItemUpdateGraphRelationship | `

      typedefs.mutate.UpsertGraphRelationshipPipes += `${ schemaRelationshipName }MutateRequestItemUpsertGraphRelationship | `

      const abDescription = `\`a\` and \`b\` are node uids, so for examle if \`a\` is \`_:node1\` and \`b\` is \`_:node2\` then, \`_:node1\` => \`${ schemaRelationshipName }\` => \`_:node2\``

      typedefs.mutate.AddRelationshipToGraphTypes += `\n *
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemAddRelationshipToGraph
 * @property { typeof enums.idsAce.AddRelationshipToGraph } id - Insert Relationship
 * @property { '${ schemaRelationshipName }' } relationship - Insert \`${ schemaRelationshipName }\` relationship
 * @property { ${ schemaRelationshipName }MutateRequestItemAddRelationshipToGraphX } x
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemAddRelationshipToGraphX
 * @property { string } a - ${ abDescription }
 * @property { string } b - ${ abDescription }`
  
      typedefs.mutate.UpdateGraphRelationshipTypes += `\n *
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpdateGraphRelationship
 * @property { typeof enums.idsAce.UpdateGraphRelationship } id - Update Relationship
 * @property { '${ schemaRelationshipName }' } relationship - Update \`${ schemaRelationshipName }\` relationship
 * @property { ${ schemaRelationshipName }MutateRequestItemUpdateGraphRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpdateGraphRelationshipX
 * @property { string } _uid - The relationship _uid you would love to update
 * @property { string } [ a ] - ${ abDescription }
 * @property { string } [ b ] - ${ abDescription }`
  
      typedefs.mutate.UpsertGraphRelationshipTypes += `\n *
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpsertGraphRelationship
 * @property { typeof enums.idsAce.UpsertGraphRelationship } id - Upsert Relationship
 * @property { '${ schemaRelationshipName }' } relationship - Upsert \`${ schemaRelationshipName }\` relationship
 * @property { ${ schemaRelationshipName }MutateRequestItemUpsertGraphRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpsertGraphRelationshipX
 * @property { string } _uid - The relationship _uid you would love to upsert
 * @property { string } [ a ] - ${ abDescription }
 * @property { string } [ b ] - ${ abDescription }`

      if (schema.relationships[schemaRelationshipName]?.props) {
        for (const schemaRelationshipPropName in schema.relationships[schemaRelationshipName].props) {
          const schemaProp = schema.relationships[schemaRelationshipName].props[schemaRelationshipPropName]
          const dataType = getDataType(schemaProp.x.dataType)
          const description = `Set to a ${ dataType } value if you would love to update this relationship property, \`${ schemaRelationshipPropName }\`, in the graph`
          typedefs.Relationships += `\n * @property { ${ dataType } } [ ${ schemaRelationshipPropName } ] ${ schemaProp.x.description || '' }`
          typedefs.query.RelationshipProps += `\n * @property { AceQueryXPropValue } [ ${ schemaRelationshipPropName } ] - ${ getQueryPropDescription({ propName: schemaRelationshipPropName, relationshipName: schemaRelationshipName, schemaPropDescription: schemaProp.x.description }) }`
          typedefs.mutate.AddRelationshipToGraphTypes += `\n * @property { ${ dataType } } ${ schemaProp.x.mustBeDefined ? schemaRelationshipPropName : '[ ' + schemaRelationshipPropName + ' ]' } - ${ description }`
          typedefs.mutate.UpdateGraphRelationshipTypes += `\n * @property { ${ dataType } } ${ '[ ' + schemaRelationshipPropName + ' ]' } - ${ description }`
          typedefs.mutate.UpsertGraphRelationshipTypes += `\n * @property { ${ dataType } } ${ '[ ' + schemaRelationshipPropName + ' ]' } - ${ description }`
        }
      }

      const relationshipMapValue = relationshipMap.get(schemaRelationshipName)

      if (relationshipMapValue) {
        for (const { schemaNodeName, schemaNodePropName, schemaProp } of relationshipMapValue) {
          typedefs.query.RelationshipProps += `\n * @property { boolean | ${ schemaNodeName + DELIMITER + schemaNodePropName + DELIMITER + 'X' } } [ ${ schemaNodePropName } ] - ${ getQueryByRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`
        }
      }


      if (!typedefs.query.Relationships) typedefs.query.Relationships += `\n\n\n/** Query: Relationship's (from schema)\n`

      typedefs.query.Relationships += ` *
 * @typedef { object } ${ schemaRelationshipName }QueryRequestItemRelationship
 * @property { typeof enums.idsAce.QueryByRelationship } id
 * @property { '${ schemaRelationshipName }' } relationship
 * @property { string } prop
 * @property { ${ schemaRelationshipName }QueryRequestItemRelationshipX } [ x ]
 * @typedef { object } ${ schemaRelationshipName }QueryRequestItemRelationshipX
 * @property { AceQueryXPropValue } [ _uid ]
 * @property { AceQueryRequestItemRelationshipOptions } [ $o ]${ typedefs.query.RelationshipProps }
`

      typedefs.Relationships += '\n *'
    }
  }


  if (typedefs.Nodes) typedefs.Nodes += '/\n\n\n'
  if (typedefs.query.Nodes) typedefs.query.Nodes += ' */'
  if (typedefs.Relationships) typedefs.Relationships += '/\n\n\n'
  if (typedefs.query.Relationships) typedefs.query.Relationships += ' */'
  if (typedefs.query.RelationshipPropTypes) typedefs.query.RelationshipPropTypes += '/'
  if (typedefs.mutate.AddNodeToGraphTypes) typedefs.mutate.AddNodeToGraphTypes += '\n */'
  if (typedefs.mutate.UpdateGraphNodeTypes) typedefs.mutate.UpdateGraphNodeTypes += '\n */'
  if (typedefs.mutate.UpsertGraphNodeTypes) typedefs.mutate.UpsertGraphNodeTypes += '\n */'
  if (typedefs.query.NodePipes) typedefs.query.NodePipes = typedefs.query.NodePipes.slice(0, -3)
  if (typedefs.mutate.AddRelationshipToGraphTypes) typedefs.mutate.AddRelationshipToGraphTypes += '\n */'
  if (typedefs.mutate.UpdateGraphRelationshipTypes) typedefs.mutate.UpdateGraphRelationshipTypes += '\n */'
  if (typedefs.mutate.UpsertGraphRelationshipTypes) typedefs.mutate.UpsertGraphRelationshipTypes += '\n */'
  if (typedefs.query.RelationshipPipes) typedefs.query.RelationshipPipes = typedefs.query.RelationshipPipes.slice(0, -3)
  if (typedefs.mutate.AddNodeToGraphPipes) typedefs.mutate.AddNodeToGraphPipes = typedefs.mutate.AddNodeToGraphPipes.slice(0, -3)
  if (typedefs.mutate.UpdateGraphNodePipes) typedefs.mutate.UpdateGraphNodePipes = typedefs.mutate.UpdateGraphNodePipes.slice(0, -3)
  if (typedefs.mutate.UpsertGraphNodePipes) typedefs.mutate.UpsertGraphNodePipes = typedefs.mutate.UpsertGraphNodePipes.slice(0, -3)
  if (typedefs.mutate.AddRelationshipToGraphPipes) typedefs.mutate.AddRelationshipToGraphPipes = typedefs.mutate.AddRelationshipToGraphPipes.slice(0, -3)
  if (typedefs.mutate.UpdateGraphRelationshipPipes) typedefs.mutate.UpdateGraphRelationshipPipes = typedefs.mutate.UpdateGraphRelationshipPipes.slice(0, -3)
  if (typedefs.mutate.UpsertGraphRelationshipPipes) typedefs.mutate.UpsertGraphRelationshipPipes = typedefs.mutate.UpsertGraphRelationshipPipes.slice(0, -3)
  if (typedefs.mutate.SchemaAndDataDeleteNodesType) typedefs.mutate.SchemaAndDataDeleteNodesType = '(' + typedefs.mutate.SchemaAndDataDeleteNodesType.slice(0, -3) + ')'
  if (typedefs.mutate.SchemaAndDataDeleteNodePropsType) typedefs.mutate.SchemaAndDataDeleteNodePropsType = '(' + typedefs.mutate.SchemaAndDataDeleteNodePropsType.slice(0, -3) + ')[]'
  if (typedefs.mutate.SchemaAndDataUpdateNameOfNodesType) typedefs.mutate.SchemaAndDataUpdateNameOfNodesType = '(' + typedefs.mutate.SchemaAndDataUpdateNameOfNodesType.slice(0, -3) + ')[]'
  if (typedefs.mutate.SchemaAndDataUpdateNameOfNodePropsType) typedefs.mutate.SchemaAndDataUpdateNameOfNodePropsType = '(' + typedefs.mutate.SchemaAndDataUpdateNameOfNodePropsType.slice(0, -3) + ')[]'


  typedefs.query.NodeType = plop({
    now: typedefs.query.NodePipes,
    left: ' * @typedef { ',
    right: ' } AceQueryRequestItemNode',
    default: ` * @typedef { object } AceQueryRequestItemNode
 * @property { typeof enums.idsAce.QueryByNode } id
 * @property { string } node
 * @property { string } prop
 * @property { AceQueryRequestItemNodeX } [ x ]`
  })


  typedefs.query.RelationshipType = plop({
    now: typedefs.query.RelationshipPipes,
    left: ' * @typedef { ',
    right: ' } AceQueryRequestItemRelationship',
    default: ` * @typedef { object } AceQueryRequestItemRelationship
 * @property { typeof enums.idsAce.QueryByRelationship } id
 * @property { string } relationship
 * @property { string } prop
 * @property { AceQueryRequestItemRelationshipX } [ x ]`
  })


  typedefs.mutate.AddNodeToGraphType = plop({
    now: typedefs.mutate.AddNodeToGraphPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemAddNodeToGraph',
    default: `\n *\n * @typedef { object } AceMutateRequestItemAddNodeToGraph
 * @property { typeof enums.idsAce.AddNodeToGraph } id
 * @property { string } node
 * @property { { uid?: string, [propName: string]: any, $o?: AceMutateRequestOptions } } x`
  })

  typedefs.mutate.UpdateGraphNodeType = plop({
    now: typedefs.mutate.UpdateGraphNodePipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemUpdateGraphNode',
    default: `\n *\n * @typedef { object } AceMutateRequestItemUpdateGraphNode
 * @property { typeof enums.idsAce.UpdateGraphNode } id
 * @property { string } node
 * @property { { uid: string, [propName: string]: any, $o?: AceMutateRequestOptions } } x`
  })

  typedefs.mutate.UpsertGraphNodeType = plop({
    now: typedefs.mutate.UpsertGraphNodePipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemUpsertGraphNode',
    default: `\n *\n * @typedef { object } AceMutateRequestItemUpsertGraphNode
 * @property { typeof enums.idsAce.UpsertGraphNode } id
 * @property { string } node
 * @property { { uid: string, [propName: string]: any, $o?: AceMutateRequestOptions } } x`
  })

  typedefs.mutate.AddRelationshipToGraphType = plop({
    now: typedefs.mutate.AddRelationshipToGraphPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemAddRelationshipToGraph',
    default: `\n *\n * @typedef { object } AceMutateRequestItemAddRelationshipToGraph
 * @property { typeof enums.idsAce.AddRelationshipToGraph } id
 * @property { string } relationship
 * @property { { a: string, b: string, [propName: string]: any, $o?: AceMutateRequestOptions } } x`
  })

  typedefs.mutate.UpdateGraphRelationshipType = plop({
    now: typedefs.mutate.UpdateGraphRelationshipPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemUpdateGraphRelationship',
    default: `\n *\n * @typedef { object } AceMutateRequestItemUpdateGraphRelationship
 * @property { typeof enums.idsAce.UpdateGraphRelationship } id
 * @property { string } relationship
 * @property { { a: string, b: string, [propName: string]: any, $o?: AceMutateRequestOptions } } x`
  })

  typedefs.mutate.UpsertGraphRelationshipType = plop({
    now: typedefs.mutate.UpsertGraphRelationshipPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemUpsertGraphRelationship',
    default: `\n *\n * @typedef { object } AceMutateRequestItemUpsertGraphRelationship
 * @property { typeof enums.idsAce.UpsertGraphRelationship } id
 * @property { string } relationship
 * @property { { a: string, b: string, [propName: string]: any, $o?: AceMutateRequestOptions } } x`
  })

  return typedefs


  /**
   * Plop (place between left and right) or default
   * @param { { now: string, left: string, right: string, default: string } } options 
   * @returns { string }
   */
  function plop (options) {
    let response = ''
    let now = options.now

    if (!now) response = options.default
    else response = options.left + now + options.right

    return response
  }
}


export function tsConfig () {
  return `{
  "files": [
    "typedefs.js",
    "enums.js"
  ],
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "outDir": "tsc",
    "module": "NodeNext",
    "target": "ES2017"
  }
}`
}


export function tsIndex () {
  return `export * as td from './tsc/typedefs.js'
export * as enums from './tsc/enums.js'
`
}


export function jsIndex () {
  return `export * as td from './typedefs.js'
export * as enums from './enums.js'
`
}

/**
 * @param { string } dataType 
 * @returns { string }
 */
function getDataType (dataType) {
  switch (dataType) {
    case 'hash':
    case 'isoString':
      return 'string'
    default:
      return dataType
  }
}


/**
 * @param { string } nodeName
 * @param { string } propName
 * @returns { string }
 */
function getNodePropXPropName(nodeName, propName) {
  return nodeName + DELIMITER + propName + DELIMITER + 'X'
}


/**
 * @typedef { object } GetPropDescriptionOptions
 * @property { string } propName
 * @property { string } [ nodeName ]
 * @property { string } [ relationshipName ]
 * @property { string } [ schemaPropDescription ]
 *
 * @param { GetPropDescriptionOptions } options 
 * @returns { string }
 */
function getQueryPropDescription (options) {
  return `Set to true to see ${ options.nodeName ? 'node' : 'relationship' } name \`${ options.nodeName ? options.nodeName : options.relationshipName }\` & property name \`${ options.propName }\` in the response. A \`{ alias: string }\` object is also available. ${ options.schemaPropDescription || '' }`
}


/**
 * @param { string } schemaNodeName 
 * @param { string } schemaNodePropName 
 * @param {*} schemaProp 
 * @returns 
 */
function getQueryByRelationshipPropDescription (schemaNodeName, schemaNodePropName, schemaProp) {
  return `Return object to see node name: \`${ schemaNodeName }\` and prop name: \`${ schemaNodePropName }\`, that will provide properties on the \`${ schemaProp.x.node }\` node in the response`
}
