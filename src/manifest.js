#!/usr/bin/env node

import util from 'node:util'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { dataTypes } from './enums/dataTypes.js'
import { endpoints } from './enums/endpoints.js'
import { has } from './enums/has.js'
import { idsQuery } from './enums/idsQuery.js'
import { idsSchema } from './enums/idsSchema.js'
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
    const queryRequestFormatOptions = '{ (QueryPropertyAsResponse | QueryLimit | QuerySort | QuerySumAsProperty | QueryAverageAsProperty | QueryMinAmountAsProperty | QueryMinNodeAsResponse | QueryMaxNodeAsResponse | QueryMinAmountAsResponse | QueryMaxAmountAsResponse | QuerySumAsResponse | QueryAverageAsResponse | QueryMaxAmountAsProperty | QueryCountAsProperty |  QueryCountAsResponse | QueryFind | QueryFilter | QueryWhereGroup | QueryWhereDefined | QueryWhereUndefined | QueryDerivedProperty | QueryAliasProperty)[] }'

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
      enumsMap.set('idsSchema', idsSchema)
      enumsMap.set('idsQuery', idsQuery)
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


/** SCHEMA
 *
 * @typedef { { nodes: { [nodeName: string]: SchemaNodeValue }, relationships: { [relationshipName: string]: SchemaRelationshipValue } } } Schema
 * @typedef { { [nodePropName: string]: SchemaProp | SchemaForwardRelationshipProp | SchemaReverseRelationshipProp | SchemaBidirectionalRelationshipProp } } SchemaNodeValue
 * @typedef { { id: typeof enums.idsSchema.OneToOne | typeof enums.idsSchema.OneToMany | typeof enums.idsSchema.ManyToMany, x?: SchemaRelationshipValueX } } SchemaRelationshipValue
 *
 * @typedef { object } SchemaProp
 * @property { typeof enums.idsSchema.Prop  } id
 * @property { SchemaPropX } x
 *
 * @typedef { object } SchemaRelationshipProp
 * @property { typeof enums.idsSchema.RelationshipProp } id
 * @property { SchemaPropX } x
 *
 * @typedef { object } SchemaForwardRelationshipProp
 * @property { typeof enums.idsSchema.ForwardRelationshipProp } id
 * @property { NodeRelationshipX } x
 *
 * @typedef { object } SchemaReverseRelationshipProp
 * @property { typeof enums.idsSchema.ReverseRelationshipProp } id
 * @property { NodeRelationshipX } x
 *
 * @typedef { object } SchemaBidirectionalRelationshipProp
 * @property { typeof enums.idsSchema.BidirectionalRelationshipProp } id
 * @property { NodeRelationshipX } x
 *
 * @typedef { object } SchemaPropX
 * @property { enums.dataTypes } dataType
 * @property { boolean } [ mustBeDefined ]
 * @property { boolean } [ sortIndex ]
 * @property { boolean } [ uniqueIndex ]
 *
 * @typedef { object } NodeRelationshipX
 * @property { enums.has } has
 * @property { string } nodeName
 * @property { string } relationshipName
 * @property { boolean } [ mustBeDefined ]
 *
 * @typedef { object } SchemaRelationshipValueX
 * @property { { [propName: string]: SchemaRelationshipProp } } props
 */


/** MUTATE
 *
 * @typedef { object } MutateRequest
 * @property { {[jwkName: string]: string } } [ privateJWKs ]
 * @property { MutateRequestInsertItem[] } [ insert ]
 *
 * @typedef { object } MutateRequestInsertNodeDefaultItem
 * @property { string } id
 * @property { { [propertyName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x
 *
 * @typedef { object } MutateRequestInsertRelationshipDefaultItem
 * @property { string } id
 * @property { { a: string, b: string, [propertyName: string]: any, $options?: MutateRequestPrivateJWKOption[] } } x
 *
 * @typedef { object } MutateRequestPrivateJWKOption
 * @property { 'PrivateJWK' } id
 * @property { { name: string} } x
 *
 * @typedef { { put: string[], identity: { [k: string]: string } } } MutateResponse
 */


