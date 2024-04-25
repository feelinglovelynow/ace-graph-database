import { ACE_NODE_NAMES, DELIMITER } from '../variables.js'


/**
 * @param { { nodes: any; relationships: any; } | null } schema
 */
export function typedefs (schema) {
  const typedefs = getSchemaTypedefs(schema)
  const queryRequestItemNodeOptions = '{ flow?: enums.queryOptions[],  alias?: string,  expand?: boolean,  sort?: AceQuerySort,  findByUid?: AceQueryFindByUid,  findBy_Uid?: AceQueryFindBy_Uid,  findByUnique?: AceQueryFindByUnique,  filterByUids?: AceQueryFilterByUids,  filterBy_Uids?: AceQueryFilterBy_Uids,  filterByUniques?: AceQueryFilterByUniques,   countAsProp?: AceQueryCountAsProperty,   sumAsProp?: AceQuerySumAsProperty,  avgAsProp?: AceQueryAverageAsProperty,  minAmtAsProp?: AceQueryMinAmountAsProperty,   maxAmtAsProp?: AceQueryMaxAmountAsProperty,  newProps?: { [propName: string ]: AceQueryDerivedProperty },  propAdjToRes?: AceQueryPropertyAdjacentToResponse,  find?: AceQueryFind,   findByDefined?: AceQueryFindDefined,  findByUndefined?: AceQueryFindUndefined,  filter?: AceQueryFilter,  filterByDefined?: AceQueryFilterDefined,  filterByUndefined?: AceQueryFilterUndefined,  limit?: AceQueryLimit,   propAsRes?: AceQueryPropertyAsResponse,  countAsRes?: AceQueryCountAsResponse,  sumAsRes?: AceQuerySumAsResponse,  avgAsRes?: AceQueryAverageAsResponse,  minAmtAsRes?: AceQueryMinAmountAsResponse,  maxAmtAsRes?: AceQueryMaxAmountAsResponse,  minNodeAsRes?: AceQueryMinNodeAsResponse,  maxNodeAsRes?: AceQueryMaxNodeAsResponse }'
  const queryRequestItemRelationshipOptions = '{ flow?: enums.queryOptions[],  alias?: string,  expand?: boolean,  sort?: AceQuerySort,  findBy_Uid?: AceQueryFindBy_Uid,  filterBy_Uids?: AceQueryFilterBy_Uids,  countAsProp?: AceQueryCountAsProperty,  sumAsProp?: AceQuerySumAsProperty,  avgAsProp?: AceQueryAverageAsProperty,  minAmtAsProp?: AceQueryMinAmountAsProperty,  maxAmtAsProp?: AceQueryMaxAmountAsProperty,  newProps?: { [propName: string ]: AceQueryDerivedProperty },  propAdjToRes?: AceQueryPropertyAdjacentToResponse,  find?: AceQueryFind,   findByDefined?: AceQueryFindDefined,  findByUndefined?: AceQueryFindUndefined,  filter?: AceQueryFilter,  filterByDefined?: AceQueryFilterDefined, filterByUndefined?: AceQueryFilterUndefined,  limit?: AceQueryLimit,  propAsRes?: AceQueryPropertyAsResponse,  countAsRes?: AceQueryCountAsResponse, sumAsRes?: AceQuerySumAsResponse,  avgAsRes?: AceQueryAverageAsResponse,   minAmtAsRes?: AceQueryMinAmountAsResponse,  maxAmtAsRes?: AceQueryMaxAmountAsResponse,   minNodeAsRes?: AceQueryMinNodeAsResponse,  maxNodeAsRes?: AceQueryMaxNodeAsResponse }'

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
 * @property { AceSchemaRelationshipValueX  } [ x ]
 * 
 * @typedef { object } AceSchemaRelationshipValueOneToMany
 * @property { typeof enums.idsSchema.OneToMany  } id - This is a one to many relationship
 * @property { AceSchemaRelationshipValueX  } [ x ]
 * 
 * @typedef { object } AceSchemaRelationshipValueManyToMany
 * @property { typeof enums.idsSchema.ManyToMany  } id - This is a many to many relationship
 * @property { AceSchemaRelationshipValueX  } [ x ]
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
 *
 * @typedef { object } AceSchemaRelationshipValueX
 * @property { { [propName: string]: AceSchemaRelationshipProp } } props - Props for this relationship
 */


/** AceMutate
 *
 * @typedef { AceMutateRequestItemLoadBackup | AceMutateRequestItemPlugin | AceMutateRequestItemEmpty | AceMutateRequestItemInsert | AceMutateRequestItemUpdate | AceMutateRequestItemDataDelete | AceMutateRequestItemSchemaAndData | AceMutateRequestItemAddToSchema } AceMutateRequestItem
 * @typedef { AceMutateRequestItemAddNodeToGraph | AceMutateRequestItemAddRelationshipToGraph } AceMutateRequestItemInsert
 * @typedef { AceMutateRequestItemUpdateGraphNode | AceMutateRequestItemUpdateGraphRelationship } AceMutateRequestItemUpdate
 * @typedef { AceMutateRequestItemDataDeleteNodes | AceMutateRequestItemDataDeleteRelationships | AceMutateRequestItemDataDeleteNodeProps | AceMutateRequestItemDataDeleteRelationshipProps } AceMutateRequestItemDataDelete
 * @typedef { AceMutateRequestItemSchemaAndDataDeleteNodes } AceMutateRequestItemSchemaAndData
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
 * @property { { request: AceFnRequest } } x${ typedefs.mutate.AddNodeToGraphType }${ typedefs.mutate.AddRelationshipToGraphType }${ typedefs.mutate.UpdateGraphNodeType }${ typedefs.mutate.UpdateGraphRelationshipType }
 * 
 * @typedef { AceMutateRequestItemUpdateGraphNode & { [relationshipProp: string]: string[] } } AceMutateRequestItemNodeWithRelationships
 * 
 * @typedef { object } AceMutateRequestItemDataDeleteNodes
 * @property { typeof enums.idsAce.DataDeleteNodes } id
 * @property { { uids: string[] } } x
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
 * @typedef { object } AceMutateRequestItemSchemaAndDataDeleteNodes
 * @property { typeof enums.idsAce.SchemaAndDataDeleteNodes } id
 * @property { { nodes: ${ typedefs.mutate.SchemaAndDataDeleteNodesType || 'string[]' } } } x
 *
 * @typedef { object } AceMutateRequestItemAddToSchema
 * @property { typeof enums.idsAce.AddToSchema } id
 * @property { string } [ prop ]
 * @property { AceMutateRequestItemAddToSchemaX } x
 * @typedef { object } AceMutateRequestItemAddToSchemaX
 * @property { AceSchema } schema
 *
 * @typedef { object } AceMutateRequestPrivateJWKOption
 * @property { 'PrivateJWK' } id
 * @property { { name: string } } x
 *
 * @typedef { { [propName: string]: any } } AceMutateRequestItemAddRelationshipToGraphX
 */${ typedefs.mutate.AddNodeToGraphTypes }${ typedefs.mutate.UpdateGraphNodeTypes }${ typedefs.mutate.AddRelationshipToGraphTypes }${ typedefs.mutate.UpdateGraphRelationshipTypes }


/** AceQuery
 *
 * @typedef { AceQueryRequestItemNode | AceQueryRequestItemRelationship | AceQueryRequestItemGetBackup | AceQueryRequestItemGetSchema } AceQueryRequestItem
 *
 * @typedef { boolean | { alias: string } } AceQueryXPropValue
 * 
${ typedefs.query.NodeType }
 *
${ typedefs.query.RelationshipType }
 *
 * @typedef { { [propertyName: string]: any,   uid?: AceQueryXPropValue,   $o?: AceQueryRequestItemNodeOptions } } AceQueryRequestItemNodeX
 * @typedef { { [propertyName: string]: any,   _uid?: AceQueryXPropValue,  $o?: AceQueryRequestItemNodeOptions } } AceQueryRequestItemRelationshipX
 * @typedef { ${ queryRequestItemNodeOptions } } AceQueryRequestItemNodeOptions
 * @typedef { ${ queryRequestItemRelationshipOptions } } AceQueryRequestItemRelationshipOptions
 * 
 * @typedef { object } AceQueryRequestItemGetSchema
 * @property { typeof enums.idsAce.GetSchema } id
 * @property { string } prop
 *
 * @typedef { object } AceQueryRequestItemGetBackup
 * @property { typeof enums.idsAce.GetBackup } id
 * @property { string } prop
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
 * 
 * @typedef { { id: typeof enums.idsQueryOptions.Value, x: { value: any } } } AceQueryValue
 * @typedef { { id: typeof enums.idsQueryOptions.DerivedGroup, x: { newProperty: string, symbol: enums.queryDerivedSymbol, items: (AceQueryProperty | AceQueryValue | AceQueryDerivedGroup)[] } } } AceQueryDerivedGroup
 *
 * @typedef { object } AceQuerySort
 * @property { enums.sortHow } how
 * @property { string } prop
 * 
 * @typedef { object } AceQueryLimit
 * @property { number } [ skip ]
 * @property { number } [ count ]
 * 
 * @typedef { object } AceQueryFind
 * @property { typeof enums.idsQueryOptions.Find } id
 * @property { AceQueryFindX } x
 * @typedef { object } AceQueryFindX
 * @property { enums.queryWhereSymbol } symbol
 * @property { [ AceQueryProperty, AceQueryProperty ] | [ AceQueryValue, AceQueryProperty ] | [ AceQueryProperty, AceQueryValue ] } items
 * @property { string } [ publicJWK ]
 *
 * @typedef { object } AceQueryFilter
 * @property { typeof enums.idsQueryOptions.Filter } id
 * @property { AceQueryFilterX } x
 * @typedef { object } AceQueryFilterX
 * @property { enums.queryWhereSymbol } symbol
 * @property { [ AceQueryProperty, AceQueryProperty ] | [ AceQueryValue, AceQueryProperty ] | [ AceQueryProperty, AceQueryValue ] } items
 * @property { string } [ publicJWK ]
 *
 * @typedef { object } AceQueryProperty
 * @property { typeof enums.idsQueryOptions.Property } id - Define a property
 * @property { AceQueryPropertyX } x
 * @typedef { object } AceQueryPropertyX
 * @property { string } property - String property name
 * @property { string[] } [ relationships ] - If this property is not on the node, list the relationship properties to get to the desired nodes
 *
 * @typedef { object } AceQueryFilterGroup
 * @property { typeof enums.idsQueryOptions.FilterGroup } id - Do an (and / or) operand on a group of filters
 * @property { AceQueryFilterGroupX } x
 * @typedef { object } AceQueryFilterGroupX
 * @property { enums.queryWhereGroupSymbol } symbol - (And / Or)
 * @property { (AceQueryFilter | AceQueryFilterDefined | AceQueryFilterUndefined | AceQueryFilterGroup)[] } items - The items you'd love to do an (and / or) operand on
 *
 * @typedef { object } AceQueryFindGroup
 * @property { typeof enums.idsQueryOptions.FindGroup } id - Do an (and / or) operand on a group of filters
 * @property { AceQueryFindGroupX } x
 * @typedef { object } AceQueryFindGroupX
 * @property { enums.queryWhereGroupSymbol } symbol - (And / Or)
 * @property { (AceQueryFind | AceQueryFindDefined | AceQueryFindUndefined | AceQueryFindGroup)[] } items - The items you'd love to do an (and / or) operand on
 *
 * @typedef { object } AceQueryFindUndefined
 * @property { typeof enums.idsQueryOptions.FindUndefined } id - Loop the items and return the first item that is undefined at a specific property
 * @property { AceQueryFindUndefinedX } x
 * @typedef { object } AceQueryFindUndefinedX
 * @property { AceQueryProperty } property - Loop the items and return the first item that is undefined at this property
 *
 * @typedef { object } AceQueryFindDefined
 * @property { typeof enums.idsQueryOptions.FindDefined } id - Loop the items and return the first item that is defined at a specific property
 * @property { AceQueryFindDefinedX } x
 * @typedef { object } AceQueryFindDefinedX
 * @property { AceQueryProperty } property - Loop the items and return the first item that is defined at this property
 *
 * @typedef { object } AceQueryFilterUndefined
 * @property { typeof enums.idsQueryOptions.FilterUndefined } id - Loop the items and only return the items that are undefined at a specific property
 * @property { AceQueryFilterUndefinedX } x
 * @typedef { object } AceQueryFilterUndefinedX
 * @property { AceQueryProperty } property - Loop the items and only return the items that are undefined at this property
 *
 * @typedef { object } AceQueryFilterDefined
 * @property { typeof enums.idsQueryOptions.FilterDefined } id - Loop the items and only return the items that are defined at a specific property
 * @property { AceQueryFilterDefinedX } x
 * @typedef { object } AceQueryFilterDefinedX
 * @property { AceQueryProperty } property - Loop the items and only return the items that are defined at this property
 *
 * @typedef { object } AceQueryFilterByUids
 * @property { typeof enums.idsQueryOptions.FilterByUids } id - Recieves an array of uids and returns an array of valid nodes (valid meaning: found in graph & $o qualifiying)
 * @property { AceQueryFilterByUidsX } x
 * @typedef { object } AceQueryFilterByUidsX
 * @property { string[] } uids - With this array of uids, returns an array of valid nodes (valid meaning: found in graph & $o qualifiying)
 *
 * @typedef { object } AceQueryFilterByUniques
 * @property { typeof enums.idsQueryOptions.FilterByUniques } id - Recieves an array of unique values and returns an array of valid nodes (valid meaning: found in graph via unique index & $o qualifiying)
 * @property { AceQueryFilterByUniquesX } x
 * @typedef { object } AceQueryFilterByUniquesX
 * @property { AceQueryFilterByUniquesXUnique[] } uniques - With this array of unique values, returns an array of valid nodes (valid meaning: found in graph via unique index & $o qualifiying)
 * @typedef { object } AceQueryFilterByUniquesXUnique
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } prop - Find node by this prop that has a unique index
 *
 * @typedef { object } AceQueryFilterBy_Uids
 * @property { typeof enums.idsQueryOptions.FilterBy_Uids } id - Recieves an array of _uids and returns an array of valid nodes (valid meaning: found in graph & $o qualifiying)
 * @property { AceQueryFilterBy_UidsX } x
 * @typedef { object } AceQueryFilterBy_UidsX
 * @property { string[] } _uids - With this array of _uids, returns an array of valid nodes (valid meaning: found in graph & $o qualifiying)
 *
 * @typedef { object } AceQueryFindByUnique
 * @property { typeof enums.idsQueryOptions.FindByUnique } id - Find node by a prop that has a unique index
 * @property { AceQueryFindByUniqueX } x
 * @typedef { object } AceQueryFindByUniqueX
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } prop - Find node by this prop that has a unique index
 *
 * @typedef { string } AceQueryFindByUid
 *
 * @typedef { object } AceQueryFindBy_Uid
 * @property { typeof enums.idsQueryOptions.FindBy_Uid } id - Find relationship by a _uid
 * @property { AceQueryFindBy_UidX } x
 * @typedef { object } AceQueryFindBy_UidX
 * @property { string } _uid - Find relationship by this _uid
 *
 * @typedef { object } AceQueryCountAsResponse
 * @property { typeof enums.idsQueryOptions.CountAsResponse } id - Set the count for the number of items in the response as the response
 *
 * @typedef { object } AceQueryMinAmountAsResponse
 * @property { typeof enums.idsQueryOptions.MinAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { AceQueryMinAmountAsResponseX } x
 * @typedef { object } AceQueryMinAmountAsResponseX
 * @property { string } prop - Loop the items in the response, find the min amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQueryMaxAmountAsResponse
 * @property { typeof enums.idsQueryOptions.MaxAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { AceQueryMaxAmountAsResponseX } x
 * @typedef { object } AceQueryMaxAmountAsResponseX
 * @property { string } prop - Loop the items in the response, find the max amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQuerySumAsResponse
 * @property { typeof enums.idsQueryOptions.SumAsResponse } id - Loop the items in the response, calculate the sum of the provided property and set it as the response
 * @property { AceQuerySumAsResponseX } x
 * @typedef { object } AceQuerySumAsResponseX
 * @property { string } prop - Loop the items in the response, calculate the sum of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQueryAverageAsResponse
 * @property { typeof enums.idsQueryOptions.AverageAsResponse } id - Loop the items in the response, calculate the average of the provided property and set it as the response
 * @property { AceQueryAverageAsResponseX } x
 * @typedef { object } AceQueryAverageAsResponseX
 * @property { string } prop - Loop the items in the response, calculate the average of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQueryCountAsProperty
 * @property { typeof enums.idsQueryOptions.CountAsProperty } id - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryCountAsPropertyX } x
 * @typedef { object } AceQueryCountAsPropertyX
 * @property { string } newProp - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $o calculations but not show up in the response
 *
 * @typedef { object } AceQuerySumAsProperty
 * @property { typeof enums.idsQueryOptions.SumAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { AceQuerySumAsPropertyX } x
 * @typedef { object } AceQuerySumAsPropertyX
 * @property { string } computeProp - Add the sum of the \`computeProperty\` of each node in the response
 * @property { string } newProp - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $o calculations but not show up in the response
 *
 * @typedef { object } AceQueryPropertyAsResponse
 * @property { string } prop - String that is the prop name that you would love to show as the response
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to source. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.enum, the relationships will be \`[ 'role' ]\`, property is \`'enum'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } AceQueryPropertyAdjacentToResponse
 * @property { typeof enums.idsQueryOptions.PropertyAdjacentToResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { AceQueryPropertyAdjacentToResponseX } x
 * @typedef { object } AceQueryPropertyAdjacentToResponseX
 * @property { string } sourceProp
 * @property { string } adjacentProp
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to see, as the response. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.enum, the relationships will be \`[ 'role' ]\`, property is \`'enum'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } AceQueryAverageAsProperty
 * @property { typeof enums.idsQueryOptions.AverageAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryAverageAsPropertyX } x
 * @typedef { object } AceQueryAverageAsPropertyX
 * @property { string } computeProp - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response
 * @property { string } newProp - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $o calculations but not show up in the response
 *
 * @typedef { object } AceQueryMinAmountAsProperty
 * @property { typeof enums.idsQueryOptions.MinAmountAsProperty } id - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryMinAmountAsPropertyX } x
 * @typedef { object } AceQueryMinAmountAsPropertyX
 * @property { string } computeProp - Find the smallest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProp - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $o calculations but not show up in the response
 *
 * @typedef { object } AceQueryMaxAmountAsProperty
 * @property { typeof enums.idsQueryOptions.MaxAmountAsProperty } id - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryMaxAmountAsPropertyX } x
 * @typedef { object } AceQueryMaxAmountAsPropertyX
 * @property { string } computeProp - Find the largest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProp - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $o calculations but not show up in the response
 *
 * @typedef { object } AceQueryMinNodeAsResponse
 * @property { typeof enums.idsQueryOptions.MinNodeAsResponse } id - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { AceQueryMinNodeAsResponseX } x
 * @typedef { object } AceQueryMinNodeAsResponseX
 * @property { string } prop - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } AceQueryMaxNodeAsResponse
 * @property { typeof enums.idsQueryOptions.MaxNodeAsResponse } id - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { AceQueryMaxNodeAsResponseX } x
 * @typedef { object } AceQueryMaxNodeAsResponseX
 * @property { string } prop - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } AceQueryDerivedProperty
 * @property { typeof enums.idsQueryOptions.DerivedProperty } id - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { AceQueryDerivedPropertyX } x
 * @typedef { object } AceQueryDerivedPropertyX
 * @property { string } newProp - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { enums.queryDerivedSymbol } symbol - Derive a value based on the provided \`symbol\` which include basic math symbols found at \`enums.queryDerivedSymbol\`
 * @property { (AceQueryProperty | AceQueryValue | AceQueryDerivedGroup)[] } items - Collection of items (Value, Property and/or a Derived Group) that will combine based on the \`symbol\`
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $o calculations but not show up in the response
 *
 * @typedef { { [key: string]: CryptoKey } } AceQueryPublicJWKs
 * 
 * @typedef { { node?: any, relationship?: any, uid?: string } } AceQueryAddPropsItem
 *
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
      AddNodeToGraphPipes: '',
      UpdateGraphNodePipes: '',
      AddNodeToGraphTypes: '',
      UpdateGraphNodeTypes: '',
      AddRelationshipToGraphType: '',
      UpdateGraphRelationshipType: '',
      AddRelationshipToGraphPipes: '',
      UpdateGraphRelationshipPipes: '',
      AddRelationshipToGraphTypes: '',
      UpdateGraphRelationshipTypes: '',
      SchemaAndDataDeleteNodesType: ''
    }
  }


  if (Object.keys(schema?.nodes || {}).length) {
    typedefs.Nodes += '/** Nodes: (from schema)'
    typedefs.mutate.AddNodeToGraphTypes += '\n\n\n/** Mutate: Insert node (from schema)'
    typedefs.mutate.UpdateGraphNodeTypes += '\n\n\n/** Mutate: Update node (from schema)'

    for (const schemaNodeName in schema?.nodes) {
      typedefs.query.NodeProps = '' // reset props from previous loop

      typedefs.Nodes += `\n * @typedef { object } ${ schemaNodeName }\n * @property { string } [ uid ]`

      typedefs.query.NodePipes += `${ schemaNodeName }QueryRequestItemNode | `

      typedefs.mutate.AddNodeToGraphPipes += `${ schemaNodeName }MutateRequestItemAddNodeToGraph | `

      typedefs.mutate.UpdateGraphNodePipes += `${ schemaNodeName }MutateRequestItemUpdateGraphNode | `

      if (!ACE_NODE_NAMES.has(schemaNodeName)) typedefs.mutate.SchemaAndDataDeleteNodesType += `'${ schemaNodeName }' | `

      typedefs.mutate.AddNodeToGraphTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemAddNodeToGraph
 * @property { typeof enums.idsAce.AddNodeToGraph } id - Insert Node
 * @property { '${ schemaNodeName}' } node - Insert \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestItemInsertX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestItemInsertX
 * @property { AceMutateRequestPrivateJWKOption[] } [ $o ] - Mutation insert options
 * @property { string } [ uid ] - If you are setting your own \`uid\`, it must be a unique \`uid\` to all other relationships or nodes in your graph. If you are allowing Ace to set this uid, it must look like this \`_:chris\` - The beginning must have the uid prefix which is \`_:\` and the end must have a unique identifier string, this way you can reuse this uid in other mutations`

      typedefs.mutate.UpdateGraphNodeTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemUpdateGraphNode
 * @property { typeof enums.idsAce.UpdateGraphNode } id - Update Node
 * @property { '${ schemaNodeName }' } node - Update \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestUpdateItemX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestUpdateItemX
 * @property { AceMutateRequestPrivateJWKOption[] } [ $o ] - Mutation update options
 * @property { string } uid - The node's unique identifier`

      for (const schemaNodePropName in schema.nodes[schemaNodeName]) {
        const schemaProp = schema.nodes[schemaNodeName][schemaNodePropName]

        switch (schemaProp.id) {
          case 'Prop':
            const dataType = getDataType(schemaProp.x.dataType)
            typedefs.Nodes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] ${ schemaProp.x.description || '' }`
            typedefs.mutate.AddNodeToGraphTypes += `\n * @property { ${ dataType } } ${ schemaProp.x.mustBeDefined ? schemaNodePropName : '[ ' + schemaNodePropName + ' ]'} - Set to a value with a \`${ dataType }\` data type to set the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
            typedefs.mutate.UpdateGraphNodeTypes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] - Set to a value with a \`${ dataType }\` data type to update the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
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
                `\n * @property { ${ getNodePropXPropName(schemaProp.x.node, relationshipNodePropName)} } [ ${ relationshipNodePropName} ] - ${ getQueryByRelationshipPropDescription(schemaProp.x.node, relationshipNodePropName, rSchemaProp) }`
            }

            if (schema.relationships?.[schemaProp.x.relationship]?.x?.props) {
              const props = schema.relationships?.[schemaProp.x.relationship].x.props

              for (const relationshipPropName in props) {
                queryProps += `\n * @property { AceQueryXPropValue } [ ${ relationshipPropName} ] - ${getQueryPropDescription({ propName: relationshipPropName, relationshipName: schemaProp.x.relationship, schemaPropDescription: props[relationshipPropName].x.description })}`
              }
            }

            const relationshipPropName = getNodePropXPropName(schemaNodeName, schemaNodePropName)

            typedefs.query.NodeProps += `\n * @property { ${ relationshipPropName} } [ ${schemaNodePropName} ] - ${ getQueryByRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`

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
 * @property { ${ schemaNodeName }QueryRequestItemNodeX } x
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNodeX
 * @property { AceQueryXPropValue } [ uid ]
 * @property { AceQueryRequestItemNodeOptions } [ $o ]${ typedefs.query.NodeProps }
`

      typedefs.Nodes += '\n *'
    }
  }


  if (Object.keys(schema?.relationships || {}).length) {
    typedefs.Relationships += '/** Relationships: (from schema)'
    typedefs.mutate.AddRelationshipToGraphTypes += '\n\n\n/** Mutate: Insert Relationships (from schema):'
    typedefs.mutate.UpdateGraphRelationshipTypes += '\n\n\n/** Mutate: Update Relationships (from schema):'

    for (const schemaRelationshipName in schema?.relationships) {
      typedefs.query.RelationshipProps = '' // reset props from previous loop

      typedefs.Relationships += `\n * @typedef { object } ${ schemaRelationshipName }\n * @property { string } [ _uid ]`

      typedefs.query.RelationshipPipes += `${ schemaRelationshipName }QueryRequestItemRelationship | `

      typedefs.mutate.AddRelationshipToGraphPipes += `${ schemaRelationshipName }MutateRequestItemAddRelationshipToGraph | `

      typedefs.mutate.UpdateGraphRelationshipPipes += `${ schemaRelationshipName }MutateRequestItemUpdateGraphRelationship | `

      typedefs.mutate.UpdateGraphRelationshipType += `${ schemaRelationshipName }MutateRequestItemUpdateGraphRelationship | `

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
 * @property { string } _uid - The relationship uid you would love to update
 * @property { string } [ a ] - ${ abDescription }
 * @property { string } [ b ] - ${ abDescription }`

      if (schema.relationships[schemaRelationshipName]?.x?.props) {
        for (const schemaRelationshipPropName in schema.relationships[schemaRelationshipName].x.props) {
          const schemaProp = schema.relationships[schemaRelationshipName].x.props[schemaRelationshipPropName]
          const dataType = getDataType(schemaProp.x.dataType)
          const description = `Set to a ${ dataType } value if you would love to update this relationship property, \`${ schemaRelationshipPropName }\`, in the graph`
          typedefs.Relationships += `\n * @property { ${ dataType } } [ ${ schemaRelationshipPropName } ] ${ schemaProp.x.description || '' }`
          typedefs.query.RelationshipProps += `\n * @property { AceQueryXPropValue } [ ${ schemaRelationshipPropName } ] - ${ getQueryPropDescription({ propName: schemaRelationshipPropName, relationshipName: schemaRelationshipName, schemaPropDescription: schemaProp.x.description }) }`
          typedefs.mutate.AddRelationshipToGraphTypes += `\n * @property { ${ dataType } } ${ schemaProp.x.mustBeDefined ? schemaRelationshipPropName : '[ ' + schemaRelationshipPropName + ' ]' } - ${ description }`
          typedefs.mutate.UpdateGraphRelationshipTypes += `\n * @property { ${ dataType } } ${ '[ ' + schemaRelationshipPropName + ' ]' } - ${ description }`
        }
      }

      const relationshipMapValue = relationshipMap.get(schemaRelationshipName)

      if (relationshipMapValue) {
        for (const { schemaNodeName, schemaNodePropName, schemaProp } of relationshipMapValue) {
          typedefs.query.RelationshipProps += `\n * @property { ${ schemaNodeName + DELIMITER + schemaNodePropName + DELIMITER + 'X' } } [ ${ schemaNodePropName } ] - ${ getQueryByRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`
        }
      }


      if (!typedefs.query.Relationships) typedefs.query.Relationships += `\n\n\n/** Query: Relationship's (from schema)\n`

      typedefs.query.Relationships += ` *
 * @typedef { object } ${ schemaRelationshipName }QueryRequestItemRelationship
 * @property { typeof enums.idsAce.QueryByRelationship } id
 * @property { '${ schemaRelationshipName }' } relationship
 * @property { string } prop
 * @property { ${ schemaRelationshipName }QueryRequestItemRelationshipX } x
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
  if (typedefs.mutate.AddRelationshipToGraphTypes) typedefs.mutate.AddRelationshipToGraphTypes += '\n */'
  if (typedefs.mutate.UpdateGraphRelationshipTypes) typedefs.mutate.UpdateGraphRelationshipTypes += '\n */'
  if (typedefs.query.NodePipes) typedefs.query.NodePipes = typedefs.query.NodePipes.slice(0, -3)
  if (typedefs.mutate.AddNodeToGraphPipes) typedefs.mutate.AddNodeToGraphPipes = typedefs.mutate.AddNodeToGraphPipes.slice(0, -3)
  if (typedefs.mutate.UpdateGraphNodePipes) typedefs.mutate.UpdateGraphNodePipes = typedefs.mutate.UpdateGraphNodePipes.slice(0, -3)
  if (typedefs.query.RelationshipPipes) typedefs.query.RelationshipPipes = typedefs.query.RelationshipPipes.slice(0, -3)
  if (typedefs.mutate.AddRelationshipToGraphPipes) typedefs.mutate.AddRelationshipToGraphPipes = typedefs.mutate.AddRelationshipToGraphPipes.slice(0, -3)
  if (typedefs.mutate.UpdateGraphRelationshipPipes) typedefs.mutate.UpdateGraphRelationshipPipes = typedefs.mutate.UpdateGraphRelationshipPipes.slice(0, -3)
  if (typedefs.mutate.SchemaAndDataDeleteNodesType) typedefs.mutate.SchemaAndDataDeleteNodesType = '(' + typedefs.mutate.SchemaAndDataDeleteNodesType.slice(0, -3) + ')[]'


  typedefs.query.NodeType = plop({
    now: typedefs.query.NodePipes,
    left: ' * @typedef { ',
    right: ' } AceQueryRequestItemNode',
    default: ` * @typedef { object } AceQueryRequestItemNode
 * @property { typeof enums.idsAce.QueryByNode } id
 * @property { string } node
 * @property { string } prop
 * @property { AceQueryRequestItemNodeX } x`
  })


  typedefs.query.RelationshipType = plop({
    now: typedefs.query.RelationshipPipes,
    left: ' * @typedef { ',
    right: ' } AceQueryRequestItemRelationship',
    default: ` * @typedef { object } AceQueryRequestItemRelationship
 * @property { typeof enums.idsAce.QueryByRelationship } id
 * @property { string } relationship
 * @property { string } prop
 * @property { AceQueryRequestItemRelationshipX } x`
  })


  typedefs.mutate.AddNodeToGraphType = plop({
    now: typedefs.mutate.AddNodeToGraphPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemAddNodeToGraph',
    default: `\n *\n * @typedef { object } AceMutateRequestItemAddNodeToGraph
 * @property { typeof enums.idsAce.AddNodeToGraph } id
 * @property { string } node
 * @property { { uid?: string, [propName: string]: any, $o?: AceMutateRequestPrivateJWKOption[] } } x`
  })

  typedefs.mutate.UpdateGraphNodeType = plop({
    now: typedefs.mutate.UpdateGraphNodePipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemUpdateGraphNode',
    default: `\n *\n * @typedef { object } AceMutateRequestItemUpdateGraphNode
 * @property { typeof enums.idsAce.UpdateGraphNode } id
 * @property { string } node
 * @property { { uid: string, [propName: string]: any, $o?: AceMutateRequestPrivateJWKOption[] } } x`
  })

  typedefs.mutate.AddRelationshipToGraphType = plop({
    now: typedefs.mutate.AddRelationshipToGraphPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemAddRelationshipToGraph',
    default: `\n *\n * @typedef { object } AceMutateRequestItemAddRelationshipToGraph
 * @property { typeof enums.idsAce.AddRelationshipToGraph } id
 * @property { string } relationship
 * @property { { a: string, b: string, [propName: string]: any, $o?: AceMutateRequestPrivateJWKOption[] } } x`
  })

  typedefs.mutate.UpdateGraphRelationshipType = plop({
    now: typedefs.mutate.UpdateGraphRelationshipPipes,
    left: '\n *\n * @typedef { ',
    right: ' } AceMutateRequestItemUpdateGraphRelationship',
    default: `\n *\n * @typedef { object } AceMutateRequestItemUpdateGraphRelationship
 * @property { typeof enums.idsAce.UpdateGraphRelationship } id
 * @property { string } relationship
 * @property { { a: string, b: string, [propName: string]: any, $o?: AceMutateRequestPrivateJWKOption[] } } x`
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
