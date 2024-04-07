#!/usr/bin/env node

import util from 'node:util'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { dataTypes } from './enums/dataTypes.js'
import { has } from './enums/has.js'
import { idsAce } from './enums/idsAce.js'
import { idsQueryOptions } from './enums/idsQueryOptions.js'
import { idsSchema } from './enums/idsSchema.js'
import { passportSource } from './enums/passportSource.js'
import { permissionActions } from './enums/permissionActions.js'
import { queryDerivedSymbol } from './enums/queryDerivedSymbol.js'
import { queryWhereGroupSymbol } from './enums/queryWhereGroupSymbol.js'
import { queryWhereSymbol } from './enums/queryWhereSymbol.js'
import { settings } from './enums/settings.js'
import { sortOptions } from './enums/sortOptions.js'
import { aceFetch } from './aceFetch.js'
import { ACE_NODE_NAMES, DELIMITER } from './variables.js'


/**
 * Read Schema from locally running Ace Graph Database
 * Manifest enums, typedefs and types
 * If schema is defined alter above based on schema
 * If schema is not defined use defaults
 */
(async function manifest () {
  try {
    let schema = /** @type { { nodes: { [propName: string]: any }, relationships?: { [k: string]: any } } | undefined } */ (undefined)
    const enumsMap = /** @type { Map<string, Map<string, string> | Set<string>> } */ (new Map())
    const bashEntries = [...process.argv.entries()]
    const optionValue = bashEntries[2]?.[1]
    const port = Number(optionValue)
    const queryRequestItemNodeOptions = '(AceQueryPropertyAsResponse | AceQueryPropertyAdjacentToResponse | AceQueryLimit | AceQuerySort | AceQuerySumAsProperty | AceQueryAverageAsProperty | AceQueryMinAmountAsProperty | AceQueryMinNodeAsResponse | AceQueryMaxNodeAsResponse | AceQueryMinAmountAsResponse | AceQueryMaxAmountAsResponse | AceQuerySumAsResponse | AceQueryAverageAsResponse | AceQueryMaxAmountAsProperty | AceQueryCountAsProperty |  AceQueryCountAsResponse | AceQueryFind | AceQueryFilter | AceQueryFilterGroup | AceQueryFindGroup | AceQueryFilterDefined | AceQueryFilterUndefined | AceQueryFindDefined | AceQueryFindByUnique | AceQueryFindByUid | AceQueryFindBy_Uid | AceQueryFilterByUids | AceQueryFilterBy_Uids | AceQueryFilterByUniques | AceQueryFindUndefined | AceQueryDerivedProperty | AceQueryAliasProperty)[]'
    const queryRequestItemRelationshipOptions = '(AceQueryPropertyAsResponse | AceQueryPropertyAdjacentToResponse | AceQueryLimit | AceQuerySort | AceQuerySumAsProperty | AceQueryAverageAsProperty | AceQueryMinAmountAsProperty | AceQueryMinNodeAsResponse | AceQueryMaxNodeAsResponse | AceQueryMinAmountAsResponse | AceQueryMaxAmountAsResponse | AceQuerySumAsResponse | AceQueryAverageAsResponse | AceQueryMaxAmountAsProperty | AceQueryCountAsProperty |  AceQueryCountAsResponse | AceQueryFind | AceQueryFilter | AceQueryFilterGroup | AceQueryFindGroup | AceQueryFilterDefined | AceQueryFilterUndefined | AceQueryFindDefined |  AceQueryFindBy_Uid | AceQueryFilterBy_Uids | AceQueryFindUndefined | AceQueryDerivedProperty | AceQueryAliasProperty)[]'

    const files = {
      dir: '.manifest',
      src: 'src',
      dist: 'dist',
      enums: 'enums.js',
      tsIndex: 'index.d.ts',
      jsIndex: 'index.js',
      tsconfig: 'tsconfig.json',
      jsTypedefs: 'typedefs.js',
      tsTypedefs: 'typedefs.d.ts',
      tsTypes: 'index.d.ts',
    }

    if (port) await getSchema() 
    else console.log('😅 Since no port was specified, your local Ace Graph Database was not called, to get an updated schema (helpful for generating schema compliant enums, typedefs and types). To run a local db, pnpm dev and to manifest with a port, pnpm manifest 8787')

    setEnumsMap()
    await initDirectories()
    await manifestTypedefsEnumsAndTsconfig()
    await util.promisify(exec)(`npx tsc -p ${ files.dir }/${ files.src }/${ files.tsconfig }`) // bash: npx tsc to create .manifest/dist and add .ts files into it
    await manifestIndex()

    console.log(`🌟 Manifested enums, typedefs (js) and types (ts)!`)


    /**
     * Add imported enums, schema nodes and schema relationships to the enumsMap
     * @returns { void }
     */
    function setEnumsMap() {
      enumsMap.set('dataTypes', dataTypes)
      enumsMap.set('has', has)
      enumsMap.set('idsAce', idsAce)
      enumsMap.set('idsSchema', idsSchema)
      enumsMap.set('idsQueryOptions', idsQueryOptions)
      enumsMap.set('passportSource', passportSource)
      enumsMap.set('permissionActions', permissionActions)
      enumsMap.set('queryDerivedSymbol', queryDerivedSymbol)
      enumsMap.set('queryWhereGroupSymbol', queryWhereGroupSymbol)
      enumsMap.set('queryWhereSymbol', queryWhereSymbol)
      enumsMap.set('nodeNames', new Set(Object.keys(schema?.nodes || {})))
      enumsMap.set('relationshipNames', new Set(Object.keys(schema?.relationships || {})))
      enumsMap.set('settings', settings)
      enumsMap.set('sortOptions', sortOptions)
    }


    /**
     * Manifet typedefs.js
     * Manifest enums.js
     * Manifest tsconfig.json
     */
    async function manifestTypedefsEnumsAndTsconfig () {
      const typedefs = getSchemaTypedefs()


      return Promise.all([
        fs.writeFile(`${files.dir}/${files.src}/${files.jsTypedefs}`, `import * as enums from './${ files.enums }'


/** AceGraph
 *
 * @typedef { object } AceGraphRelationship
 * @property { string } relationshipName
 * @property { AcGraphRelationshipX } x
 * @typedef { { a: string, b: string, _uid: string, [propName: string]: any } } AcGraphRelationshipX
 * 
 * @typedef { object } AceGraphPermission
 * @property { string } uid
 * @property { enums.permissionActions } action
 * @property { boolean } [ schema ]
 * @property { string } [ nodeName ]
 * @property { string } [ relationshipName ]
 * @property { string } [ propName ]
 * @property { string } [ allowPropName ]
 */


/** AceError
 *
 * @typedef { { id: string, detail: string, [errorItemKey: string]: any} } AceError
 * @typedef { { nodeName?: string, relationshipName?: string, propName?: string, schema?: boolean } } AceAuthErrorOptions
 */


/** AceFn
 *
 * @typedef { object } AceFn
 * @property { AceFnOptions } options
 * @property { AceFnRequest } request
 *
 * @typedef { object } AceFnOptions
 * @property { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling \`id: 'Start'\` from \`mutate()\`
 * @property { { [jwkName: string]: string } } [ publicJWKs ]
 * @property { { [jwkName: string]: string } } [ privateJWKs ]
 *
 * @typedef { AceMutateRequestItem | AceQueryRequestItem | (AceMutateRequestItem | AceQueryRequestItem)[] } AceFnRequest
 *
 * @typedef { { now: { [k: string]: any }, original: { [k: string]: any } } } AceFnFullResponse
 *
 * @typedef { { [key: string]: CryptoKey } } AceFnJWKs
 *
 * @typedef { { success: true } } AceFnEmptyResponse
 *
 * @typedef { { [prop: string]: any, $ace: { newUids: { [uid: string]: string }, deletedKeys: string[] } } } AceFnResponse
 *
 * @typedef { Map<string, string> } AceFnNewUids - As we find uids with a REQUEST_UID_PREFIX we will add the REQUEST_UID_PREFIX as the key and it's crypto Ace Graph Database uid as the value.
 * @typedef { Map<string, string[]> } AceFnNodeUidsMap - <nodeName, uids> Uids of specific nodes in graph
 * @typedef { { nodes: any, relationships: any } } AceFnUpdateRequestItems - If updating we store the orignal items here, based on the uid (nodes) or _uid (relationships)
 * @typedef { Map<string, { nodeName: string, nodePropName: string, uids: string[] }> } AceFnSortIndexMap - As we find properties that according to the schema need a sort index insert we will keep track of them here. Once we get them all together, we sort them, and then add to graph.
 */


/** AcePassport
 *
 * @typedef { object } AcePassport
 * @property { AceCache } cache
 * @property { enums.passportSource } source - The source function that created this passport
 * @property { AcePassportUser } user
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
 * @property { AceCache } [ cache ]
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
 * @property { string } nodeName - The node name that this prop points to
 * @property { string } relationshipName - Each node prop that is a relationship must also align with a relationship name. This way the relationship can have its own props.
 * @property { boolean } [ mustBeDefined ] - Must each node in the graph, that aligns with this relationship, have this relationship defined
 * @property { string } [ description ] - Custom description that Ace will add to other types, example: query / mutation types
 *
 * @typedef { object } AceSchemaRelationshipValueX
 * @property { { [propName: string]: AceSchemaRelationshipProp } } props - Props for this relationship
 */


/** AceMutate
 *
 * @typedef { AceMutateRequestItem | AceMutateRequestItem[] } AceMutateRequest
 * @typedef { AceMutateRequestItemBackup | AceMutateRequestItemBoot | AceMutateRequestItemInsert | AceMutateRequestItemUpdate | AceMutateRequestItemDataDelete | AceMutateRequestItemSchemaAndData | AceMutateRequestItemSchema } AceMutateRequestItem
 * @typedef { AceMutateRequestItemEmpty | AceMutateRequestItemCore } AceMutateRequestItemBoot
 * @typedef { AceMutateRequestItemInsertNode | AceMutateRequestItemInsertRelationship } AceMutateRequestItemInsert
 * @typedef { AceMutateRequestItemUpdateNode | AceMutateRequestItemUpdateRelationship } AceMutateRequestItemUpdate
 * @typedef { AceMutateRequestItemDataDeleteNodes | AceMutateRequestItemDataDeleteRelationships | AceMutateRequestItemDataDeleteNodeProps | AceMutateRequestItemDataDeleteRelationshipProps } AceMutateRequestItemDataDelete
 * @typedef { AceMutateRequestItemSchemaAndDataDeleteNodes } AceMutateRequestItemSchemaAndData
 * @typedef { AceMutateRequestItemSchemaAdd } AceMutateRequestItemSchema
 * 
 * @typedef { object } AceMutateRequestItemBackup
 * @property { typeof enums.idsAce.BackupSave } id
 * @property { { backup: string } } x
 *
 * @typedef { object } AceMutateRequestItemEmpty
 * @property { typeof enums.idsAce.Empty } id
 * @property { string } [ property ]
 *
 * @typedef { object } AceMutateRequestItemCore
 * @property { typeof enums.idsAce.Core } id
 * @property { string } [ property ]${ typedefs.mutate.InsertNodeType }${ typedefs.mutate.InsertRelationshipType }${ typedefs.mutate.UpdateNodeType }${ typedefs.mutate.UpdateRelationshipType }
 * 
 * @typedef { AceMutateRequestItemUpdateNode & { [relationshipProp: string]: string[] } } AceMutateRequestItemNodeWithRelationships
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
 * @typedef { object } AceMutateRequestItemSchemaAdd
 * @property { typeof enums.idsAce.SchemaAdd } id
 * @property { string } property
 * @property { AceSchema } x
 *
 * @typedef { object } AceMutateRequestPrivateJWKOption
 * @property { 'PrivateJWK' } id
 * @property { { name: string } } x
 *
 * @typedef { { [propName: string]: any } } AceMutateRequestItemInsertRelationshipX
 */${ typedefs.mutate.InsertNodeTypes }${ typedefs.mutate.UpdateNodeTypes }${ typedefs.mutate.InsertRelationshipTypes }${ typedefs.mutate.UpdateRelationshipTypes }


/** AceQuery
 *
 * @typedef { AceQueryRequestItem | AceQueryRequestItem[] } AceQueryRequest
 *
 * @typedef { AceQueryRequestItemNode | AceQueryRequestItemRelationship | AceQueryRequestItemAceBackup | AceQueryRequestItemAceSchema } AceQueryRequestItem
 *
${ typedefs.query.NodeType }
 *
${ typedefs.query.RelationshipType }
 *
 * @typedef { { [propertyName: string]: any,   uid?: boolean | AceQueryAliasProperty,  $options?: AceQueryRequestItemNodeOptions } } AceQueryRequestItemNodeX
 * @typedef { { [propertyName: string]: any,   _uid?: boolean | AceQueryAliasProperty, $options?: AceQueryRequestItemNodeOptions } } AceQueryRequestItemRelationshipX
 * @typedef { ${ queryRequestItemNodeOptions } } AceQueryRequestItemNodeOptions
 * @typedef { ${ queryRequestItemRelationshipOptions } } AceQueryRequestItemRelationshipOptions
 * 
 * @typedef { object } AceQueryRequestItemAceSchema
 * @property { typeof enums.idsAce.SchemaGet } id
 * @property { string } property
 *
 * @typedef { object } AceQueryRequestItemAceBackup
 * @property { typeof enums.idsAce.BackupGet } id
 * @property { string } property
 *
 * @typedef { Map<enums.idsQueryOptions, (AceQuerySort | AceQueryFindByUnique | AceQueryFindByUid | AceQueryFindBy_Uid | AceQueryFilterByUids | AceQueryFilterBy_Uids | AceQueryFilterByUniques)> } AceQueryRequestItemGeneratedXSectionPriorityOptions
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
 * @property { boolean } hasOptionsFind
 * @property { boolean } hasValueAsResponse
 * @property { boolean } hasCountOne
 * @property { Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>> } sets - Allow us to not have to call Set.has() rather then [].includes()
 * @property { AceQueryRequestItemGeneratedXSectionPriorityOptions } priorityOptions *
 * 
 * @typedef { { id: typeof enums.idsQueryOptions.Value, x: { value: any } } } AceQueryValue
 * @typedef { { id: typeof enums.idsQueryOptions.Alias, x: { alias: string } } } AceQueryAliasProperty
 * @typedef { { id: typeof enums.idsQueryOptions.Limit, x: { skip?: number, count?: number } } } AceQueryLimit
 * @typedef { { id: typeof enums.idsQueryOptions.Sort, x: { direction: 'asc' | 'dsc', property: string } } } AceQuerySort
 * @typedef { { id: typeof enums.idsQueryOptions.DerivedGroup, x: { newProperty: string, symbol: enums.queryDerivedSymbol, items: (AceQueryProperty | AceQueryValue | AceQueryDerivedGroup)[] } } } AceQueryDerivedGroup
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
 * @property { typeof enums.idsQueryOptions.FilterByUids } id - Recieves an array of uids and returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * @property { AceQueryFilterByUidsX } x
 * @typedef { object } AceQueryFilterByUidsX
 * @property { string[] } uids - With this array of uids, returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 *
 * @typedef { object } AceQueryFilterByUniques
 * @property { typeof enums.idsQueryOptions.FilterByUniques } id - Recieves an array of unique values and returns an array of valid nodes (valid meaning: found in graph via unique index & $options qualifiying)
 * @property { AceQueryFilterByUniquesX } x
 * @typedef { object } AceQueryFilterByUniquesX
 * @property { AceQueryFilterByUniquesXUnique[] } uniques - With this array of unique values, returns an array of valid nodes (valid meaning: found in graph via unique index & $options qualifiying)
 * @typedef { object } AceQueryFilterByUniquesXUnique
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } property - Find node by this prop that has a unique index
 *
 * @typedef { object } AceQueryFilterBy_Uids
 * @property { typeof enums.idsQueryOptions.FilterBy_Uids } id - Recieves an array of _uids and returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * @property { AceQueryFilterBy_UidsX } x
 * @typedef { object } AceQueryFilterBy_UidsX
 * @property { string[] } _uids - With this array of _uids, returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 *
 * @typedef { object } AceQueryFindByUnique
 * @property { typeof enums.idsQueryOptions.FindByUnique } id - Find node by a prop that has a unique index
 * @property { AceQueryFindByUniqueX } x
 * @typedef { object } AceQueryFindByUniqueX
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } property - Find node by this prop that has a unique index
 *
 * @typedef { object } AceQueryFindByUid
 * @property { typeof enums.idsQueryOptions.FindByUid } id - Find node by a uid
 * @property { AceQueryFindByUidX } x
 * @typedef { object } AceQueryFindByUidX
 * @property { string } uid - Find node by this uid
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
 * @property { string } property - Loop the items in the response, find the min amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQueryMaxAmountAsResponse
 * @property { typeof enums.idsQueryOptions.MaxAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { AceQueryMaxAmountAsResponseX } x
 * @typedef { object } AceQueryMaxAmountAsResponseX
 * @property { string } property - Loop the items in the response, find the max amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQuerySumAsResponse
 * @property { typeof enums.idsQueryOptions.SumAsResponse } id - Loop the items in the response, calculate the sum of the provided property and set it as the response
 * @property { AceQuerySumAsResponseX } x
 * @typedef { object } AceQuerySumAsResponseX
 * @property { string } property - Loop the items in the response, calculate the sum of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQueryAverageAsResponse
 * @property { typeof enums.idsQueryOptions.AverageAsResponse } id - Loop the items in the response, calculate the average of the provided property and set it as the response
 * @property { AceQueryAverageAsResponseX } x
 * @typedef { object } AceQueryAverageAsResponseX
 * @property { string } property - Loop the items in the response, calculate the average of this property, amongst all response items and set it as the response
 *
 * @typedef { object } AceQueryCountAsProperty
 * @property { typeof enums.idsQueryOptions.CountAsProperty } id - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryCountAsPropertyX } x
 * @typedef { object } AceQueryCountAsPropertyX
 * @property { string } newProperty - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } AceQuerySumAsProperty
 * @property { typeof enums.idsQueryOptions.SumAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { AceQuerySumAsPropertyX } x
 * @typedef { object } AceQuerySumAsPropertyX
 * @property { string } computeProperty - Add the sum of the \`computeProperty\` of each node in the response
 * @property { string } newProperty - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } AceQueryPropertyAsResponse
 * @property { typeof enums.idsQueryOptions.PropertyAsResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { AceQueryPropertyAsResponseX } x
 * @typedef { object } AceQueryPropertyAsResponseX
 * @property { string } property - String that is the prop name that you would love to show as the response
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to source. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.enum, the relationships will be \`[ 'role' ]\`, property is \`'enum'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } AceQueryPropertyAdjacentToResponse
 * @property { typeof enums.idsQueryOptions.PropertyAdjacentToResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { AceQueryPropertyAdjacentToResponseX } x
 * @typedef { object } AceQueryPropertyAdjacentToResponseX
 * @property { string } sourceProperty
 * @property { string } adjacentProperty
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to see, as the response. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.enum, the relationships will be \`[ 'role' ]\`, property is \`'enum'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } AceQueryAverageAsProperty
 * @property { typeof enums.idsQueryOptions.AverageAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryAverageAsPropertyX } x
 * @typedef { object } AceQueryAverageAsPropertyX
 * @property { string } computeProperty - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response
 * @property { string } newProperty - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } AceQueryMinAmountAsProperty
 * @property { typeof enums.idsQueryOptions.MinAmountAsProperty } id - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryMinAmountAsPropertyX } x
 * @typedef { object } AceQueryMinAmountAsPropertyX
 * @property { string } computeProperty - Find the smallest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProperty - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } AceQueryMaxAmountAsProperty
 * @property { typeof enums.idsQueryOptions.MaxAmountAsProperty } id - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { AceQueryMaxAmountAsPropertyX } x
 * @typedef { object } AceQueryMaxAmountAsPropertyX
 * @property { string } computeProperty - Find the largest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProperty - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } AceQueryMinNodeAsResponse
 * @property { typeof enums.idsQueryOptions.MinNodeAsResponse } id - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { AceQueryMinNodeAsResponseX } x
 * @typedef { object } AceQueryMinNodeAsResponseX
 * @property { string } property - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } AceQueryMaxNodeAsResponse
 * @property { typeof enums.idsQueryOptions.MaxNodeAsResponse } id - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { AceQueryMaxNodeAsResponseX } x
 * @typedef { object } AceQueryMaxNodeAsResponseX
 * @property { string } property - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } AceQueryDerivedProperty
 * @property { typeof enums.idsQueryOptions.DerivedProperty } id - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { AceQueryDerivedPropertyX } x
 * @typedef { object } AceQueryDerivedPropertyX
 * @property { string } newProperty - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { enums.queryDerivedSymbol } symbol - Derive a value based on the provided \`symbol\` which include basic math symbols found at \`enums.queryDerivedSymbol\`
 * @property { (AceQueryProperty | AceQueryValue | AceQueryDerivedGroup)[] } items - Collection of items (Value, Property and/or a Derived Group) that will combine based on the \`symbol\`
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { { [key: string]: CryptoKey } } AceQueryPublicJWKs
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


/** AceCore
 *
 * @typedef { object } AceCoreResponse
 * @property { { public: string, private: string } } jwks
 * @property { { newUids: { [uid: string]: string } } } $ace
 * @property { AceCoreResponseAdmin } admin
 * @typedef { object } AceCoreResponseAdmin
 * @property { string } uid
 * @property { string } username
 * @property { string } token
 */


/** AceBackup
 *
 * @typedef { { [k: string]: any }  } AceBackupResponse
 */


/** AceCache
 *
 * @typedef { object } AceCache
 * @property { Ace_CF_DO_Storage } storage
 * @property { Map<string, any> } putMap
 * @property { Map<string, any> } getMap
 * @property { Set<string> } deleteSet
 */
`),

        fs.writeFile(`${ files.dir }/${ files.src }/${ files.enums }`, getEnumsCode()),

        fs.writeFile(`${ files.dir }/${ files.src }/${ files.tsconfig }`, `{
  "files": [
    "${ files.jsTypedefs }",
    "${ files.enums }"
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
    "outDir": "../${ files.dist }",
    "module": "NodeNext",
    "target": "ES2017"
  }
}`)
      ])
    }



    function getSchemaTypedefs () {
      /** @type { Map<string, { schemaNodeName: string, schemaNodePropName: string, schemaProp: any }[]> }> } <relationshipName, ({ schemaNodeName, schemaNodePropName: string, schemaProp: AceSchemaBidirectionalRelationshipProp } | { schemaNodePropName: string, schemaProp: AceSchemaForwardRelationshipProp } | { schemaNodePropName: string, schemaProp: SchemaReverseRelationshipPro }p)[]> */
      const relationshipMap = new Map()

      const typedefs = {
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
          InsertNodeType: '',
          UpdateNodeType: '',
          InsertNodePipes: '',
          UpdateNodePipes: '',
          InsertNodeTypes: '',
          UpdateNodeTypes: '',
          InsertRelationshipType: '',
          UpdateRelationshipType: '',
          InsertRelationshipPipes: '',
          UpdateRelationshipPipes: '',
          InsertRelationshipTypes: '',
          UpdateRelationshipTypes: '',
          SchemaAndDataDeleteNodesType: ''
        }
      }


      if (schema?.nodes) {
        typedefs.mutate.InsertNodeTypes += '\n\n\n/** Mutate: Insert node (from schema)'
        typedefs.mutate.UpdateNodeTypes += '\n\n\n/** Mutate: Update node (from schema)'

        for (const schemaNodeName in schema.nodes) {
          typedefs.query.NodeProps = '' // reset props from previous loop

          typedefs.query.NodePipes += `${ schemaNodeName }QueryRequestItemNode | `

          typedefs.mutate.InsertNodePipes += `${ schemaNodeName }MutateRequestItemInsertNode | `

          typedefs.mutate.UpdateNodePipes += `${ schemaNodeName }MutateRequestItemUpdateNode | `

          if (!ACE_NODE_NAMES.has(schemaNodeName)) typedefs.mutate.SchemaAndDataDeleteNodesType += `'${ schemaNodeName }' | `

          typedefs.mutate.InsertNodeTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemInsertNode
 * @property { typeof enums.idsAce.InsertNode } id - Insert Node
 * @property { '${ schemaNodeName}' } nodeName - Insert \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestItemInsertX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestItemInsertX
 * @property { AceMutateRequestPrivateJWKOption[] } [ $options ] - Mutation insert options
 * @property { string } uid - If you are setting your own \`uid\`, it must be a unique \`uid\` to all other relationships or nodes in your graph. If you are allowing Ace to set this uid, it must look like this \`_:chris\` - The beginning must have the uid prefix which is \`_:\` and the end must have a unique identifier string, this way you can reuse this uid in other mutations`

          typedefs.mutate.UpdateNodeTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemUpdateNode
 * @property { typeof enums.idsAce.UpdateNode } id - Update Node
 * @property { '${ schemaNodeName }' } nodeName - Update \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestUpdateItemX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestUpdateItemX
 * @property { AceMutateRequestPrivateJWKOption[] } [ $options ] - Mutation options
 * @property { string } uid - The node's unique identifier`

          for (const schemaNodePropName in schema.nodes[schemaNodeName]) {
            const schemaProp = schema.nodes[schemaNodeName][schemaNodePropName]

            switch (schemaProp.id) {
              case 'Prop':
                const dataType = getDataType(schemaProp.x.dataType)
                typedefs.mutate.InsertNodeTypes += `\n * @property { ${dataType} } ${schemaProp.x.mustBeDefined ? schemaNodePropName : '[ ' + schemaNodePropName + ' ]'} - Set to a value with a \`${dataType}\` data type to set the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
                typedefs.mutate.UpdateNodeTypes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] - Set to a value with a \`${ dataType }\` data type to update the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
                typedefs.query.NodeProps += `\n * @property { boolean | AceQueryAliasProperty } [ ${ schemaNodePropName } ] - ${ getQueryPropDescription({ propName: schemaNodePropName, nodeName: schemaNodeName, schemaPropDescription: schemaProp.x.description }) }`
                break
              case 'ForwardRelationshipProp':
              case 'ReverseRelationshipProp':
              case 'BidirectionalRelationshipProp':
                const relationshipMapValue = relationshipMap.get(schemaProp.x.relationshipName) || []

                relationshipMapValue.push({ schemaNodeName, schemaNodePropName, schemaProp })
                relationshipMap.set(schemaProp.x.relationshipName, relationshipMapValue)

                let queryProps = ''

                for (const relationshipNodePropName in schema.nodes[schemaProp.x.nodeName]) {
                  const rSchemaProp = schema.nodes[schemaProp.x.nodeName][relationshipNodePropName]

                  queryProps += rSchemaProp.id === 'Prop' ?
                    `\n * @property { boolean | AceQueryAliasProperty } [ ${ relationshipNodePropName } ] - ${ getQueryPropDescription({ propName: relationshipNodePropName, nodeName: schemaProp.x.nodeName, schemaPropDescription: rSchemaProp.x.description }) }` :
                    `\n * @property { ${ getNodePropXPropName(schemaProp.x.nodeName, relationshipNodePropName)} } [ ${ relationshipNodePropName} ] - ${ getQueryRelationshipPropDescription(schemaProp.x.nodeName, relationshipNodePropName, rSchemaProp) }`
                }

                if (schema.relationships?.[schemaProp.x.relationshipName]?.x?.props) {
                  const props = schema.relationships?.[schemaProp.x.relationshipName].x.props

                  for (const relationshipPropName in props) {
                    queryProps += `\n * @property { boolean | AceQueryAliasProperty } [ ${ relationshipPropName} ] - ${getQueryPropDescription({ propName: relationshipPropName, relationshipName: schemaProp.x.relationshipName, schemaPropDescription: props[relationshipPropName].x.description })}`
                  }
                }

                const relationshipPropName = getNodePropXPropName(schemaNodeName, schemaNodePropName)

                typedefs.query.NodeProps += `\n * @property { ${ relationshipPropName} } [ ${schemaNodePropName} ] - ${ getQueryRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`

                if (!typedefs.query.RelationshipPropTypes) typedefs.query.RelationshipPropTypes += '\n\n\n/** Query: Node relationship props (from schema)\n *'

                typedefs.query.RelationshipPropTypes += `
 * @typedef { object } ${ relationshipPropName }
 * @property { AceQueryRequestItemNodeOptions } [ $options ]
 * @property { boolean | AceQueryAliasProperty } [ _uid ] - ${ getQueryPropDescription({ propName: '_uid', relationshipName: schemaProp.x.relationshipName })}
 * @property { boolean | AceQueryAliasProperty } [ uid ] - ${ getQueryPropDescription({ propName: 'uid', nodeName: schemaProp.x.nodeName })}${ queryProps }
 *`
                break
            }
          }

          if (!typedefs.query.Nodes) typedefs.query.Nodes += `\n\n\n/** Query: Node's (from schema)\n`

          typedefs.query.Nodes +=` *
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNode
 * @property { typeof enums.idsAce.QueryNode } id
 * @property { '${ schemaNodeName }' } nodeName
 * @property { string } property
 * @property { ${ schemaNodeName }QueryRequestItemNodeX } x
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNodeX
 * @property { boolean | AceQueryAliasProperty } [ uid ]
 * @property { AceQueryRequestItemNodeOptions } [ $options ]${ typedefs.query.NodeProps }
`
        }
      }


      if (schema?.relationships) {
        typedefs.mutate.InsertRelationshipTypes += '\n\n\n/** Mutate: Insert Relationships (from schema):'
        typedefs.mutate.UpdateRelationshipTypes += '\n\n\n/** Mutate: Update Relationships (from schema):'

        for (const schemaRelationshipName in schema.relationships) {
          typedefs.query.RelationshipProps = '' // reset props from previous loop

          typedefs.query.RelationshipPipes += `${ schemaRelationshipName }QueryRequestItemRelationship | `

          typedefs.mutate.InsertRelationshipPipes += `${ schemaRelationshipName }MutateRequestItemInsertRelationship | `

          typedefs.mutate.UpdateRelationshipPipes += `${ schemaRelationshipName }MutateRequestItemUpdateRelationship | `

          typedefs.mutate.UpdateRelationshipType += `${ schemaRelationshipName }MutateRequestItemUpdateRelationship | `

          const abDescription = `\`a\` and \`b\` are node uids, so for examle if \`a\` is \`_:node1\` and \`b\` is \`_:node2\` then, \`_:node1\` => \`${ schemaRelationshipName }\` => \`_:node2\``

          typedefs.mutate.InsertRelationshipTypes += `\n *
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemInsertRelationship
 * @property { typeof enums.idsAce.InsertRelationship } id - Insert Relationship
 * @property { '${ schemaRelationshipName }' } relationshipName - Insert \`${ schemaRelationshipName }\` relationship
 * @property { ${ schemaRelationshipName }MutateRequestItemInsertRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemInsertRelationshipX
 * @property { string } a - ${ abDescription }
 * @property { string } b - ${ abDescription }`
     
          typedefs.mutate.UpdateRelationshipTypes += `\n *
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpdateRelationship
 * @property { typeof enums.idsAce.UpdateRelationship } id - Update Relationship
 * @property { '${ schemaRelationshipName }' } relationshipName - Update \`${ schemaRelationshipName }\` relationship
 * @property { ${ schemaRelationshipName }MutateRequestItemUpdateRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpdateRelationshipX
 * @property { string } _uid - The relationship uid you would love to update
 * @property { string } [ a ] - ${ abDescription }
 * @property { string } [ b ] - ${ abDescription }`

          if (schema.relationships[schemaRelationshipName]?.x?.props) {
            for (const schemaRelationshipPropName in schema.relationships[schemaRelationshipName].x.props) {
              const schemaProp = schema.relationships[schemaRelationshipName].x.props[schemaRelationshipPropName]
              const dataType = getDataType(schemaProp.x.dataType)
              const description = `Set to a ${ dataType } value if you would love to update this relationship property, \`${schemaRelationshipPropName}\`, in the graph`

              typedefs.query.RelationshipProps += `\n * @property { boolean | AceQueryAliasProperty } [ ${schemaRelationshipPropName } ] - ${ getQueryPropDescription({ propName: schemaRelationshipPropName, relationshipName: schemaRelationshipName, schemaPropDescription: schemaProp.x.description }) }`
              typedefs.mutate.InsertRelationshipTypes += `\n * @property { ${dataType} } ${schemaProp.x.mustBeDefined ? schemaRelationshipPropName : '[ ' + schemaRelationshipPropName + ' ]'} - ${description}`
              typedefs.mutate.UpdateRelationshipTypes += `\n * @property { ${ dataType } } ${ '[ ' + schemaRelationshipPropName + ' ]' } - ${ description }`
            }
          }

          const relationshipMapValue = relationshipMap.get(schemaRelationshipName)

          if (relationshipMapValue) {
            for (const { schemaNodeName, schemaNodePropName, schemaProp } of relationshipMapValue) {
              typedefs.query.RelationshipProps += `\n * @property { ${ schemaNodeName + DELIMITER + schemaNodePropName + DELIMITER + 'X' } } [ ${ schemaNodePropName } ] - ${ getQueryRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`
            }
          }


          if (!typedefs.query.Relationships) typedefs.query.Relationships += `\n\n\n/** Query: Relationship's (from schema)\n`

          typedefs.query.Relationships += ` *
 * @typedef { object } ${ schemaRelationshipName }QueryRequestItemRelationship
 * @property { typeof enums.idsAce.QueryRelationship } id
 * @property { '${ schemaRelationshipName }' } relationshipName
 * @property { string } property
 * @property { ${ schemaRelationshipName }QueryRequestItemRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }QueryRequestItemRelationshipX
 * @property { boolean | AceQueryAliasProperty } [ _uid ]
 * @property { AceQueryRequestItemRelationshipOptions } [ $options ]${ typedefs.query.RelationshipProps }
`
        }
      }


      if (typedefs.query.Nodes) typedefs.query.Nodes += ' */'
      if (typedefs.query.Relationships) typedefs.query.Relationships += ' */'
      if (typedefs.query.RelationshipPropTypes) typedefs.query.RelationshipPropTypes += '/'
      if (typedefs.mutate.InsertNodeTypes) typedefs.mutate.InsertNodeTypes += '\n */'
      if (typedefs.mutate.UpdateNodeTypes) typedefs.mutate.UpdateNodeTypes += '\n */'
      if (typedefs.mutate.InsertRelationshipTypes) typedefs.mutate.InsertRelationshipTypes += '\n */'
      if (typedefs.mutate.UpdateRelationshipTypes) typedefs.mutate.UpdateRelationshipTypes += '\n */'
      if (typedefs.query.NodePipes) typedefs.query.NodePipes = typedefs.query.NodePipes.slice(0, -3)
      if (typedefs.mutate.InsertNodePipes) typedefs.mutate.InsertNodePipes = typedefs.mutate.InsertNodePipes.slice(0, -3)
      if (typedefs.mutate.UpdateNodePipes) typedefs.mutate.UpdateNodePipes = typedefs.mutate.UpdateNodePipes.slice(0, -3)
      if (typedefs.query.RelationshipPipes) typedefs.query.RelationshipPipes = typedefs.query.RelationshipPipes.slice(0, -3)
      if (typedefs.mutate.InsertRelationshipPipes) typedefs.mutate.InsertRelationshipPipes = typedefs.mutate.InsertRelationshipPipes.slice(0, -3)
      if (typedefs.mutate.UpdateRelationshipPipes) typedefs.mutate.UpdateRelationshipPipes = typedefs.mutate.UpdateRelationshipPipes.slice(0, -3)
      if (typedefs.mutate.SchemaAndDataDeleteNodesType) typedefs.mutate.SchemaAndDataDeleteNodesType = '(' + typedefs.mutate.SchemaAndDataDeleteNodesType.slice(0, -3) + ')[]'


      typedefs.query.NodeType = plop({
        now: typedefs.query.NodePipes,
        left: ' * @typedef { ',
        right: ' } AceQueryRequestItemNode',
        default: ` * @typedef { object } AceQueryRequestItemNode
 * @property { 'QueryNode' } id
 * @property { string } nodeName
 * @property { string } property
 * @property { AceQueryRequestItemNodeX } x`
      })


      typedefs.query.RelationshipType = plop({
        now: typedefs.query.RelationshipPipes,
        left: ' * @typedef { ',
        right: ' } AceQueryRequestItemRelationship',
        default: ` * @typedef { object } AceQueryRequestItemRelationship
 * @property { typeof enums.idsAce.QueryRelationship } id
 * @property { string } relationshipName
 * @property { string } property
 * @property { AceQueryRequestItemRelationshipX } x`
      })


      typedefs.mutate.InsertNodeType = plop({
        now: typedefs.mutate.InsertNodePipes,
        left: '\n *\n * @typedef { ',
        right: ' } AceMutateRequestItemInsertNode',
        default: `\n *\n * @typedef { object } AceMutateRequestItemInsertNode
 * @property { typeof enums.idsAce.InsertNode } id
 * @property { string } nodeName
 * @property { { uid: string, [propName: string]: any, $options?: AceMutateRequestPrivateJWKOption[] } } x`
      })

      typedefs.mutate.UpdateNodeType = plop({
        now: typedefs.mutate.UpdateNodePipes,
        left: '\n *\n * @typedef { ',
        right: ' } AceMutateRequestItemUpdateNode',
        default: `\n *\n * @typedef { object } AceMutateRequestItemUpdateNode
 * @property { typeof enums.idsAce.UpdateNode } id
 * @property { string } nodeName
 * @property { { uid: string, [propName: string]: any, $options?: AceMutateRequestPrivateJWKOption[] } } x`
      })

      typedefs.mutate.InsertRelationshipType = plop({
        now: typedefs.mutate.InsertRelationshipPipes,
        left: '\n *\n * @typedef { ',
        right: ' } AceMutateRequestItemInsertRelationship',
        default: `\n *\n * @typedef { object } AceMutateRequestItemInsertRelationship
 * @property { typeof enums.idsAce.InsertRelationship } id
 * @property { string } relationshipName
 * @property { { a: string, b: string, [propName: string]: any, $options?: AceMutateRequestPrivateJWKOption[] } } x`
      })

      typedefs.mutate.UpdateRelationshipType = plop({
        now: typedefs.mutate.UpdateRelationshipPipes,
        left: '\n *\n * @typedef { ',
        right: ' } AceMutateRequestItemUpdateRelationship',
        default: `\n *\n * @typedef { object } AceMutateRequestItemUpdateRelationship
 * @property { typeof enums.idsAce.UpdateRelationship } id
 * @property { string } relationshipName
 * @property { { a: string, b: string, [propName: string]: any, $options?: AceMutateRequestPrivateJWKOption[] } } x`
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


    /**
     * Generate the code for .manifest/src/lib/enums.js
     * @returns { string }
     */
    function getEnumsCode () {
      let result = ''

      /**
       * @param { string } enumStr 
       * @param { string } a 
       * @param { string } b 
       */
      const getKeyAndValue = (enumStr, a, b) => {
        if (enumStr === 'dataTypes') return { key: b, value: b }
        else return { key: b, value: a }
      }

      enumsMap.forEach((enumDataStructure, enumStr) => {
        if (!enumDataStructure.size) {
          result += `\n/** @typedef { string } ${ enumStr } */
export const ${ enumStr } =  ''\n\n\n`
        } else {
          result += `/** @typedef {`

          let typedef = ''
          let enumProps = ''

          enumDataStructure.forEach((a, b) => {
            const { key, value } = getKeyAndValue(enumStr, a, b)
            typedef += ` '${ key }' |`
            enumProps += `  ${ key }: /** @type { '${ value }' } */ ('${ value }'),\n`
          })

          result += typedef
          result = result.slice(0, -1) // remove trailing pipe
          result += `} ${ enumStr } */\nexport const ${ enumStr } = {\n`
          result += enumProps
          result += '}\n\n\n'
        }
      })

      return result.trim()
    }


    /**
     * Call local Ace Graph Database to get the most recent schema
     * Allow the fetch to wait 6 seconds on a response before aborting the fetch
     * @returns { Promise<void> }
     */
    async function getSchema () {
      try {
        const r = await aceFetch({ url: `http://localhost:${ port }` }, '/ace', { body: { request: { id: 'SchemaGet', property: 'schema' } } })
        schema = r.schema
      } catch (e) {
        console.log('🔥 Ace Graph Database Fetch Failed, your enums, typedefs and types do not include schema information!', e)
      }
    }


    /**
     * Get directories ready to write files
     * @returns { Promise<void> }
     */
    async function initDirectories () {
      await util.promisify(exec)(`rm -rf ${ files.dir }`) // delete .manifest directory
      await fs.mkdir(files.dir) // create .manifest directory
      await fs.mkdir(`${ files.dir }/${ files.src }`) // create .manifest/src directory
    }


    /**
     * Manifet index.js
     * Manifest index.ts
     * @returns { Promise<[any, any]> }
     */
    async function manifestIndex () {
      return Promise.all([
        fs.writeFile(`${ files.dir }/${ files.dist }/${ files.tsIndex }`, `export * as enums from './enums.d.ts'\nexport * as td from './typedefs.d.ts'`),
        fs.writeFile(`${ files.dir }/${ files.dist }/${ files.jsIndex }`, `export * as enums from './enums.js'\nexport * as td from './typedefs.js'`)
      ])
    }


    /**
     * @param { string } nodeName
     * @param { string } propName
     * @returns { string }
     */
    function getNodePropXPropName (nodeName, propName) {
      return nodeName + DELIMITER + propName + DELIMITER + 'X'
    }


    /**
     * Convert a node data type to an add data data type
     * @param { string } dataType 
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
      return `Set to true to see ${ options.nodeName ? 'node' : 'relationship' } name \`${ options.nodeName ? options.nodeName : options.relationshipName }\` & property name \`${ options.propName }\` in the response. A \`AceQueryAliasProperty\` object is also available. ${ options.schemaPropDescription || '' }`
    }


    /**
     * @param { string } schemaNodeName 
     * @param { string } schemaNodePropName 
     * @param {*} schemaProp 
     * @returns 
     */
    function getQueryRelationshipPropDescription (schemaNodeName, schemaNodePropName, schemaProp) {
      return `Return object to see node name: \`${ schemaNodeName }\` and prop name: \`${ schemaNodePropName }\`, that will provide properties on the \`${ schemaProp.x.nodeName }\` node in the response`
    }
  } catch (error) {
    console.log('error', error)
  }
})()