/** QUERY
 *
 * @typedef { { id: typeof enums.idsQuery.Value, x: { value: any } } } QueryValue
 * @typedef { { id: typeof enums.idsQuery.Alias, x: { alias: string } } } QueryAliasProperty
 * @typedef { { id: typeof enums.idsQuery.Limit, x: { skip?: number, count?: number } } } QueryLimit
 * @typedef { { id: typeof enums.idsQuery.WhereDefined, x: { property: QueryProperty } } } QueryWhereDefined
 * @typedef { { id: typeof enums.idsQuery.WhereUndefined, x: { property: QueryProperty } } } QueryWhereUndefined
 * @typedef { { id: typeof enums.idsQuery.Sort, x: { direction: 'asc' | 'dsc', property: string } } } QuerySort
 * @typedef { { id: typeof enums.idsQuery.Property, x: { property: string, relationships?: string[] } } } QueryProperty
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
 * @typedef { { id: typeof enums.idsQuery.DerivedGroup, x: { newProperty: string, symbol: enums.queryDerivedSymbol, items: (QueryProperty | QueryValue | QueryDerivedGroup)[] } } } QueryDerivedGroup
 * @typedef { { id: typeof enums.idsQuery.WhereGroup, x: { symbol: enums.queryWhereGroupSymbol, items: (QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup)[] } } } QueryWhereGroup
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
 * @typedef { { id: typeof enums.idsQuery.Where, x: { symbol: enums.queryWhereSymbol, publicJWK?: string, items: [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } } } QueryWhere
 * @typedef { { id: typeof enums.idsQuery.Find, x: { symbol: enums.queryWhereSymbol, publicJWK?: string, items: [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } } } QueryFind
 * @typedef { { id: typeof enums.idsQuery.Filter, x: { symbol: enums.queryWhereSymbol, publicJWK?: string, items: [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } } } QueryFilter
 *
 * @typedef { { [key: string]: CryptoKey } } PublicJWKs
 *
 * @typedef { { nodeName: string, type: string } } ParsedQueryId
 * 
 * @typedef { { current: { [k: string]: any }, original: { [k: string]: any } } } QueryResponse
 *
 * @typedef { { id: string,   x: QueryRequestFormatX } } QueryRequestFormat
 * @typedef { { [propertyName: string]: any,   uid?: boolean | QueryAliasProperty,   $options?: QueryRequestFormatOptions } } QueryRequestFormatX
 * @typedef ${ queryRequestFormatOptions } QueryRequestFormatOptions
 * @typedef { { property: string,   schemaProperty: string,   aliasProperty?: string,   has: enums.has,   nodeName: string,   relationshipName?: string,   x: QueryRequestFormatX, hasOptionsFind: boolean, hasValueAsResponse: boolean, hasCountOne: boolean } } QueryRequestFormatGenerated
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
      let nodeNames = /** @type { string[] } */ ([])

      if (schema?.relationships) {
        for (const relationshipName in schema.relationships) {
          let mutateRelationship = `/** MUTATE: ${ relationshipName }
 * 
 * @typedef { object } ${ relationshipName }MutateRequestInsertItem
 * @property { '${ relationshipName }' } id
 * @property { { _uid: string, a: string, b: string, `
        
          if (schema.relationships[relationshipName]?.x) {
            for (const propName in schema.relationships[relationshipName].x) {
              mutateRelationship += `${ propName }: ${ getDataType(schema.relationships[relationshipName][propName]?.x.dataType) }, `
            }
          }

          mutateRelationship = mutateRelationship.slice(0, -2) // remove trailing comma

          mutateRelationship += ` } } x\n */\n\n\n`

          typedefs += mutateRelationship
        }
      }

      if (schema?.nodes) {
        let formatPipes = ''
        let queryFormatNodes = ''
        let nodeQueryFormatPropsMap = new Map()

        for (const nodeName in schema.nodes) {
          let nodeRelationshipProps = ''
          formatPipes += `${ nodeName }Format | `
          queryFormatNodes += `${ nodeName }Format | `

          let mutateNode = `/** MUTATE: ${ nodeName }
 * 
 * @typedef { object } ${ nodeName }MutateRequestInsertItem
 * @property { '${ nodeName }' } id
 * @property { { uid: string, `

          nodeNames.push(nodeName)
          let nodeQueryFormatProps = ` * @property { boolean | QueryAliasProperty } [ uid ] - ${ getPropDescription('uid') }\n`

          for (const propName in schema.nodes[nodeName]) {
            const schemaProp = schema.nodes[nodeName][propName]

            switch (schemaProp.id) {
              case 'Prop':
                mutateNode += `${ propName }${ schemaProp.x.options?.includes('defined') ? '' : '?' }: ${ getDataType(schemaProp.x.dataType) }, `
                nodeQueryFormatProps += ` * @property { boolean | QueryAliasProperty } [ ${ propName } ] - ${ getPropDescription(propName) }\n`
                break
              case 'RelationshipProp':
                const relationshipPropName = getRelationshipQueryFormatProp(nodeName, propName)

                let queryProps = ''

                nodeQueryFormatProps += ` * @property { ${ relationshipPropName }X } [ ${ propName } ] - ${ getPropDescription(propName) }\n`

                for (const relationshipNodePropName in schema.nodes[schemaProp.x.nodeName]) {
                  const rSchemaProp = schema.nodes[schemaProp.x.nodeName][relationshipNodePropName]

                  queryProps += rSchemaProp.id === 'Prop' ?
                    `\n * @property { boolean | QueryAliasProperty } [ ${ relationshipNodePropName } ] - ${ getPropDescription(relationshipNodePropName) }` :
                    `\n * @property { ${ getRelationshipQueryFormatProp(schemaProp.x.nodeName, relationshipNodePropName) }X } [ ${ relationshipNodePropName } ] - Return object to see ${ relationshipNodePropName } properties`
                }

                nodeRelationshipProps += `/** QUERY: ${ relationshipPropName }
 * 
 * @typedef { object } ${ relationshipPropName }
 * @property { '${ relationshipPropName }' } id
 * @property { ${ relationshipPropName }X } x
 * 
 * @typedef { object } ${ relationshipPropName }X
 * @property ${ queryRequestFormatOptions } [ $options ]
 * @property { boolean | QueryAliasProperty } [ _uid ] - ${ getPropDescription('_uid')}${ queryProps }
 */\n\n\n`
                break
            }
          }

          mutateNode += `$options?: MutateRequestPrivateJWKOption[] } } x
 */\n\n\n`

          nodeQueryFormatProps = nodeQueryFormatProps.slice(0, -2) // remove trailing \n

          nodeQueryFormatPropsMap.set(nodeName, nodeQueryFormatProps)

          typedefs += `/** QUERY: ${ nodeName }Format
 * 
 * @typedef { object } ${ nodeName }Format
 * @property { '${ nodeName }' } id
 * @property { ${ nodeName }FormatX } x
 * 
 * @typedef { object } ${ nodeName }FormatX
 * @property ${ queryRequestFormatOptions } [ $options ]
${ nodeQueryFormatProps }
 */


${ mutateNode }${ nodeRelationshipProps }`
        }

        if (queryFormatNodes) queryFormatNodes = queryFormatNodes.slice(0, -2) // remove trailing |
        if (formatPipes) formatPipes = formatPipes.slice(0, -2) // remove trailing pipe

        queryResultDefault = `
 * @typedef { object } QueryRequestDefault
 * @property { string } property
 * @property { string } url
 * @property { ${ queryFormatNodes } } format
 * @property { { [key: string]: string }  } [ publicJWKs ]
 * `
      } else {
        queryResultDefault = `
 * @typedef { object } QueryRequestDefault
 * @property { string } property
 * @property { string } url
 * @property { QueryRequestFormat } format
 * @property { { [key: string]: string }  } [ publicJWKs ]
 * `
      }

      typedefs += `/** MULTIPLE NODES
 *
 * @typedef { QueryRequestDefault } QueryRequest
 * ${ queryResultDefault }
 * @typedef { (MutateRequestInsertNodeDefaultItem | MutateRequestInsertRelationshipDefaultItem) } MutateRequestInsertItem
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
     * @param { string } prop 
     * @returns { string }
     */
    function getPropDescription (prop) {
      return `Set to true if you would love to see the property \`${ prop }\` in the response.`
    }

    console.log(`🌟 Manifested enums, typedefs (js) and types (ts)!`)
  } catch (e) {
    console.log(e)
  }
})()
