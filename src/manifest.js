#!/usr/bin/env node

import util from 'node:util'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { dataTypes } from './enums/dataTypes.js'
import { pathnames } from './enums/pathnames.js'
import { has } from './enums/has.js'
import { idsMutate } from './enums/idsMutate.js'
import { idsQuery } from './enums/idsQuery.js'
import { idsQueryOptions } from './enums/idsQueryOptions.js'
import { idsSchema } from './enums/idsSchema.js'
import { passportSource } from './enums/passportSource.js'
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
    const queryRequestItemNodeOptions = '(QueryPropertyAsResponse | QueryPropertyAdjacentToResponse | QueryLimit | QuerySort | QuerySumAsProperty | QueryAverageAsProperty | QueryMinAmountAsProperty | QueryMinNodeAsResponse | QueryMaxNodeAsResponse | QueryMinAmountAsResponse | QueryMaxAmountAsResponse | QuerySumAsResponse | QueryAverageAsResponse | QueryMaxAmountAsProperty | QueryCountAsProperty |  QueryCountAsResponse | QueryFind | QueryFilter | QueryFilterGroup | QueryFindGroup | QueryFilterDefined | QueryFilterUndefined | QueryFindDefined | QueryFindByUnique | QueryFindByUid | QueryFindBy_Uid | QueryFilterByUids | QueryFilterBy_Uids | QueryFilterByUniques | QueryFindUndefined | QueryDerivedProperty | QueryAliasProperty)[]'
    const queryRequestItemRelationshipOptions = '(QueryPropertyAsResponse | QueryPropertyAdjacentToResponse | QueryLimit | QuerySort | QuerySumAsProperty | QueryAverageAsProperty | QueryMinAmountAsProperty | QueryMinNodeAsResponse | QueryMaxNodeAsResponse | QueryMinAmountAsResponse | QueryMaxAmountAsResponse | QuerySumAsResponse | QueryAverageAsResponse | QueryMaxAmountAsProperty | QueryCountAsProperty |  QueryCountAsResponse | QueryFind | QueryFilter | QueryFilterGroup | QueryFindGroup | QueryFilterDefined | QueryFilterUndefined | QueryFindDefined |  QueryFindBy_Uid | QueryFilterBy_Uids | QueryFindUndefined | QueryDerivedProperty | QueryAliasProperty)[]'

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
      enumsMap.set('pathnames', pathnames)
      enumsMap.set('has', has)
      enumsMap.set('idsMutate', idsMutate)
      enumsMap.set('idsSchema', idsSchema)
      enumsMap.set('idsQuery', idsQuery)
      enumsMap.set('idsQueryOptions', idsQueryOptions)
      enumsMap.set('passportSource', passportSource)
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
        fs.writeFile(`${ files.dir }/${ files.src }/${ files.jsTypedefs }`, `import * as enums from './${ files.enums }'


/** AceCore
 *
 * @typedef { object } AceCore
 * @property { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @property { string | null } [ token ] - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling \`id: 'Start'\` from \`mutate()\`
 * @property { { [jwkName: string]: string } } [ publicJWKs ]
 * @property { { [jwkName: string]: string } } [ privateJWKs ]
 */


/** AcePassport
 *
 * @typedef { { uid: string, password: string, role?: { uid: string, revokesAcePermissions: { uid: string, action: 'read' | 'write', nodeName?: string, relationshipName?: string, propName?: string, schema?: boolean, allowPropName?: string, allowNewInsert?: boolean }[] } } } AcePassportUser
 */


/** Schema
 *
 * @typedef { { nodes: { [nodeName: string]: SchemaNodeValue }, relationships: { [relationshipName: string]: SchemaRelationshipValue } } } Schema
 * @typedef { { [nodePropName: string]: SchemaProp | SchemaForwardRelationshipProp | SchemaReverseRelationshipProp | SchemaBidirectionalRelationshipProp } } SchemaNodeValue
 *
 * @typedef { SchemaRelationshipValueOneToOne | SchemaRelationshipValueOneToMany | SchemaRelationshipValueManyToMany } SchemaRelationshipValue
 * 
 * @typedef { object } SchemaRelationshipValueOneToOne
 * @property { typeof enums.idsSchema.OneToOne  } id - This is a one to one relationship
 * @property { SchemaRelationshipValueX  } [ x ]
 * 
 * @typedef { object } SchemaRelationshipValueOneToMany
 * @property { typeof enums.idsSchema.OneToMany  } id - This is a one to many relationship
 * @property { SchemaRelationshipValueX  } [ x ]
 * 
 * @typedef { object } SchemaRelationshipValueManyToMany
 * @property { typeof enums.idsSchema.ManyToMany  } id - This is a many to many relationship
 * @property { SchemaRelationshipValueX  } [ x ]
 *
 * @typedef { object } SchemaProp
 * @property { typeof enums.idsSchema.Prop  } id - This is a standard node prop
 * @property { SchemaPropX } x
 *
 * @typedef { object } SchemaRelationshipProp
 * @property { typeof enums.idsSchema.RelationshipProp } id - This is a relationship prop
 * @property { SchemaPropX } x
 *
 * @typedef { object } SchemaForwardRelationshipProp
 * @property { typeof enums.idsSchema.ForwardRelationshipProp } id - A \`Forward\` direction node relationship prop. For example, if the relationship name is \`isFollowing\`, the \`following\` prop is the \`Forward\` prop and the \`followers\` prop is the \`Reverse\` prop
 * @property { SchemaNodeRelationshipX } x
 *
 * @typedef { object } SchemaReverseRelationshipProp
 * @property { typeof enums.idsSchema.ReverseRelationshipProp } id - A \`Reverse\` direction node relationship prop. For example, if the relationship name is \`isFollowing\`, the \`following\` prop is the \`Forward\` prop and the \`followers\` prop is the \`Reverse\` prop
 * @property { SchemaNodeRelationshipX } x
 *
 * @typedef { object } SchemaBidirectionalRelationshipProp
 * @property { typeof enums.idsSchema.BidirectionalRelationshipProp } id - A \`Bidirectional\` node relationship prop. Meaning there is only one prop name and it represents both directions. For example if we a relationship name of \`isFriendsWith\`, the \`friends\` prop is the \`Bidirectional\` prop
 * @property { SchemaNodeRelationshipX } x
 *
 * @typedef { object } SchemaPropX
 * @property { enums.dataTypes } dataType - The data type for this property
 * @property { boolean } [ mustBeDefined ] - Must this schema prop be defined
 * @property { boolean } [ sortIndex ] - Should Ace maintain a sort index for this property. The index will be an array of all this node's uid's in the order they are when all these node's are sorted by this property.
 * @property { boolean } [ uniqueIndex ] - Should Ace maintain a unique index for this property. This way you'll know no nodes in your graph have the same value for this property and a QueryFind will be faster if searching by this property.
 * @property { string } [ description ] - Custom description that Ace will add to other types, example: query / mutation types
 *
 * @typedef { object } SchemaNodeRelationshipX
 * @property { enums.has } has - Does this node have a max of \`one\` of these props or a max of \`many\`
 * @property { string } nodeName - The node name that this prop points to
 * @property { string } relationshipName - Each node prop that is a relationship must also align with a relationship name. This way the relationship can have its own props.
 * @property { boolean } [ mustBeDefined ] - Must each node in the graph, that aligns with this relationship, have this relationship defined
 * @property { string } [ description ] - Custom description that Ace will add to other types, example: query / mutation types
 *
 * @typedef { object } SchemaRelationshipValueX
 * @property { { [propName: string]: SchemaRelationshipProp } } props - Props for this relationship
 */


/** Mutate
 *
 * @typedef { MutateRequestItem | MutateRequestItem[] } MutateRequest
 * @typedef { MutateRequestItemBackup | MutateRequestItemBoot | MutateRequestItemInsert | MutateRequestItemUpdate | MutateRequestItemDataDelete | MutateRequestItemSchemaAndData | MutateRequestItemSchema } MutateRequestItem
 * @typedef { MutateRequestItemStart | MutateRequestItemRestart } MutateRequestItemBoot
 * @typedef { MutateRequestItemInsertNode | MutateRequestItemInsertRelationship } MutateRequestItemInsert
 * @typedef { MutateRequestItemUpdateNode | MutateRequestItemUpdateRelationship } MutateRequestItemUpdate
 * @typedef { MutateRequestItemDataDeleteNodes | MutateRequestItemDataDeleteRelationships | MutateRequestItemDataDeleteNodeProps | MutateRequestItemDataDeleteRelationshipProps } MutateRequestItemDataDelete
 * @typedef { MutateRequestItemSchemaAndDataDeleteNodes } MutateRequestItemSchemaAndData
 * @typedef { MutateRequestItemSchemaAddition } MutateRequestItemSchema
 * 
 * @typedef { object } MutateRequestItemBackup
 * @property { typeof enums.idsMutate.AceBackup } id
 * @property { { backup: string } } x
 *
 * @typedef { object } MutateRequestItemStart
 * @property { typeof enums.idsMutate.Start } id
 *
 * @typedef { object } MutateRequestItemRestart
 * @property { typeof enums.idsMutate.Restart } id${ typedefs.mutate.InsertNodeType }${ typedefs.mutate.InsertRelationshipType }${ typedefs.mutate.UpdateNodeType }${ typedefs.mutate.UpdateRelationshipType }
 * 
 * @typedef { MutateRequestItemUpdateNode & { [relationshipProp: string]: string[] } } MutateRequestItemNodeWithRelationships
 * 
 * @typedef { object } MutateRequestItemDataDeleteNodes
 * @property { typeof enums.idsMutate.DataDeleteNodes } id
 * @property { { uids: string[] } } x
 *
 * @typedef { object } MutateRequestItemDataDeleteRelationships
 * @property { typeof enums.idsMutate.DataDeleteRelationships } id
 * @property { { _uids: string[] } } x
 *
 * @typedef { object } MutateRequestItemDataDeleteNodeProps
 * @property { typeof enums.idsMutate.DataDeleteNodeProps } id
 * @property { { uids: string[], props: string[] } } x
 *
 * @typedef { object } MutateRequestItemDataDeleteRelationshipProps
 * @property { typeof enums.idsMutate.DataDeleteRelationshipProps } id
 * @property { { _uids: string[], props: string[] } } x
 *
 * @typedef { object } MutateRequestItemSchemaAndDataDeleteNodes
 * @property { typeof enums.idsMutate.SchemaAndDataDeleteNodes } id
 * @property { { nodes: ${ typedefs.mutate.SchemaAndDataDeleteNodesType || 'string[]' } } } x
 *
 * @typedef { object } MutateRequestItemSchemaAddition
 * @property { typeof enums.idsMutate.SchemaAddition } id
 * @property { Schema } x
 *
 * @typedef { object } MutateRequestPrivateJWKOption
 * @property { 'PrivateJWK' } id
 * @property { { name: string } } x
 *
 * @typedef { object } MutateResponse
 * @property { { [uid: string]: string } } identity
 * @property { string[] } deleted
 * @property { AceStartResponse } [ start ]
 *
 * @typedef { { [propName: string]: any } } MutateRequestItemInsertRelationshipX
 */${ typedefs.mutate.InsertNodeTypes }${ typedefs.mutate.UpdateNodeTypes }${ typedefs.mutate.InsertRelationshipTypes }${ typedefs.mutate.UpdateRelationshipTypes }


/** Query
 *
 * @typedef { QueryRequestItem | QueryRequestItem[] } QueryRequest
 *
 * @typedef { QueryRequestItemNode | QueryRequestItemRelationship | QueryRequestItemAceBackup | QueryRequestItemAceSchema } QueryRequestItem
 *
${ typedefs.query.NodeType }
 *
${ typedefs.query.RelationshipType }
 *
 * @typedef { { [propertyName: string]: any,   uid?: boolean | QueryAliasProperty,  $options?: QueryRequestItemNodeOptions } } QueryRequestItemNodeX
 * @typedef { { [propertyName: string]: any,   _uid?: boolean | QueryAliasProperty, $options?: QueryRequestItemNodeOptions } } QueryRequestItemRelationshipX
 * @typedef { ${ queryRequestItemNodeOptions } } QueryRequestItemNodeOptions
 * @typedef { ${ queryRequestItemRelationshipOptions } } QueryRequestItemRelationshipOptions
 * 
 * @typedef { object } QueryRequestItemAceSchema
 * @property { typeof enums.idsQuery.AceSchema } id
 * @property { string } property
 *
 * @typedef { object } QueryRequestItemAceBackup
 * @property { typeof enums.idsQuery.AceBackup } id
 * @property { string } property
 *
 * @typedef { Map<enums.idsQueryOptions, (QuerySort | QueryFindByUnique | QueryFindByUid | QueryFindBy_Uid | QueryFilterByUids | QueryFilterBy_Uids | QueryFilterByUniques)> } QueryRequestItemGeneratedXSectionPriorityOptions
 *
 * @typedef { object } QueryRequestItemGeneratedXSection
 * @property { string } xPropName
 * @property { string } propName
 * @property { string } [ aliasPropName ]
 * @property { enums.has } has
 * @property { string } id
 * @property { string } [ relationshipName ]
 * @property { QueryRequestItemNodeX } x
 * @property { boolean } hasOptionsFind
 * @property { boolean } hasValueAsResponse
 * @property { boolean } hasCountOne
 * @property { 'getNodes' | 'getRelationships' } queryType
 * @property { Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>> } sets - Allow us to not have to call Set.has() rather then [].includes()
 * @property { QueryRequestItemGeneratedXSectionPriorityOptions } priorityOptions *
 * 
 * @typedef { { id: typeof enums.idsQueryOptions.Value, x: { value: any } } } QueryValue
 * @typedef { { id: typeof enums.idsQueryOptions.Alias, x: { alias: string } } } QueryAliasProperty
 * @typedef { { id: typeof enums.idsQueryOptions.Limit, x: { skip?: number, count?: number } } } QueryLimit
 * @typedef { { id: typeof enums.idsQueryOptions.Sort, x: { direction: 'asc' | 'dsc', property: string } } } QuerySort
 * @typedef { { id: typeof enums.idsQueryOptions.DerivedGroup, x: { newProperty: string, symbol: enums.queryDerivedSymbol, items: (QueryProperty | QueryValue | QueryDerivedGroup)[] } } } QueryDerivedGroup
 *
 * @typedef { object } QueryFind
 * @property { typeof enums.idsQueryOptions.Find } id
 * @property { QueryFindX } x
 * @typedef { object } QueryFindX
 * @property { enums.queryWhereSymbol } symbol
 * @property { [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } items
 * @property { string } [ publicJWK ]
 *
 * @typedef { object } QueryFilter
 * @property { typeof enums.idsQueryOptions.Filter } id
 * @property { QueryFilterX } x
 * @typedef { object } QueryFilterX
 * @property { enums.queryWhereSymbol } symbol
 * @property { [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } items
 * @property { string } [ publicJWK ]
 *
 * @typedef { object } QueryProperty
 * @property { typeof enums.idsQueryOptions.Property } id - Define a property
 * @property { QueryPropertyX } x
 * @typedef { object } QueryPropertyX
 * @property { string } property - String property name
 * @property { string[] } [ relationships ] - If this property is not on the node, list the relationship properties to get to the desired nodes
 *
 * @typedef { object } QueryFilterGroup
 * @property { typeof enums.idsQueryOptions.FilterGroup } id - Do an (and / or) operand on a group of filters
 * @property { QueryFilterGroupX } x
 * @typedef { object } QueryFilterGroupX
 * @property { enums.queryWhereGroupSymbol } symbol - (And / Or)
 * @property { (QueryFilter | QueryFilterDefined | QueryFilterUndefined | QueryFilterGroup)[] } items - The items you'd love to do an (and / or) operand on
 *
 * @typedef { object } QueryFindGroup
 * @property { typeof enums.idsQueryOptions.FindGroup } id - Do an (and / or) operand on a group of filters
 * @property { QueryFindGroupX } x
 * @typedef { object } QueryFindGroupX
 * @property { enums.queryWhereGroupSymbol } symbol - (And / Or)
 * @property { (QueryFind | QueryFindDefined | QueryFindUndefined | QueryFindGroup)[] } items - The items you'd love to do an (and / or) operand on
 *
 * @typedef { object } QueryFindUndefined
 * @property { typeof enums.idsQueryOptions.FindUndefined } id - Loop the items and return the first item that is undefined at a specific property
 * @property { QueryFindUndefinedX } x
 * @typedef { object } QueryFindUndefinedX
 * @property { QueryProperty } property - Loop the items and return the first item that is undefined at this property
 *
 * @typedef { object } QueryFindDefined
 * @property { typeof enums.idsQueryOptions.FindDefined } id - Loop the items and return the first item that is defined at a specific property
 * @property { QueryFindDefinedX } x
 * @typedef { object } QueryFindDefinedX
 * @property { QueryProperty } property - Loop the items and return the first item that is defined at this property
 *
 * @typedef { object } QueryFilterUndefined
 * @property { typeof enums.idsQueryOptions.FilterUndefined } id - Loop the items and only return the items that are undefined at a specific property
 * @property { QueryFilterUndefinedX } x
 * @typedef { object } QueryFilterUndefinedX
 * @property { QueryProperty } property - Loop the items and only return the items that are undefined at this property
 *
 * @typedef { object } QueryFilterDefined
 * @property { typeof enums.idsQueryOptions.FilterDefined } id - Loop the items and only return the items that are defined at a specific property
 * @property { QueryFilterDefinedX } x
 * @typedef { object } QueryFilterDefinedX
 * @property { QueryProperty } property - Loop the items and only return the items that are defined at this property
 *
 * @typedef { object } QueryFilterByUids
 * @property { typeof enums.idsQueryOptions.FilterByUids } id - Recieves an array of uids and returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * @property { QueryFilterByUidsX } x
 * @typedef { object } QueryFilterByUidsX
 * @property { string[] } uids - With this array of uids, returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 *
 * @typedef { object } QueryFilterByUniques
 * @property { typeof enums.idsQueryOptions.FilterByUniques } id - Recieves an array of unique values and returns an array of valid nodes (valid meaning: found in graph via unique index & $options qualifiying)
 * @property { QueryFilterByUniquesX } x
 * @typedef { object } QueryFilterByUniquesX
 * @property { QueryFilterByUniquesXUnique[] } uniques - With this array of unique values, returns an array of valid nodes (valid meaning: found in graph via unique index & $options qualifiying)
 * @typedef { object } QueryFilterByUniquesXUnique
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } property - Find node by this prop that has a unique index
 *
 * @typedef { object } QueryFilterBy_Uids
 * @property { typeof enums.idsQueryOptions.FilterBy_Uids } id - Recieves an array of _uids and returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * @property { QueryFilterBy_UidsX } x
 * @typedef { object } QueryFilterBy_UidsX
 * @property { string[] } _uids - With this array of _uids, returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 *
 * @typedef { object } QueryFindByUnique
 * @property { typeof enums.idsQueryOptions.FindByUnique } id - Find node by a prop that has a unique index
 * @property { QueryFindByUniqueX } x
 * @typedef { object } QueryFindByUniqueX
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } property - Find node by this prop that has a unique index
 *
 * @typedef { object } QueryFindByUid
 * @property { typeof enums.idsQueryOptions.FindByUid } id - Find node by a uid
 * @property { QueryFindByUidX } x
 * @typedef { object } QueryFindByUidX
 * @property { string } uid - Find node by this uid
 *
 * @typedef { object } QueryFindBy_Uid
 * @property { typeof enums.idsQueryOptions.FindBy_Uid } id - Find relationship by a _uid
 * @property { QueryFindBy_UidX } x
 * @typedef { object } QueryFindBy_UidX
 * @property { string } _uid - Find relationship by this _uid
 *
 * @typedef { object } QueryCountAsResponse
 * @property { typeof enums.idsQueryOptions.CountAsResponse } id - Set the count for the number of items in the response as the response
 *
 * @typedef { object } QueryMinAmountAsResponse
 * @property { typeof enums.idsQueryOptions.MinAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { QueryMinAmountAsResponseX } x
 * @typedef { object } QueryMinAmountAsResponseX
 * @property { string } property - Loop the items in the response, find the min amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QueryMaxAmountAsResponse
 * @property { typeof enums.idsQueryOptions.MaxAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { QueryMaxAmountAsResponseX } x
 * @typedef { object } QueryMaxAmountAsResponseX
 * @property { string } property - Loop the items in the response, find the max amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QuerySumAsResponse
 * @property { typeof enums.idsQueryOptions.SumAsResponse } id - Loop the items in the response, calculate the sum of the provided property and set it as the response
 * @property { QuerySumAsResponseX } x
 * @typedef { object } QuerySumAsResponseX
 * @property { string } property - Loop the items in the response, calculate the sum of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QueryAverageAsResponse
 * @property { typeof enums.idsQueryOptions.AverageAsResponse } id - Loop the items in the response, calculate the average of the provided property and set it as the response
 * @property { QueryAverageAsResponseX } x
 * @typedef { object } QueryAverageAsResponseX
 * @property { string } property - Loop the items in the response, calculate the average of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QueryCountAsProperty
 * @property { typeof enums.idsQueryOptions.CountAsProperty } id - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { QueryCountAsPropertyX } x
 * @typedef { object } QueryCountAsPropertyX
 * @property { string } newProperty - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QuerySumAsProperty
 * @property { typeof enums.idsQueryOptions.SumAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { QuerySumAsPropertyX } x
 * @typedef { object } QuerySumAsPropertyX
 * @property { string } computeProperty - Add the sum of the \`computeProperty\` of each node in the response
 * @property { string } newProperty - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryPropertyAsResponse
 * @property { typeof enums.idsQueryOptions.PropertyAsResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { QueryPropertyAsResponseX } x
 * @typedef { object } QueryPropertyAsResponseX
 * @property { string } property - String that is the prop name that you would love to show as the response
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to source. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.slug, the relationships will be \`[ 'role' ]\`, property is \`'slug'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } QueryPropertyAdjacentToResponse
 * @property { typeof enums.idsQueryOptions.PropertyAdjacentToResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { QueryPropertyAdjacentToResponseX } x
 * @typedef { object } QueryPropertyAdjacentToResponseX
 * @property { string } sourceProperty
 * @property { string } adjacentProperty
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to see, as the response. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.slug, the relationships will be \`[ 'role' ]\`, property is \`'slug'\` and in the query I've got \`{ x: { role: { uid: true } } }\`
 *
 * @typedef { object } QueryAverageAsProperty
 * @property { typeof enums.idsQueryOptions.AverageAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { QueryAverageAsPropertyX } x
 * @typedef { object } QueryAverageAsPropertyX
 * @property { string } computeProperty - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response
 * @property { string } newProperty - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryMinAmountAsProperty
 * @property { typeof enums.idsQueryOptions.MinAmountAsProperty } id - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { QueryMinAmountAsPropertyX } x
 * @typedef { object } QueryMinAmountAsPropertyX
 * @property { string } computeProperty - Find the smallest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProperty - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryMaxAmountAsProperty
 * @property { typeof enums.idsQueryOptions.MaxAmountAsProperty } id - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { QueryMaxAmountAsPropertyX } x
 * @typedef { object } QueryMaxAmountAsPropertyX
 * @property { string } computeProperty - Find the largest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProperty - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryMinNodeAsResponse
 * @property { typeof enums.idsQueryOptions.MinNodeAsResponse } id - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { QueryMinNodeAsResponseX } x
 * @typedef { object } QueryMinNodeAsResponseX
 * @property { string } property - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } QueryMaxNodeAsResponse
 * @property { typeof enums.idsQueryOptions.MaxNodeAsResponse } id - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { QueryMaxNodeAsResponseX } x
 * @typedef { object } QueryMaxNodeAsResponseX
 * @property { string } property - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } QueryDerivedProperty
 * @property { typeof enums.idsQueryOptions.DerivedProperty } id - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { QueryDerivedPropertyX } x
 * @typedef { object } QueryDerivedPropertyX
 * @property { string } newProperty - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { enums.queryDerivedSymbol } symbol - Derive a value based on the provided \`symbol\` which include basic math symbols found at \`enums.queryDerivedSymbol\`
 * @property { (QueryProperty | QueryValue | QueryDerivedGroup)[] } items - Collection of items (Value, Property and/or a Derived Group) that will combine based on the \`symbol\`
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { { [key: string]: CryptoKey } } QueryPublicJWKs
 *
 * @typedef { { now: { [k: string]: any }, original: { [k: string]: any } } } QueryResponse
*/${ typedefs.query.Nodes } ${ typedefs.query.Relationships } ${ typedefs.query.RelationshipPropTypes }


/** Cloudflare
 *
 * @typedef { object } CF_Env
 * @property { CF_DO_Namespace } AceGraphDatabase
 *
 * @typedef { object } CF_DO_Namespace
 * @property { (name: string) => string } idFromName
 * @property { (name: string) => CF_DO_Stub } get
 *
 * @typedef { object } CF_DO_Stub
 * @property { (request: Request) => Promise<any> } fetch
 *
 * @typedef { function } CF_DO_StoragePut
 * @param { string | { [k: string]: any }  } keyOrEntries - Is a string if .put(key, value) / Is an object of entries if .put(entries)
 * @param { any  } [ value ] - Defined if .put(key, value) / Undefined if .put(entries)
 * @returns { Promise<any> }
 *
 * @typedef { object } CF_DO_Storage
 * @property { (key: string | string[]) => any } get
 * @property { CF_DO_StoragePut } put
 * @property { (options?: CF_DO_StorageListOptions) => Promise<Map<string, any>> } list - Returns all keys and values associated with the current Durable Object in ascending sorted order based on the keys UTF-8 encodings.
 * @property { (key: string | string[]) => Promise<boolean> } delete
 * @property { (options?: CF_DO_StoragePutDeleteOptions) => Promise<void> } deleteAll
 * @property { (callback: (txn: any) => Promise<void>) => Promise<void> } transaction
 *
 * @typedef { object } CF_DO_StorageListOptions
 * @property { string } [ start ] - Key at which the list results should start, inclusive.
 * @property { string } [ startAfter ] - Key after which the list results should start, exclusive. Cannot be used simultaneously with start.
 * @property { string } [ end ] - Key at which the list results should end, exclusive.
 * @property { string } [ prefix ] - Restricts results to only include key-value pairs whose keys begin with the prefix.
 * @property { boolean } [ reverse ] - If true, return results in descending order instead of the default ascending order.
 * @property { number } [ limit ] - Maximum number of key-value pairs to return.
 *
 * @typedef { object } CF_DO_StoragePutDeleteOptions
 * @property { boolean } allowUnconfirmed
 * @property { boolean } noCache
 *
 * @typedef { object } CF_DO_State
 * @property { CF_DO_Storage } storage
 */


/** AceStart
 *
 * @typedef { object } AceStartResponse
 * @property { string } publicJWK
 * @property { string } privateJWK
 * @property { { [uid: string]: string } } identity
 * @property { AceStartResponseAdmin } admin
 * @typedef { object } AceStartResponseAdmin
 * @property { string } uid
 * @property { string } username
 * @property { string } token
 */


/** AceGraph
 *
 * @typedef { object } AceGraphRelationship
 * @property { string } relationshipName
 * @property { AcGraphRelationshipX } x
 * @typedef { { a: string, b: string, _uid: string, [propName: string]: any } } AcGraphRelationshipX
 */


/** AceBackup
 *
 * @typedef { { [k: string]: any }  } AceBackupResponse
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
      /** @type { Map<string, { schemaNodeName: string, schemaNodePropName: string, schemaProp: any }[]> }> } <relationshipName, ({ schemaNodeName, schemaNodePropName: string, schemaProp: SchemaBidirectionalRelationshipProp } | { schemaNodePropName: string, schemaProp: SchemaForwardRelationshipProp } | { schemaNodePropName: string, schemaProp: SchemaReverseRelationshipPro }p)[]> */
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
 * @property { typeof enums.idsMutate.InsertNode } id - Insert Node
 * @property { '${ schemaNodeName}' } nodeName - Insert \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestItemInsertX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestItemInsertX
 * @property { MutateRequestPrivateJWKOption[] } [ $options ] - Mutation insert options
 * @property { string } uid - If you are setting your own \`uid\`, it must be a unique \`uid\` to all other relationships or nodes in your graph. If you are allowing Ace to set this uid, it must look like this \`_:chris\` - The beginning must have the uid prefix which is \`_:\` and the end must have a unique identifier string, this way you can reuse this uid in other mutations`

          typedefs.mutate.UpdateNodeTypes += `\n *
 * @typedef { object } ${ schemaNodeName }MutateRequestItemUpdateNode
 * @property { typeof enums.idsMutate.UpdateNode } id - Update Node
 * @property { '${ schemaNodeName }' } nodeName - Update \`${ schemaNodeName }\` node
 * @property { ${ schemaNodeName }MutateRequestUpdateItemX } x
 * @typedef { object } ${ schemaNodeName }MutateRequestUpdateItemX
 * @property { MutateRequestPrivateJWKOption[] } [ $options ] - Mutation options
 * @property { string } uid - The node's unique identifier`

          for (const schemaNodePropName in schema.nodes[schemaNodeName]) {
            const schemaProp = schema.nodes[schemaNodeName][schemaNodePropName]

            switch (schemaProp.id) {
              case 'Prop':
                const dataType = getDataType(schemaProp.x.dataType)
                typedefs.mutate.InsertNodeTypes += `\n * @property { ${dataType} } ${schemaProp.x.mustBeDefined ? schemaNodePropName : '[ ' + schemaNodePropName + ' ]'} - Set to a value with a \`${dataType}\` data type to set the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
                typedefs.mutate.UpdateNodeTypes += `\n * @property { ${ dataType } } [ ${ schemaNodePropName } ] - Set to a value with a \`${ dataType }\` data type to update the current \`${ schemaNodePropName }\` property in the graph for this node (\`${ schemaNodeName }\`). ${ schemaProp.x.description || '' }`
                typedefs.query.NodeProps += `\n * @property { boolean | QueryAliasProperty } [ ${ schemaNodePropName } ] - ${ getQueryPropDescription({ propName: schemaNodePropName, nodeName: schemaNodeName, schemaPropDescription: schemaProp.x.description }) }`
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
                    `\n * @property { boolean | QueryAliasProperty } [ ${ relationshipNodePropName } ] - ${ getQueryPropDescription({ propName: relationshipNodePropName, nodeName: schemaProp.x.nodeName, schemaPropDescription: rSchemaProp.x.description }) }` :
                    `\n * @property { ${ getNodePropXPropName(schemaProp.x.nodeName, relationshipNodePropName)} } [ ${ relationshipNodePropName} ] - ${ getQueryRelationshipPropDescription(schemaProp.x.nodeName, relationshipNodePropName, rSchemaProp) }`
                }

                if (schema.relationships?.[schemaProp.x.relationshipName]?.x?.props) {
                  const props = schema.relationships?.[schemaProp.x.relationshipName].x.props

                  for (const relationshipPropName in props) {
                    queryProps += `\n * @property { boolean | QueryAliasProperty } [ ${ relationshipPropName} ] - ${getQueryPropDescription({ propName: relationshipPropName, relationshipName: schemaProp.x.relationshipName, schemaPropDescription: props[relationshipPropName].x.description })}`
                  }
                }

                const relationshipPropName = getNodePropXPropName(schemaNodeName, schemaNodePropName)

                typedefs.query.NodeProps += `\n * @property { ${ relationshipPropName} } [ ${schemaNodePropName} ] - ${ getQueryRelationshipPropDescription(schemaNodeName, schemaNodePropName, schemaProp) }`

                if (!typedefs.query.RelationshipPropTypes) typedefs.query.RelationshipPropTypes += '\n\n\n/** Query: Node relationship props (from schema)\n *'

                typedefs.query.RelationshipPropTypes += `
 * @typedef { object } ${ relationshipPropName }
 * @property { QueryRequestItemNodeOptions } [ $options ]
 * @property { boolean | QueryAliasProperty } [ _uid ] - ${ getQueryPropDescription({ propName: '_uid', relationshipName: schemaProp.x.relationshipName })}
 * @property { boolean | QueryAliasProperty } [ uid ] - ${ getQueryPropDescription({ propName: 'uid', nodeName: schemaProp.x.nodeName })}${ queryProps }
 *`
                break
            }
          }

          if (!typedefs.query.Nodes) typedefs.query.Nodes += `\n\n\n/** Query: Node's (from schema)\n`

          typedefs.query.Nodes +=` *
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNode
 * @property { '${ schemaNodeName }' } id
 * @property { string } property
 * @property { ${ schemaNodeName }QueryRequestItemNodeX } x
 * @typedef { object } ${ schemaNodeName }QueryRequestItemNodeX
 * @property { boolean | QueryAliasProperty } [ uid ]
 * @property { QueryRequestItemNodeOptions } [ $options ]${ typedefs.query.NodeProps }
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
 * @property { typeof enums.idsMutate.InsertRelationship } id - Insert Relationship
 * @property { '${ schemaRelationshipName }' } relationshipName - Insert \`${ schemaRelationshipName }\` relationship
 * @property { ${ schemaRelationshipName }MutateRequestItemInsertRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemInsertRelationshipX
 * @property { string } a - ${ abDescription }
 * @property { string } b - ${ abDescription }`
     
          typedefs.mutate.UpdateRelationshipTypes += `\n *
 * @typedef { object } ${ schemaRelationshipName }MutateRequestItemUpdateRelationship
 * @property { typeof enums.idsMutate.UpdateRelationship } id - Update Relationship
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

              typedefs.query.RelationshipProps += `\n * @property { boolean | QueryAliasProperty } [ ${schemaRelationshipPropName } ] - ${ getQueryPropDescription({ propName: schemaRelationshipPropName, relationshipName: schemaRelationshipName, schemaPropDescription: schemaProp.x.description }) }`
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
 * @property { '${ schemaRelationshipName }' } id
 * @property { string } property
 * @property { ${ schemaRelationshipName }QueryRequestItemRelationshipX } x
 * @typedef { object } ${ schemaRelationshipName }QueryRequestItemRelationshipX
 * @property { boolean | QueryAliasProperty } [ _uid ]
 * @property { QueryRequestItemRelationshipOptions } [ $options ]${ typedefs.query.RelationshipProps }
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
        right: ' } QueryRequestItemNode',
        default: ` * @typedef { object } QueryRequestItemNode
 * @property { string } id
 * @property { string } property
 * @property { QueryRequestItemNodeX } x`
      })


      typedefs.query.RelationshipType = plop({
        now: typedefs.query.RelationshipPipes,
        left: ' * @typedef { ',
        right: ' } QueryRequestItemRelationship',
        default: ` * @typedef { object } QueryRequestItemRelationship
 * @property { string } id
 * @property { string } property
 * @property { QueryRequestItemRelationshipX } x`
      })


      typedefs.mutate.InsertNodeType = plop({
        now: typedefs.mutate.InsertNodePipes,
        left: '\n *\n * @typedef { ',
        right: ' } MutateRequestItemInsertNode',
        default: `\n *\n * @typedef { object } MutateRequestItemInsertNode
 * @property { typeof enums.idsMutate.InsertNode } id
 * @property { string } nodeName
 * @property { { uid: string, [propName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x`
      })

      typedefs.mutate.UpdateNodeType = plop({
        now: typedefs.mutate.UpdateNodePipes,
        left: '\n *\n * @typedef { ',
        right: ' } MutateRequestItemUpdateNode',
        default: `\n *\n * @typedef { object } MutateRequestItemUpdateNode
 * @property { typeof enums.idsMutate.UpdateNode } id
 * @property { string } nodeName
 * @property { { uid: string, [propName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x`
      })

      typedefs.mutate.InsertRelationshipType = plop({
        now: typedefs.mutate.InsertRelationshipPipes,
        left: '\n *\n * @typedef { ',
        right: ' } MutateRequestItemInsertRelationship',
        default: `\n *\n * @typedef { object } MutateRequestItemInsertRelationship
 * @property { typeof enums.idsMutate.InsertRelationship } id
 * @property { string } relationshipName
 * @property { { a: string, b: string, [propName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x`
      })

      typedefs.mutate.UpdateRelationshipType = plop({
        now: typedefs.mutate.UpdateRelationshipPipes,
        left: '\n *\n * @typedef { ',
        right: ' } MutateRequestItemUpdateRelationship',
        default: `\n *\n * @typedef { object } MutateRequestItemUpdateRelationship
 * @property { typeof enums.idsMutate.UpdateRelationship } id
 * @property { string } relationshipName
 * @property { { a: string, b: string, [propName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x`
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
     * Generate the code for .manifest/src/enums.js
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
        const r = await aceFetch({ url: `http://localhost:${ port }` }, '/query', { body: { request: { id: 'AceSchema', property: 'schema' } } })
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
      return `Set to true to see ${ options.nodeName ? 'node' : 'relationship' } name \`${ options.nodeName ? options.nodeName : options.relationshipName }\` & property name \`${ options.propName }\` in the response. A \`QueryAliasProperty\` object is also available. ${ options.schemaPropDescription || '' }`
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
