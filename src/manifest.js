#!/usr/bin/env node

import util from 'node:util'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { dataTypes } from './enums/dataTypes.js'
import { endpoints } from './enums/endpoints.js'
import { has } from './enums/has.js'
import { idsDelete } from './enums/idsDelete.js'
import { idsQuery } from './enums/idsQuery.js'
import { idsSchema } from './enums/idsSchema.js'
import { passportSource } from './enums/passportSource.js'
import { passportType } from './enums/passportType.js'
import { queryDerivedSymbol } from './enums/queryDerivedSymbol.js'
import { queryWhereGroupSymbol } from './enums/queryWhereGroupSymbol.js'
import { queryWhereSymbol } from './enums/queryWhereSymbol.js'
import { settings } from './enums/settings.js'
import { sortOptions } from './enums/sortOptions.js'


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
    const queryRequestFormatOptions = '{ (QueryPropertyAsResponse | QueryPropertyAdjacentToResponse | QueryLimit | QuerySort | QuerySumAsProperty | QueryAverageAsProperty | QueryMinAmountAsProperty | QueryMinNodeAsResponse | QueryMaxNodeAsResponse | QueryMinAmountAsResponse | QueryMaxAmountAsResponse | QuerySumAsResponse | QueryAverageAsResponse | QueryMaxAmountAsProperty | QueryCountAsProperty |  QueryCountAsResponse | QueryFind | QueryFilter | QueryFilterGroup | QueryFindGroup | QueryFilterDefined | QueryFilterUndefined | QueryFindDefined | QueryFindByUnique | QueryFindByUid | QueryFindBy_Uid | QueryFilterByUids | QueryFilterBy_Uids | QueryFilterByUniques | QueryFindUndefined | QueryDerivedProperty | QueryAliasProperty)[] }'

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


    /**
     * Call local Ace Graph Database to get the most recent schema
     * Allow the fetch to wait 6 seconds on a response before aborting the fetch
     * @returns { Promise<void> }
     */
    async function getSchema () {
      try {
        const controller = new AbortController()
        const signal = controller.signal
        const requestInit = { method: 'GET', signal: signal, headers: { 'content-type': 'application/json' } }

        setTimeout(() => {
          if (!schema) controller.abort()
        }, 6000)

        const rFetch = await fetch(`http://localhost:${ port }${ endpoints.get('getSchema') }`, requestInit)
        const r = await rFetch.text()
        if (r) schema = JSON.parse(r)
      } catch (e) {
        console.log('🔥 Ace Graph Database Fetch Failed, your enums, typedefs and types do not include schema information!', e)
      }
    }


    /**
     * Add imported enums, schema nodes and schema relationships to the enumsMap
     * @returns { void }
     */
    function setEnumsMap() {
      enumsMap.set('dataTypes', dataTypes)
      enumsMap.set('endpoints', endpoints)
      enumsMap.set('has', has)
      enumsMap.set('idsDelete', idsDelete)
      enumsMap.set('idsSchema', idsSchema)
      enumsMap.set('idsQuery', idsQuery)
      enumsMap.set('passportSource', passportSource)
      enumsMap.set('passportType', passportType)
      enumsMap.set('queryDerivedSymbol', queryDerivedSymbol)
      enumsMap.set('queryWhereGroupSymbol', queryWhereGroupSymbol)
      enumsMap.set('queryWhereSymbol', queryWhereSymbol)
      enumsMap.set('nodeNames', new Set(Object.keys(schema?.nodes || {})))
      enumsMap.set('relationshipNames', new Set(Object.keys(schema?.relationships || {})))
      enumsMap.set('settings', settings)
      enumsMap.set('sortOptions', sortOptions)
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
     * Manifet typedefs.js
     * Manifest enums.js
     * Manifest tsconfig.json
     */
    async function manifestTypedefsEnumsAndTsconfig () {


      return Promise.all([
        fs.writeFile(`${ files.dir }/${ files.src }/${ files.jsTypedefs }`, `import * as enums from './${ files.enums }'


/** PASSPORT
 *
 * @typedef { object } AcePassport
 * @property { CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Graph Database)
 * @property { string | null } token - If AceSetting.enforcePermissions is true, this token must be defined, a token can be created when calling \`/start\`
 * @property { enums.passportType } type - Did this passport request originate external (by an end user) or internal (by Ace)
 * @property { enums.passportSource } source - The source function that created this passport
 * @property { Schema } [ schema ]
 * @property { AcePassportUser } [ user ]
 * @property { boolean } [ isEnforcePermissionsOn ]
 * @property { Map<string, any> } [ revokesAcePermissions ]
 * 
 * @typedef { { uid: string, password: string, role?: { uid: string, revokesAcePermissions: { uid: string, action: string, nodeName?: string, relationshipName?: string, propName?: string, schema?: string, allowPropName?: string, allowNewInsert?: boolean } } } } AcePassportUser
 */


/** SCHEMA
 *
 * @typedef { { nodes: { [nodeName: string]: SchemaNodeValue }, relationships: { [relationshipName: string]: SchemaRelationshipValue } } } Schema
 * @typedef { { [nodePropName: string]: SchemaProp | SchemaForwardRelationshipProp | SchemaReverseRelationshipProp | SchemaBidirectionalRelationshipProp } } SchemaNodeValue
 * 
 * @typedef { SchemaRelationshipValueOneToOne | SchemaRelationshipValueOneToMany | SchemaRelationshipValueManyToMany } SchemaRelationshipValue
 * @typedef { object } SchemaRelationshipValueOneToOne
 * @property { typeof enums.idsSchema.OneToOne  } id - This is a one to one relationship
 * @property { SchemaRelationshipValueX  } [ x ]
 * @typedef { object } SchemaRelationshipValueOneToMany
 * @property { typeof enums.idsSchema.OneToMany  } id - This is a one to many relationship
 * @property { SchemaRelationshipValueX  } [ x ]
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


/** MUTATE
 *
 * @typedef { object } MutateRequest
 * @property { {[jwkName: string]: string } } [ privateJWKs ]
 * @property { MutateRequestInsertItem[] } [ insert ]
 * @property { MutateRequestUpdateItem[] } [ update ]
 * @property { MutateRequestDeleteItem[] } [ delete ]
 *
 * @typedef { object } MutateRequestInsertNodeDefaultItem
 * @property { string } id
 * @property { { [propertyName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x
 *
 * @typedef { object } MutateRequestInsertRelationshipDefaultItem
 * @property { string } id
 * @property { { a: string, b: string, [propertyName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x
 *
 * @typedef { object } MutateRequestUpdateNodeDefaultItem
 * @property { string } id
 * @property { { [propertyName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x
 *
 * @typedef { object } MutateRequestUpdateRelationshipDefaultItem
 * @property { string } id
 * @property { { _uid?: string, a?: string, b?: string, [propertyName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x
 *
 * @typedef { object } MutateRequestPrivateJWKOption
 * @property { 'PrivateJWK' } id
 * @property { { name: string} } x
 *
 * @typedef { MutateRequestDeleteNodesItem | MutateRequestDeleteRelationshipsItem | MutateRequestDeleteNodePropsItem | MutateRequestDeleteRelationshipPropsItem } MutateRequestDeleteItem
 * @typedef { object } MutateRequestDeleteNodesItem
 * @property { typeof enums.idsDelete.Nodes } id
 * @property { MutateRequestDeleteNodesItemX } x
 * @typedef { object } MutateRequestDeleteNodesItemX
 * @property { string[] } uids
 * @typedef { object } MutateRequestDeleteRelationshipsItem
 * @property { typeof enums.idsDelete.Relationships } id
 * @property { MutateRequestDeleteRelationshipsItemX } x
 * @typedef { object } MutateRequestDeleteRelationshipsItemX
 * @property { string[] } _uids
 * @typedef { object } MutateRequestDeleteNodePropsItem
 * @property { typeof enums.idsDelete.NodeProps } id
 * @property { MutateRequestDeleteNodePropsItemX } x
 * @typedef { object } MutateRequestDeleteNodePropsItemX
 * @property { string[] } props
 * @property { string[] } uids
 * @typedef { object } MutateRequestDeleteRelationshipPropsItem
 * @property { typeof enums.idsDelete.RelationshipProps } id
 * @property { MutateRequestDeleteRelationshipPropsItemX } x
 * @typedef { object } MutateRequestDeleteRelationshipPropsItemX
 * @property { string[] } props
 * @property { string[] } _uids
 *
 * @typedef { { identity: { [k: string]: string } } } MutateResponse
 */


/** QUERY
 *
 * @typedef { { id: typeof enums.idsQuery.Value, x: { value: any } } } QueryValue
 * @typedef { { id: typeof enums.idsQuery.Alias, x: { alias: string } } } QueryAliasProperty
 * @typedef { { id: typeof enums.idsQuery.Limit, x: { skip?: number, count?: number } } } QueryLimit
 * @typedef { { id: typeof enums.idsQuery.Sort, x: { direction: 'asc' | 'dsc', property: string } } } QuerySort
 * @typedef { { id: typeof enums.idsQuery.DerivedGroup, x: { newProperty: string, symbol: enums.queryDerivedSymbol, items: (QueryProperty | QueryValue | QueryDerivedGroup)[] } } } QueryDerivedGroup
 * 
 * @typedef { object } QueryFind
 * @property { typeof enums.idsQuery.Find } id
 * @property { QueryFindX } x
 * @typedef { object } QueryFindX
 * @property { enums.queryWhereSymbol } symbol
 * @property { [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } items
 * @property { string } [ publicJWK ]
 *
 * @typedef { object } QueryFilter
 * @property { typeof enums.idsQuery.Filter } id
 * @property { QueryFilterX } x
 * @typedef { object } QueryFilterX
 * @property { enums.queryWhereSymbol } symbol
 * @property { [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } items
 * @property { string } [ publicJWK ]
 *
 * @typedef { object } QueryProperty
 * @property { typeof enums.idsQuery.Property } id - Define a property
 * @property { QueryPropertyX } x
 * @typedef { object } QueryPropertyX
 * @property { string } property - String property name
 * @property { string[] } [ relationships ] - If this property is not on the node, list the relationship properties to get to the desired nodes
 *
 * @typedef { object } QueryFilterGroup
 * @property { typeof enums.idsQuery.FilterGroup } id - Do an (and / or) operand on a group of filters
 * @property { QueryFilterGroupX } x
 * @typedef { object } QueryFilterGroupX
 * @property { enums.queryWhereGroupSymbol } symbol - (And / Or)
 * @property { (QueryFilter | QueryFilterDefined | QueryFilterUndefined | QueryFilterGroup)[] } items - The items you'd love to do an (and / or) operand on
 * 
 * @typedef { object } QueryFindGroup
 * @property { typeof enums.idsQuery.FindGroup } id - Do an (and / or) operand on a group of filters
 * @property { QueryFindGroupX } x
 * @typedef { object } QueryFindGroupX
 * @property { enums.queryWhereGroupSymbol } symbol - (And / Or)
 * @property { (QueryFind | QueryFindDefined | QueryFindUndefined | QueryFindGroup)[] } items - The items you'd love to do an (and / or) operand on
 *
 * @typedef { object } QueryFindUndefined
 * @property { typeof enums.idsQuery.FindUndefined } id - Loop the items and return the first item that is undefined at a specific property
 * @property { QueryFindUndefinedX } x
 * @typedef { object } QueryFindUndefinedX
 * @property { QueryProperty } property - Loop the items and return the first item that is undefined at this property
 *
 * @typedef { object } QueryFindDefined
 * @property { typeof enums.idsQuery.FindDefined } id - Loop the items and return the first item that is defined at a specific property
 * @property { QueryFindDefinedX } x
 * @typedef { object } QueryFindDefinedX
 * @property { QueryProperty } property - Loop the items and return the first item that is defined at this property
 *
 * @typedef { object } QueryFilterUndefined
 * @property { typeof enums.idsQuery.FilterUndefined } id - Loop the items and only return the items that are undefined at a specific property
 * @property { QueryFilterUndefinedX } x
 * @typedef { object } QueryFilterUndefinedX
 * @property { QueryProperty } property - Loop the items and only return the items that are undefined at this property
 * 
 * @typedef { object } QueryFilterDefined
 * @property { typeof enums.idsQuery.FilterDefined } id - Loop the items and only return the items that are defined at a specific property
 * @property { QueryFilterDefinedX } x
 * @typedef { object } QueryFilterDefinedX
 * @property { QueryProperty } property - Loop the items and only return the items that are defined at this property
 *
 * @typedef { object } QueryFilterByUids
 * @property { typeof enums.idsQuery.FilterByUids } id - Recieves an array of uids and returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * @property { QueryFilterByUidsX } x
 * @typedef { object } QueryFilterByUidsX
 * @property { string[] } uids - With this array of uids, returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 *
 * @typedef { object } QueryFilterByUniques
 * @property { typeof enums.idsQuery.FilterByUniques } id - Recieves an array of unique values and returns an array of valid nodes (valid meaning: found in graph via unique index & $options qualifiying)
 * @property { QueryFilterByUniquesX } x
 * @typedef { object } QueryFilterByUniquesX
 * @property { QueryFilterByUniquesXUnique[] } uniques - With this array of unique values, returns an array of valid nodes (valid meaning: found in graph via unique index & $options qualifiying)
 * @typedef { object } QueryFilterByUniquesXUnique
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } property - Find node by this prop that has a unique index
 *
 * @typedef { object } QueryFilterBy_Uids
 * @property { typeof enums.idsQuery.FilterBy_Uids } id - Recieves an array of _uids and returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * @property { QueryFilterBy_UidsX } x
 * @typedef { object } QueryFilterBy_UidsX
 * @property { string[] } _uids - With this array of _uids, returns an array of valid nodes (valid meaning: found in graph & $options qualifiying)
 * 
 * @typedef { object } QueryFindByUnique
 * @property { typeof enums.idsQuery.FindByUnique } id - Find node by a prop that has a unique index
 * @property { QueryFindByUniqueX } x
 * @typedef { object } QueryFindByUniqueX
 * @property { string } value - The value Ace will query to find a unique match for
 * @property { string } property - Find node by this prop that has a unique index
 *
 * @typedef { object } QueryFindByUid
 * @property { typeof enums.idsQuery.FindByUid } id - Find node by a uid
 * @property { QueryFindByUidX } x
 * @typedef { object } QueryFindByUidX
 * @property { string } uid - Find node by this uid
 *
 * @typedef { object } QueryFindBy_Uid
 * @property { typeof enums.idsQuery.FindBy_Uid } id - Find relationship by a _uid
 * @property { QueryFindBy_UidX } x
 * @typedef { object } QueryFindBy_UidX
 * @property { string } _uid - Find relationship by this _uid
 *
 * @typedef { object } QueryCountAsResponse
 * @property { typeof enums.idsQuery.CountAsResponse } id - Set the count for the number of items in the response as the response
 * 
 * @typedef { object } QueryMinAmountAsResponse
 * @property { typeof enums.idsQuery.MinAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { QueryMinAmountAsResponseX } x
 * @typedef { object } QueryMinAmountAsResponseX
 * @property { string } property - Loop the items in the response, find the min amount of this property, amongst all response items and set it as the response
 * 
 * @typedef { object } QueryMaxAmountAsResponse
 * @property { typeof enums.idsQuery.MaxAmountAsResponse } id - Loop the items in the response, find the min amount of the provided property and set it as the response
 * @property { QueryMaxAmountAsResponseX } x
 * @typedef { object } QueryMaxAmountAsResponseX
 * @property { string } property - Loop the items in the response, find the max amount of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QuerySumAsResponse
 * @property { typeof enums.idsQuery.SumAsResponse } id - Loop the items in the response, calculate the sum of the provided property and set it as the response
 * @property { QuerySumAsResponseX } x
 * @typedef { object } QuerySumAsResponseX
 * @property { string } property - Loop the items in the response, calculate the sum of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QueryAverageAsResponse
 * @property { typeof enums.idsQuery.AverageAsResponse } id - Loop the items in the response, calculate the average of the provided property and set it as the response
 * @property { QueryAverageAsResponseX } x
 * @typedef { object } QueryAverageAsResponseX
 * @property { string } property - Loop the items in the response, calculate the average of this property, amongst all response items and set it as the response
 *
 * @typedef { object } QueryCountAsProperty
 * @property { typeof enums.idsQuery.CountAsProperty } id - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { QueryCountAsPropertyX } x
 * @typedef { object } QueryCountAsPropertyX
 * @property { string } newProperty - Find the count for the number of items in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 * 
 * @typedef { object } QuerySumAsProperty
 * @property { typeof enums.idsQuery.SumAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { QuerySumAsPropertyX } x
 * @typedef { object } QuerySumAsPropertyX
 * @property { string } computeProperty - Add the sum of the \`computeProperty\` of each node in the response
 * @property { string } newProperty - Add the sum of the \`computeProperty\` of each node in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryPropertyAsResponse
 * @property { typeof enums.idsQuery.PropertyAsResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { QueryPropertyAsResponseX } x
 * @typedef { object } QueryPropertyAsResponseX
 * @property { string } property - String that is the prop name that you would love to show as the response
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to source. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.slug, the relationships will be \`[ 'role' ]\`, property is \`'slug'\` and in the query I've got \`{ format: { role: { uid: true } } }\`
 * 
 * @typedef { object } QueryPropertyAdjacentToResponse
 * @property { typeof enums.idsQuery.PropertyAdjacentToResponse } id - If many results returned, show a property of the first node in the response as a response. If one result is returned, show a property of the node in the response as the reponse.
 * @property { QueryPropertyAdjacentToResponseX } x
 * @typedef { object } QueryPropertyAdjacentToResponseX
 * @property { string } sourceProperty
 * @property { string } adjacentProperty
 * @property { string[] } [ relationships ] - Array of strings (node relationship prop names) that takes us, from the node we are starting on, to the desired node, with the property you'd love to see, as the response. The relationship must be defined in the query to find any properties of the relationship. So if I am starting @ AceUser and I'd love to get to AceUser.role.slug, the relationships will be \`[ 'role' ]\`, property is \`'slug'\` and in the query I've got \`{ format: { role: { uid: true } } }\`
 *
 * @typedef { object } QueryAverageAsProperty
 * @property { typeof enums.idsQuery.AverageAsProperty } id - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { QueryAverageAsPropertyX } x
 * @typedef { object } QueryAverageAsPropertyX
 * @property { string } computeProperty - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response
 * @property { string } newProperty - Add the sum of the \`computeProperty\` of each node in the response and then divide by the count of items in the response and add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryMinAmountAsProperty
 * @property { typeof enums.idsQuery.MinAmountAsProperty } id - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { QueryMinAmountAsPropertyX } x
 * @typedef { object } QueryMinAmountAsPropertyX
 * @property { string } computeProperty - Find the smallest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProperty - Find the smallest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { object } QueryMaxAmountAsProperty
 * @property { typeof enums.idsQuery.MaxAmountAsProperty } id - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { QueryMaxAmountAsPropertyX } x
 * @typedef { object } QueryMaxAmountAsPropertyX
 * @property { string } computeProperty - Find the largest numerical value of each node's \`computeProperty\` in the response
 * @property { string } newProperty - Find the largest numerical value of each node's \`computeProperty\` in the response and then add this value as the \`newProperty\` to each node in the response
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 * 
 * @typedef { object } QueryMinNodeAsResponse
 * @property { typeof enums.idsQuery.MinNodeAsResponse } id - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { QueryMinNodeAsResponseX } x
 * @typedef { object } QueryMinNodeAsResponseX
 * @property { string } property - Find the smallest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * 
 * @typedef { object } QueryMaxNodeAsResponse
 * @property { typeof enums.idsQuery.MaxNodeAsResponse } id - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 * @property { QueryMaxNodeAsResponseX } x
 * @typedef { object } QueryMaxNodeAsResponseX
 * @property { string } property - Find the largest numerical value of each node's \`property\` in the response and then set the node that has that value as the response
 *
 * @typedef { object } QueryDerivedProperty
 * @property { typeof enums.idsQuery.DerivedProperty } id - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { QueryDerivedPropertyX } x
 * @typedef { object } QueryDerivedPropertyX
 * @property { string } newProperty - Derive a value based on the provided \`symbol\` and \`items\` and add the value as a \`newProperty\` to each node in the response
 * @property { enums.queryDerivedSymbol } symbol - Derive a value based on the provided \`symbol\` which include basic math symbols found at \`enums.queryDerivedSymbol\`
 * @property { (QueryProperty | QueryValue | QueryDerivedGroup)[] } items - Collection of items (Value, Property and/or a Derived Group) that will combine based on the \`symbol\`
 * @property { boolean } [ isResponseHidden ] - Set this to true if you would love this property to be available for $options calculations but not show up in the response
 *
 * @typedef { { [key: string]: CryptoKey } } QueryPublicJWKs
 * 
 * @typedef { { current: { [k: string]: any }, original: { [k: string]: any } } } QueryResponse
 *
 * @typedef { { id: string,   x: QueryRequestFormatX } } QueryRequestFormat
 * @typedef { { [propertyName: string]: any,   uid?: boolean | QueryAliasProperty,   $options?: QueryRequestFormatOptions } } QueryRequestFormatX
 * @typedef ${ queryRequestFormatOptions } QueryRequestFormatOptions
 * 
 * @typedef { object } QueryRequestFormatGenerated
 * @property { string } property
 * @property { string } schemaProperty
 * @property { string } [ aliasProperty ]
 * @property { enums.has } has
 * @property { string } nodeName
 * @property { string } [ relationshipName ]
 * @property { QueryRequestFormatX } x
 * @property { boolean } hasOptionsFind
 * @property { boolean } hasValueAsResponse
 * @property { boolean } hasCountOne
 * @property { Map<('FilterByUids' | 'FilterBy_Uids' | 'FilterByUniques'), Set<string>> } sets - Allow us to not have to call Set.has() rather then [].includes()
 * @property { QueryRequestFormatGeneratedPriorityOptions } priorityOptions
 * @typedef { Map<enums.idsQuery, (QuerySort | QueryFindByUnique | QueryFindByUid | QueryFindBy_Uid | QueryFilterByUids | QueryFilterBy_Uids | QueryFilterByUniques)> } QueryRequestFormatGeneratedPriorityOptions
 */


/** CLOUDFLARE
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
 * @property { (options?: CF_DO_StorageListOptions) => Promise<Map<string, any>> } list - Returns all keys and values associated with the current Durable Object in ascending sorted order based on the keys’ UTF-8 encodings.
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


/** START
 *
 * @typedef { object } AceStartResponse
 * @property { string } publicJWK
 * @property { string } privateJWK
 * @property { AceStartResponseAdmin } admin
 * @typedef { object } AceStartResponseAdmin
 * @property { string } uid
 * @property { string } username
 * @property { string } token
 */


${ getSchemaTypedefs() }`),

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
     * Manifest the typedefs for all nodes in schema
     * @returns { string }
     */
    function getSchemaTypedefs () {
      let typedefs = ''
      let queryResultDefault = ''
      let mutateRequestInsertItem = ''
      let mutateRequestUpdateItem = ''
      let nodeNames = /** @type { string[] } */ ([])

      if (schema?.relationships) {
        for (const relationshipName in schema.relationships) {
          mutateRequestInsertItem += `${ relationshipName }MutateRequestInsertItem | `
          mutateRequestUpdateItem += `${ relationshipName }MutateRequestUpdateItem | `

          const abDescription = `\`a\` and \`b\` are node uids, so for examle if \`a\` is \`_:node1\` and \`b\` is \`_:node2\` then, \`_:node1\` => \`${ relationshipName }\` => \`_:node2\``

          let mutateInsertRelationship = `/** MUTATE: ${ relationshipName }
 * 
 * @typedef { object } ${ relationshipName }MutateRequestInsertItem
 * @property { '${ relationshipName }' } id - Insert \`${ relationshipName }\` relationship
 * @property { ${ relationshipName }MutateRequestInsertItemX } x
 * @typedef { object } ${ relationshipName }MutateRequestInsertItemX
 * @property { string } a - ${ abDescription }
 * @property { string } b - ${ abDescription }`

          let mutateUpdateRelationship = ` * @typedef { object } ${ relationshipName }MutateRequestUpdateItem
 * @property { '${ relationshipName }' } id - Update \`${ relationshipName }\` relationship
 * @property { ${ relationshipName }MutateRequestUpdateItemX } x
 * @typedef { object } ${ relationshipName }MutateRequestUpdateItemX
 * @property { string } _uid - Relationship uid
 * @property { string } [ a ] - ${ abDescription }
 * @property { string } [ b ] - ${ abDescription }`

          if (schema.relationships[relationshipName]?.x?.props) {
            for (const propName in schema.relationships[relationshipName].x.props) {
              const schemaProp = schema.relationships[relationshipName].x.props[propName]
              const dataType = getDataType(schemaProp.x.dataType)
              const description = `Set to a ${ dataType } value if you would love to update this relationship property, \`${ propName }\`, in the graph`

              mutateUpdateRelationship += `\n * @property { ${ dataType } } ${ '[ ' + propName + ' ]' } - ${ description }`
              mutateInsertRelationship += `\n * @property { ${ dataType } } ${ schemaProp.x.mustBeDefined ? propName : '[ ' + propName + ' ]' } - ${ description }`
            }
          }


          typedefs += (mutateInsertRelationship + '\n *\n' + mutateUpdateRelationship + '\n */\n\n\n')
        }
      }

      if (schema?.nodes) {
        let formatPipes = ''
        let queryFormatNodes = ''
        
        for (const nodeName in schema.nodes) {
          let queryRelationshipProps = ''
          formatPipes += `${ nodeName }Format | `
          queryFormatNodes += `${ nodeName }Format | `
          mutateRequestInsertItem += `${ nodeName }MutateRequestInsertItem | `
          mutateRequestUpdateItem += `${ nodeName }MutateRequestUpdateItem | `

          let mutateInsertNode = `/** MUTATE: ${ nodeName }
 * 
 * @typedef { object } ${ nodeName }MutateRequestInsertItem
 * @property { '${ nodeName }' } id - Insert \`${ nodeName }\` node
 * @property { ${ nodeName }MutateRequestInsertItemX } x
 * @typedef { object } ${ nodeName }MutateRequestInsertItemX
 * @property { MutateRequestPrivateJWKOption[] } [ $options ] - Mutation insert options
 * @property { string } uid - If you are setting your own \`uid\`, it must be a unique \`uid\` to all other relationships or nodes in your graph. If you are allowing Ace to set this uid, it must look like this \`_:chris\` - The beginning must have the uid prefix which is \`_:\` and the end must have a unique identifier string, this way you can reuse this uid in other mutations`

          let mutateUpdateNode = `@typedef { object } ${ nodeName }MutateRequestUpdateItem
 * @property { '${ nodeName }' } id - Update \`${ nodeName }\` node
 * @property { ${ nodeName }MutateRequestUpdateItemX } x
 * @typedef { object } ${ nodeName }MutateRequestUpdateItemX
 * @property { MutateRequestPrivateJWKOption[] } [ $options ] - Mutation options
 * @property { string } uid - The node's unique identifier`

          nodeNames.push(nodeName)
          let nodeQueryFormatProps = ` * @property { boolean | QueryAliasProperty } [ uid ] - ${ getQueryPropDescription({ propName: 'uid', nodeName }) }`

          for (const propName in schema.nodes[nodeName]) {
            const schemaProp = schema.nodes[nodeName][propName]

            switch (schemaProp.id) {
              case 'Prop':
                const dataType = getDataType(schemaProp.x.dataType)
                mutateUpdateNode += `\n * @property { ${ dataType } } [ ${ propName } ] - Set to a value with a \`${ dataType }\` data type to update the current \`${ propName }\` property in the graph for this node (\`${ nodeName }\`). ${ schemaProp.x.description || '' }`
                mutateInsertNode += `\n * @property { ${ dataType } } ${ schemaProp.x.mustBeDefined ? propName : '[ ' + propName + ' ]'} - Set to a value with a \`${ dataType }\` data type to set the current \`${ propName }\` property in the graph for this node (\`${ nodeName }\`). ${ schemaProp.x.description || '' }`
                nodeQueryFormatProps += `\n * @property { boolean | QueryAliasProperty } [ ${ propName } ] - ${ getQueryPropDescription({ propName, nodeName, schemaPropDescription: schemaProp.x.description }) }`
                break
              case 'ForwardRelationshipProp':
              case 'ReverseRelationshipProp':
              case 'BidirectionalRelationshipProp':
                const relationshipPropName = getRelationshipQueryFormatProp(nodeName, propName)

                let queryProps = ''

                nodeQueryFormatProps += `\n * @property { ${ relationshipPropName }X } [ ${ propName } ] - Return object to see node name: \`${ nodeName }\` and prop name: \`${ propName }\`, that will provide properties on the \`${ schemaProp.x.nodeName }\` node in the response`

                for (const relationshipNodePropName in schema.nodes[schemaProp.x.nodeName]) {
                  const rSchemaProp = schema.nodes[schemaProp.x.nodeName][relationshipNodePropName]

                  queryProps += rSchemaProp.id === 'Prop' ?
                    `\n * @property { boolean | QueryAliasProperty } [ ${ relationshipNodePropName } ] - ${ getQueryPropDescription({ propName: relationshipNodePropName, nodeName: schemaProp.x.nodeName, schemaPropDescription: rSchemaProp.x.description }) }` :
                    `\n * @property { ${ getRelationshipQueryFormatProp(schemaProp.x.nodeName, relationshipNodePropName) }X } [ ${ relationshipNodePropName } ] - Return object to see node name: \`${ schemaProp.x.nodeName }\` and prop name: \`${ relationshipNodePropName }\`, that will provide properties on the \`${ rSchemaProp.x.nodeName }\` node in the response`
                }

                queryRelationshipProps += `/** QUERY: ${ relationshipPropName }
 * 
 * @typedef { object } ${ relationshipPropName }
 * @property { '${ relationshipPropName }' } id
 * @property { ${ relationshipPropName }X } x
 * @typedef { object } ${ relationshipPropName }X
 * @property ${ queryRequestFormatOptions } [ $options ]
 * @property { boolean | QueryAliasProperty } [ _uid ] - ${ getQueryPropDescription({ propName: '_uid', relationshipName: schemaProp.x.relationshipName })}
 * @property { boolean | QueryAliasProperty } [ uid ] - ${ getQueryPropDescription({ propName: 'uid', nodeName: schemaProp.x.nodeName })}${queryProps}
 */\n\n\n`
                break
            }
          }

          mutateUpdateNode += '\n */\n\n\n'

          typedefs += `/** QUERY: ${ nodeName }Format
 * 
 * @typedef { object } ${ nodeName }Format
 * @property { '${ nodeName }' } id
 * @property { ${ nodeName }FormatX } x
 * @typedef { object } ${ nodeName }FormatX
 * @property ${ queryRequestFormatOptions } [ $options ]
${ nodeQueryFormatProps }
 */


${ mutateInsertNode }
 * 
 * ${ mutateUpdateNode }${ queryRelationshipProps }`
        }

        if (formatPipes) formatPipes = formatPipes.slice(0, -2) // remove trailing pipe
        if (queryFormatNodes) queryFormatNodes = queryFormatNodes.slice(0, -2) // remove trailing |

        queryResultDefault = `
 * @typedef { object } QueryRequestDefault
 * @property { string } property - The property that this queries results should be placed within
 * @property { ${ queryFormatNodes } } format - The desired format to display the data
 * @property { { [key: string]: string }  } [ publicJWKs ] - Public JWKs that can be used to do a Find or Filter on a property with a \`hash\` data type - For example \`publicJWKs: { passwordPublicJWK }\`
 * `
      } else {
        queryResultDefault = `
 * @typedef { object } QueryRequestDefault
 * @property { string } property
 * @property { QueryRequestFormat } format
 * @property { { [key: string]: string }  } [ publicJWKs ]
 * `
      }

      if (mutateRequestUpdateItem) mutateRequestUpdateItem = mutateRequestUpdateItem.slice(0, -3) // remove trailing pipe
      else mutateRequestUpdateItem = '(MutateRequestUpdateNodeDefaultItem | MutateRequestUpdateRelationshipDefaultItem)'

      if (mutateRequestInsertItem) mutateRequestInsertItem = mutateRequestInsertItem.slice(0, -3) // remove trailing pipe
      else mutateRequestInsertItem = '(MutateRequestInsertNodeDefaultItem | MutateRequestInsertRelationshipDefaultItem)'

      typedefs += `/** MULTIPLE NODES
 *
 * @typedef { QueryRequestDefault | QueryRequestArray } QueryRequest
 * @typedef { QueryRequestDefault[] } QueryRequestArray
 * ${ queryResultDefault }
 * @typedef { ${ mutateRequestInsertItem } } MutateRequestInsertItem
 * @typedef { ${ mutateRequestUpdateItem } } MutateRequestUpdateItem
 */`

      return typedefs
    }


    /**
     * @param { string } nodeName
     * @param { string } propName
     * @returns { string }
     */
    function getRelationshipQueryFormatProp (nodeName, propName) {
      return `${ nodeName }__${ propName }__Format`
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

    console.log(`🌟 Manifested enums, typedefs (js) and types (ts)!`)
  } catch (e) {
    console.log(e)
  }
})()
