#!/usr/bin/env node

import util from 'node:util'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { dataTypes } from './enums/dataTypes.js'
import { endpoints } from './enums/endpoints.js'
import { has } from './enums/has.js'
import { indices } from './enums/indices.js'
import { must } from './enums/must.js'
import { queryDerivedSymbol } from './enums/queryDerivedSymbol.js'
import { queryWhereGroupSymbol } from './enums/queryWhereGroupSymbol.js'
import { queryWhereSymbol } from './enums/queryWhereSymbol.js'
import { reservedQueryFormatKeys } from './enums/reservedQueryFormatKeys.js'
import { sortOptions } from './enums/sortOptions.js'


/**
 * Read Schema from locally running Ace Graph Database
 * Manifest enums, typedefs and types
 * If schema is defined alter above based on schema
 * If schema is not defined use defaults
 */
(async function manifest () {
  try {
    let schema = /** @type { { nodes: { [k: string]: any }, relationships?: { [k: string]: any } } | undefined } */ (undefined)
    const enumsMap = /** @type { Map<string, Map<string, string> | Set<string>> } */ (new Map())
    const bashEntries = [...process.argv.entries()]
    const optionValue = bashEntries[2]?.[1]
    const port = Number(optionValue)

    const files = {
      dir: '.manifest',
      src: 'src',
      dist: 'dist',
      enums: 'enums.js',
      classes: 'classes.js',
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
      enumsMap.set('indices', indices)
      enumsMap.set('must', must)
      enumsMap.set('queryDerivedSymbol', queryDerivedSymbol)
      enumsMap.set('queryWhereGroupSymbol', queryWhereGroupSymbol)
      enumsMap.set('queryWhereSymbol', queryWhereSymbol)
      enumsMap.set('nodeNames', new Set(Object.keys(schema?.nodes || {})))
      enumsMap.set('relationshipNames', new Set(Object.keys(schema?.relationships || {})))
      enumsMap.set('reservedQueryFormatKeys', reservedQueryFormatKeys)
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


    function getClassesCode () {
      let code = `import * as enums from './enums.js'


/**
 * @param { any } self 
 * @param { any } options 
 * @param { string[] } props 
 */
function construct (self, options, props) {
  for (const prop of props) {
    self[prop] = options[prop]
  }
}


export class QueryDerived {
  is = { str: 'QueryDerived', QueryDerived: true }
  /** @type { enums.queryDerivedSymbol } */
  symbol
  /** @type { (QueryDerived | QueryDerivedProperty | QueryDerivedValue)[] } */
  items

  /**
   * @typedef { object } QueryDerivedOptions
   * @property { enums.queryDerivedSymbol } symbol
   * @property { (QueryDerived | QueryDerivedProperty | QueryDerivedValue)[] } items
   *
   * @param { QueryDerivedOptions } options
   */
  constructor(options) {
    this.symbol = options.symbol
    this.items = options.items
  }
}


export class QueryDerivedValue {
  is = { str: 'QueryDerivedValue', QueryDerivedValue: true }
  /** @type { any } */
  value

  /**
   * @param { any } value
   */
  constructor (value) {
    this.value = value
  }
}


export class QueryDerivedProperty {
  is = { str: 'QueryDerivedProperty', QueryDerivedProperty: true }
  relationships = /** @type { enums.relationshipNames[] | undefined } */ (undefined)
  /** @type { string } */
  property

  /**
   * @typedef { object } QueryDerivedPropertyOptions
   * @property { enums.relationshipNames[] } [ relationships ]
   * @property { string } property
   *
   * @param { QueryDerivedPropertyOptions } options
   */
  constructor(options) {
    this.relationships = options.relationships
    this.property = options.property
  }
}


export class QueryWhere {
  is = { str: 'QueryWhere', QueryWhere: true }
  relationships = /** @type { enums.relationshipNames[] | undefined } */ (undefined)
  /** @type { string } */
  property
  /** @type { enums.queryWhereSymbol } */
  symbol
  value = /** @type { string | number | boolean | undefined } */ (undefined)

  /**
   * @typedef { object } QueryWhereOptions
   * @property { enums.relationshipNames[] } [ relationships ]
   * @property { string } property
   * @property { enums.queryWhereSymbol } symbol
   * @property { string | number | boolean } [ value ]
   *
   * @param { QueryWhereOptions } options
   */
  constructor (options) {
    this.relationships = options.relationships
    this.property = options.property
    this.symbol = options.symbol
    this.value = options.value
  }
}


export class QueryWhereGroup {
  is = { str: 'QueryWhereGroup', QueryWhereGroup: true }
  /** @type { enums.queryWhereGroupSymbol } */
  symbol
  /** @type { (QueryWhere | QueryWhereGroup)[] } */
  queries

  /**
   * @typedef { object } QueryWhereGroupOptions
   * @property { enums.queryWhereGroupSymbol } symbol
   * @property { (QueryWhere | QueryWhereGroup)[] } queries
   *
   * @param { QueryWhereGroupOptions } options
   */
  constructor (options) {
    this.symbol = options.symbol
    this.queries = options.queries
  }
}


export class Schema {
  nodes = /** @type { { [nodeName: string]: { [propName: string]: SchemaProp } } | undefined } */ (undefined)
  relationships = /** @type { { [relationshipName: string]: SchemaRelationship } | undefined } */ (undefined)

  /**
   * @typedef { object } SchemaOptions
   * @property { { [nodeName: string]: { [propName: string]: SchemaProp } } } [ nodes ]
   * @property { { [relationshipName: string]: SchemaRelationship } } [ relationships ]
   *
   * @param { SchemaOptions } options
   */
  constructor(options) {
    construct(this, options, [ 'nodes', 'relationships' ])
  }
}


export class SchemaProp {
  /** @type { enums.dataTypes } */
  dataType
  indices = /** @type { enums.indices[] | undefined } */ (undefined)
  must = /** @type { enums.must[] | undefined } */ (undefined)

  /**
   * @typedef { object } SchemaPropOptions
   * @property { enums.dataTypes } dataType
   * @property { enums.indices[] } [ indices ]
   * @property { enums.must[] } [ must ]
   *
   * @param { SchemaPropOptions } options
   */
  constructor(options) {
    this.dataType = options.dataType
    this.indices = options.indices
    this.must = options.must
  }
}


export class SchemaRelationship {
  /** @type { [ SchemaRelationshipDirection, SchemaRelationshipDirection ] } */
  directions
  props = /** @type { { [ propName: string ]: SchemaProp } | undefined } */ (undefined)

  /**
   * @typedef { object } SchemaRelationshipOptions
   * @property { [ SchemaRelationshipDirection, SchemaRelationshipDirection ] } directions
   * @property { { [ propName: string ]: SchemaProp } } [ props ]
   *
   * @param { SchemaRelationshipOptions } options
   */
  constructor(options) {
    this.directions = options.directions
    this.props = options.props
  }
}


export class SchemaRelationshipDirection {
  /** @type { string } */
  nodeName
  /** @type { enums.has } */
  has
  /** @type { enums.must[] | undefined } */
  must
  /** @type { string } */
  nodePropName

  /**
   * @typedef { object } SchemaRelationshipDirectionOptions
   * @property { string } nodeName
   * @property { enums.has } has
   * @property { enums.must[] } [ must ]
   * @property { string } nodePropName
   *
   * @param { SchemaRelationshipDirectionOptions } options
   */
  constructor(options) {
    this.nodeName = options.nodeName
    this.has = options.has
    this.must = options.must
    this.nodePropName = options.nodePropName
  }
}\n\n\n`


      /**
       * @param { string } prop 
       * @returns { string }
       */
      function getPropDescription (prop) {
        return `Set to true if you would love to see the property \`${ prop }\` in the response. To show this prop and set an alias, \`{ alias: 'example' }\``
      }


      if (schema?.nodes) {
        code += `/** @typedef { { alias?: string } } acePropertyOptions */\n\n\n`
        for (const node in schema.nodes) {
          const exactTypedefs = /** Common exact typedef code @type { string[] } */ ([])
          const schemaProps = /** <propName, { mustBeDefined, dataType }> @type { Map<string, { mustBeDefined: boolean, dataType: string | boolean | number }> } */ (new Map())
          const schemaRelationships = /** <relationshipName, relationshipNode> @type { Map<string, any> } */ (new Map())

          for (const propKey in schema.nodes[node]) {
            const propValue = schema.nodes[node][propKey]
            const dataType = getDataType(propValue.dataType)
            const mustBeDefined = propValue.must?.includes('defined') || false

            schemaProps.set(propKey, { mustBeDefined, dataType })
            if (propValue.indices?.includes('exact')) exactTypedefs.push(`{ property: '${ propKey }', value: ${ dataType } }`)
          }

          const exactTypedef = exactTypedefs.join(' | ')

          const exactString = !exactTypedefs.length ? '' : `\n\nexport class ${ node }QueryExact {
  is = { str: 'exact', exact: true, node: '${ node }' }
  url = /** @type { string | undefined } */ (undefined)
  property = /** @type { string | undefined } */ (undefined)
  exact = /** @type { ${ exactTypedef } | undefined } */ (undefined)
  format = /** @type { ${ node }FormatOne | undefined } */ (undefined)

  /**
   * @typedef { object } ${ node }QueryExactOptions
   * @property { string } url - This is the URL to your Ace Graph Database
   * @property { ${ exactTypedef } } exact - There is an exact index aplied to this node, using this property allows you to find a node using this index
   * @property { string } property - The response will be an object, the object's property that will hold this data is defined here
   * @property { ${ node }FormatOne } format - Format the response exactly how you love
   *
   * @param { ${ node }QueryExactOptions } options
   */
  constructor (options) { construct(this, options, [ 'url', 'exact', 'property', 'format' ]) }
}`

          if (schema.relationships) {
            for (const relationshipKey in schema.relationships) {
              const relationship = schema.relationships[relationshipKey]

              if (relationship.directions[0].nodeName === node) schemaRelationships.set(relationship.directions[0].nodePropName, `${ relationship.directions[1].nodeName }Format${ relationship.directions[0].has === 'one' ? 'One' : 'Many' }`)
              else if (relationship.directions[1].nodeName === node) schemaRelationships.set(relationship.directions[1].nodePropName, `${ relationship.directions[0].nodeName }Format${ relationship.directions[1].has === 'one' ? 'One' : 'Many' }`)
            }
          }


          const descriptions = {
            $alias: "Define this property if you'd love the property in the response to match the string provided here",
            $count: "Define this property if you'd love to limit the maximum number of items in the response to be the number provided here",
            $skip: "Define this property if you'd love to skip the first X items in the response, X is the number provided here",
            $where: "Define this property if you'd love to filter items in the response. If you'd love a property on the node to be available in the filter function, that property must be in the query",
            $derived: "Define this property if you'd love to create properties in the response.",
            $sort: "Define this property if you'd love to sort the items in the response by a property, example: \`{ property: 'prop1', direction: 'dsc' }\`",
          }

          let whereType = 'QueryWhere | QueryWhereGroup'
          let derivedType = '{ [propertyName: string]: QueryDerived }'
          let bindProps = ''
          let fieldsInsert = ''
          let pipeQueryProps = ''
          let fieldsQueryFormat = ''
          let constructorInsert = ''
          let constructorQueryFormat = ''
          let commaQueryPropsAndRelationships = ''

          schemaProps.forEach(({ mustBeDefined, dataType }, propName) => {
            bindProps += `    this.${ propName } = options.${ propName }\n`
            pipeQueryProps += `'${ propName }' | `
            commaQueryPropsAndRelationships += `'${ propName }', `
            fieldsInsert += mustBeDefined ? 
              `  /** @type { ${ dataType } } */\n  ${ propName }\n` :
              `  ${ propName } = /** @type { ${ dataType } | undefined } */ (undefined)\n`
            fieldsQueryFormat += `  ${ propName } = /** @type { boolean | acePropertyOptions | undefined  } */ (undefined)\n`
            constructorInsert += `   * @property { ${ dataType } } ${ mustBeDefined ? propName : `[ ${ propName } ]` }\n`
            constructorQueryFormat += `   * @property { boolean | acePropertyOptions } [ ${ propName } ] - ${ getPropDescription(propName) }\n`
          })

          schemaRelationships.forEach((relationshipNode, relationshipName) => {
            commaQueryPropsAndRelationships += `'${ relationshipName }', `
            fieldsQueryFormat += `  ${ relationshipName } = /** @type { ${ relationshipNode } | undefined } */ (undefined)\n`
            constructorQueryFormat += `   * @property { ${ relationshipNode} } [ ${ relationshipName } ] - Set to a ${ relationshipNode } object if you'd love to see \`${ relationshipName }\` information in the response\n`
          })

          bindProps = bindProps.slice(0, -1) // remove trailing \n
          pipeQueryProps = pipeQueryProps.slice(0, -2) // remove trailing pipe
          constructorInsert = constructorInsert.slice(0, -1) // remove trailing \n
          commaQueryPropsAndRelationships = commaQueryPropsAndRelationships.slice(0, -2) // remove trailing comma
          constructorQueryFormat = constructorQueryFormat.slice(0, -1) // remove trailing \n
          fieldsQueryFormat = fieldsQueryFormat.slice(0, -1) // remove trailing \n

          code += `/** NODE: ${ node } */
export class ${ node } {
  /** @type { string } */
  uid
${ fieldsInsert }
  /**
   * @typedef { object } ${ node }Options
   * @property { string } uid
${ constructorInsert }
   *
   * @param { ${ node }Options } options
   */
  constructor (options) {
    this.uid = options.uid
${ bindProps }
  }
}


export class ${ node }Insert {
  $nodeName = '${ node }'
  /** @type { string } */
  uid
${ fieldsInsert }
  /**
   * @typedef { object } ${ node }InsertOptions
   * @property { string } uid
${ constructorInsert }
   *
   * @param { ${ node }InsertOptions } options
   */
  constructor (options) {
    this.uid = options.uid
${ bindProps }
  }
}


export class ${ node }QueryMany {
  is = { str: 'many', many: true, node: '${ node }' }
  /** @type { string } */
  url
  /** @type { string } */
  property
  /** @type { ${ node }FormatMany } */
  format

  /**
   * @typedef { object } ${ node }QueryManyOptions
   * @property { string } url - This is the URL to your Ace Graph Database
   * @property { string } property - The response will be an object, the object's property that will hold this data is defined here
   * @property { ${ node }FormatMany } format - Format the response exactly how you love
   *
   * @param { ${ node }QueryManyOptions } options
   */
  constructor (options) {
    this.url = options.url
    this.property = options.property
    this.format = options.format
  }
}


export class ${ node }QueryUid {
  is = { str: 'uid', uid: true, node: '${ node }' }
  /** @type { string } */
  url
  /** @type { string } */
  property
  /** @type { ${ node }FormatOne } */
  format
  /** @type { string } */
  uid

  /**
   * @typedef { object } ${ node }QueryUidOptions
   * @property { string } url - This is the URL to your Ace Graph Database
   * @property { string } uid - This is the uid you would love to find
   * @property { string } property - The response will be an object, the object's property that will hold this data is defined here
   * @property { ${ node }FormatOne } format - Format the response exactly how you love
   *
   * @param { ${ node }QueryUidOptions } options
   */
  constructor (options) {
    this.url = options.url
    this.property = options.property
    this.format = options.format
    this.uid = options.uid
  }
}${ exactString }


export class ${ node }FormatOne {
  $is = { str: 'one', one: true, node: '${ node }' }
  $alias = /** @type { string | undefined } */ (undefined)
  $derived = /** @type { (${ derivedType }) | undefined } */ (undefined)
  uid = /** @type { boolean | acePropertyOptions | undefined } */ (undefined)
${ fieldsQueryFormat }

  /**
   * @typedef { object } ${ node }FormatOneOptions
   * @property { string } [ $alias ] - ${ descriptions.$alias }
   * @property { ${ derivedType } } [ $derived ] - ${ descriptions.$derived }
   * @property { boolean | acePropertyOptions } [ uid ] - ${ getPropDescription('uid') }
${ constructorQueryFormat }
   *
   * @param { ${ node }FormatOneOptions } options
   */
  constructor (options) {
    construct(this, options, [ '$alias', '$derived', 'uid', ${ commaQueryPropsAndRelationships } ])
  }
}


export class ${ node }FormatMany {
  $is = { str: 'many', many: true, node: '${ node }' }
  $alias = /** @type { string | undefined } */ (undefined)
  $count = /** @type { number | undefined  } */ (undefined)
  $skip = /** @type { number | undefined  } */ (undefined)
  $sort = /** @type { { property: ${ pipeQueryProps }, direction: enums.sortOptions }  | undefined } } */ (undefined)
  $where = /** @type { (${ whereType }) | undefined } */ (undefined)
  $derived = /** @type { (${ derivedType }) | undefined } */ (undefined)
  uid = /** @type { boolean | acePropertyOptions | undefined } */ (undefined)
${ fieldsQueryFormat }

  /**
   * @typedef { object } ${ node }FormatManyOptions
   * @property { string } [ $alias ] - ${ descriptions.$alias }
   * @property { number } [ $count ] - ${ descriptions.$count }
   * @property { number } [ $skip ] - ${ descriptions.$skip }
   * @property { ${ whereType } } [ $where ] - ${ descriptions.$where }
   * @property { ${ derivedType } } [ $derived ] - ${ descriptions.$derived }
   * @property { { property: ${ pipeQueryProps }, direction: enums.sortOptions } } [ $sort ] - ${ descriptions.$sort }
   * @property { boolean | acePropertyOptions } [ uid ] - ${ getPropDescription('uid') }
${ constructorQueryFormat }
   *
   * @param { ${ node }FormatManyOptions } options
   */
  constructor (options) {
    construct(this, options, [ '$alias', '$count', '$skip', '$sort', '$where',  '$derived', 'uid', ${ commaQueryPropsAndRelationships } ])
  }
}\n\n\n`
        }
      }

      if (schema?.relationships) {
        for (const relationshipName in schema.relationships) {
          const options = schema.relationships[relationshipName]
          const directionPropsMatch = options.directions[0].nodeName === options.directions[1].nodeName && options.directions[0].nodePropName === options.directions[1].nodePropName

          /**
           * @param { 'one' | 'many' } has 
           */
          function getRelationshipDataType (has) {
            let response = ''

            if (directionPropsMatch) response = '[ string, string ]'
            else if (has === 'many') response = 'string[]'
            else response = 'string'

            return response
          }

          /**
           * @param { number } index 
           * @returns { string }
           */
          function getConstructorRelationship (index) {
            return `   * @property { ${ getRelationshipDataType(options.directions[index].has) } } ${ options.directions[index].nodePropName }\n`
          }

          /**
           * @param { number } index 
           * @returns { string }
           */
          function getFieldsRelationship (index) {
            return `  /** @type { ${ getRelationshipDataType(options.directions[index].has) } } */\n  ${ options.directions[index].nodePropName }\n`
          }

          let bindProps = `    this.${ options.directions[0].nodePropName } = options.${ options.directions[0].nodePropName }\n`
          let constructorRelationship = getConstructorRelationship(0)
          let fieldsRelationship = getFieldsRelationship(0)

          if (!directionPropsMatch) {
            bindProps += `    this.${ options.directions[1].nodePropName } = options.${ options.directions[1].nodePropName }\n`
            constructorRelationship += getConstructorRelationship(1)
            fieldsRelationship += getFieldsRelationship(1)
          }

          for (const propName in options.props) {
            const schemaPropOptions = options.props[propName]
            const dataType = getDataType(schemaPropOptions.dataType)

            bindProps += `    this.${ propName } = options.${ propName }\n`
            constructorRelationship += `   * @property { ${ dataType } } ${ propName }\n`
            fieldsRelationship += `  /** @type { ${ dataType } } */\n  ${ propName }\n`
          }

          bindProps = bindProps.slice(0, -1) // remove trailing \n
          fieldsRelationship = fieldsRelationship.slice(0, -1) // remove trailing \n
          constructorRelationship = constructorRelationship.slice(0, -1) // remove trailing \n

          code += `/** RELATIONSHIP: ${ relationshipName } */
export class ${ relationshipName }Insert {
  $relationshipName = '${ relationshipName }'
${ fieldsRelationship }

  /**
   * @typedef { object } ${ relationshipName }InsertOptions
${ constructorRelationship }
   *
   * @param { ${ relationshipName }InsertOptions } options
   */
  constructor(options) {
${ bindProps }
  }
}\n\n`
        }
      }

      return code.trim()
    }


    /**
     * Manifest classes.js
     * Manifet typedefs.js
     * Manifest enums.js
     * Manifest tsconfig.json
     */
    async function manifestTypedefsEnumsAndTsconfig () {
      return Promise.all([
        fs.writeFile(`${ files.dir }/${ files.src }/${ files.classes }`, getClassesCode()),



        fs.writeFile(`${ files.dir }/${ files.src }/${ files.jsTypedefs }`, `import * as enums from './${ files.enums }'
import * as classes from './${ files.classes }'


/** QUERY
 * 
 * @typedef { classes.QueryWhere | classes.QueryWhereGroup } QueryWhere
 *
 * @typedef { object } QueryFormatOptions
 * @property { number } [ $count ]
 * @property { number } [ $skip ]
 * @property { QuerySortOptions } [ $sort ]
 * @property { QueryWhere } [ $where ]
 * @property { boolean } [ $derived ]
 *
 * @typedef { object } QueryOptions
 * @property { any } responseNode - Response for this node
 * @property { QueryFormatOptions } formatOptions
 *
 * @typedef { object } QuerySortOptions
 * @property { enums.sortOptions } direction
 * @property { string } property
 *
 * @typedef { object } QueryRequestUid
 * @property { { str: 'uid', uid: true, node: '' } } is
 * @property { string } property
 * @property { string } url
 * @property { enums.nodeNames } node
 * @property { string } [ uid ]
 * @property { never } [ exact ]
 * @property { QueryRequestFormatOne } format
 * 
 * @typedef { object } QueryRequestExact
 * @property { { str: 'exact', exact: true, node: '' } } is
 * @property { string } property
 * @property { string } url
 * @property { enums.nodeNames } node
 * @property { never } [ uid ]
 * @property { { property: string, value: string | boolean | number } } [ exact ]
 * @property { QueryRequestFormatOne } format
 *
 * @typedef { object } QueryRequestMany
 * @property { { str: 'many', many: true, node: '' } } is
 * @property { string } property
 * @property { string } url
 * @property { enums.nodeNames } node
 * @property { never } [ uid ]
 * @property { never } [ exact ]
 * @property { QueryRequestFormatMany } format
 *
 * @typedef { object } QueryRequestFormatOne
 * @property { boolean } [ uid ]
 * @property { string } [ $alias ]
 * @property { never } [ $count ]
 * @property { never } [ $skip ]
 * @property { never } [ $sort ]
 *
 * @typedef { object } QueryRequestFormatMany
 * @property { boolean } [ uid ]
 * @property { string } [ $alias ]
 * @property { number } [ $skip ]
 * @property { number } [ $count ]
 * @property { { is: any, value: any } } [ $where ]
 * @property { { direction: enums.sortOptions, property: string } } [ $sort ]
 * 
 * @typedef { QueryRequestFormatOne | QueryRequestFormatMany } QueryRequestFormat
 * 
 * @typedef { object } QueryResponse
 * @property { any } object
 * @property { any[] } array
 */


/** MUTATE
 *
 * @typedef { { put: string[], identity: { [k: string]: string } } } MutateResponse
 *
 * @typedef { { $nodeName: string, uid: string, [nodePropName: string]: any } } MutateSertNode
 * @typedef { { $relationshipName: string, [propName: string]: any } } MutateSertRelationship
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


${ manifestNodeTypedefs() }
`),

        fs.writeFile(`${ files.dir }/${ files.src }/${ files.enums }`, getEnumsCode()),

        fs.writeFile(`${ files.dir }/${ files.src }/${ files.tsconfig }`, `{
  "files": [
    "${ files.jsTypedefs }",
    "${ files.enums }",
    "${ files.classes }"
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
        fs.writeFile(`${files.dir}/${files.dist}/${files.tsIndex}`, `export * as enums from './enums.d.ts'\nexport * as td from './typedefs.d.ts'\nexport *  from './classes.d.ts'`),
        fs.writeFile(`${ files.dir }/${ files.dist }/${ files.jsIndex }`, `export * as enums from './enums.js'\nexport * as td from './typedefs.js'\nexport *  from './classes.js'`)
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
          enumDataStructure.forEach((a, b) => {
            const { key, value } = getKeyAndValue(enumStr, a, b)
            result += `
/** @type { '${ value }' } */
const ${ key } = '${ value }'\n`
          })

          result += `\n/** @typedef {`

          enumDataStructure.forEach((a, b) => {
            const { key } = getKeyAndValue(enumStr, a, b)
            result += ` '${ key }' |`
          })

          result = result.replace(/.$/, `} ${ enumStr } */
export const ${ enumStr } = {`)

          enumDataStructure.forEach((a, b) => {
            const { key } = getKeyAndValue(enumStr, a, b)
            result += ` ${ key },`
          })

          result = result.replace(/.$/, ' }\n\n\n')
          }
      })

      return result.trim()
    }



    /**
     * Manifest the typedefs for all nodes in schema
     * @returns { string }
     */
    function manifestNodeTypedefs () {
      let typedefs = ''
      let mutateRequest = ''
      let queryRequestArray = []
      let nodeNames = /** @type { string[] } */ ([])
      let queryRequestTypedef = ' * @typedef { QueryRequestUid | QueryRequestExact | QueryRequestMany } QueryRequest'

      if (schema?.nodes) {
        for (const nodeName in schema.nodes) {
          let hasExactIndex = false

          nodeNames.push(nodeName)
          mutateRequest += `classes.${ nodeName }Insert | `

          for (const schemaNodePropName in schema.nodes[nodeName]) {
            const options = schema.nodes[nodeName][schemaNodePropName]
            if (options.indices?.includes('exact')) hasExactIndex = true
          }

          let relationshipFormat = ''

          if (schema?.relationships) {
            for (const relationshipName in schema.relationships) {
              const options = schema.relationships[relationshipName]

              mutateRequest += `classes.${ relationshipName }Insert | `

              if (options.directions[0].nodeName === nodeName) relationshipFormat += `\n * @property { ace${ options.directions[1].nodeName }QueryFormat${ options.directions[0].has === 'one' ? 'One' : 'Many' } } [ ${ options.directions[0].nodePropName } ]`
              else if (options.directions[1].nodeName === nodeName) relationshipFormat += `\n * @property { ace${ options.directions[0].nodeName }QueryFormat${ options.directions[1].has === 'one' ? 'One' : 'Many' } } [ ${ options.directions[1].nodePropName } ]`
            }
          }

          if (hasExactIndex) queryRequestArray.push(`classes.${ nodeName }QueryUid | classes.${ nodeName }QueryExact | classes.${ nodeName }QueryMany`)
          else queryRequestArray.push(`classes.${ nodeName }QueryUid | classes.${ nodeName }QueryMany`)
        }

        if (nodeNames.length) queryRequestTypedef = ' * @typedef { ' + queryRequestArray.join(' | ') + ' } QueryRequest'
        if (mutateRequest.length) mutateRequest = mutateRequest.slice(0, -3) // remove trailing pipe
      }

      typedefs += `/** MULTIPLE NODES
 *
${ queryRequestTypedef }
 *
 * @typedef { object } MutateRequest
 * @property { ${ mutateRequest ? `(${ mutateRequest })[]` : 'any[]'} } [ insert ]
 */`

      return typedefs
    }


    /**
     * Convert a node data type to an add data data type
     * @param { string } dataType 
     */
    function getDataType (dataType) {
      switch (dataType) {
        case 'isoString':
          return 'string'
        default:
          return dataType
      }
    }

    console.log(`🌟 Manifested enums, typedefs (js) and types (ts)!`)
  } catch (e) {
    console.log(e)
  }
})()
