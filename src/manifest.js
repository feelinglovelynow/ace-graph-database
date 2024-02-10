#!/usr/bin/env node

import util from 'node:util'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { classInfoNames } from './enums/classInfoNames.js'
import { dataTypes } from './enums/dataTypes.js'
import { endpoints } from './enums/endpoints.js'
import { has } from './enums/has.js'
import { indices } from './enums/indices.js'
import { queryDerivedSymbol } from './enums/queryDerivedSymbol.js'
import { queryWhereGroupSymbol } from './enums/queryWhereGroupSymbol.js'
import { schemaPropOptions } from './enums/schemaPropOptions.js'
import { schemaRelationshipPropOptions } from './enums/schemaRelationshipPropOptions.js'
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
      enumsMap.set('classInfoNames', classInfoNames)
      enumsMap.set('dataTypes', dataTypes)
      enumsMap.set('endpoints', endpoints)
      enumsMap.set('has', has)
      enumsMap.set('indices', indices)
      enumsMap.set('queryDerivedSymbol', queryDerivedSymbol)
      enumsMap.set('queryWhereGroupSymbol', queryWhereGroupSymbol)
      enumsMap.set('schemaPropOptions', schemaPropOptions)
      enumsMap.set('schemaRelationshipPropOptions', schemaRelationshipPropOptions)
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


export class QueryAverageAsProperty {
  info = { name: enums.classInfoNames.QueryAverageAsProperty, QueryAverageAsProperty: true }
  /** @type { string } */
  averageProperty
  /** @type { string } */
  newProperty

  /**
   * @typedef { object } QueryAverageAsPropertyeOptions
   * @property { string } averageProperty
   * @property { string } newProperty
   *
   * @param { QueryAverageAsPropertyeOptions } options
   */
  constructor(options) {
    this.averageProperty = options.averageProperty
    this.newProperty = options.newProperty
  }
}


export class QuerySumAsProperty {
  info = { name: enums.classInfoNames.QuerySumAsProperty, QuerySumAsProperty: true }
  /** @type { string } */
  sumProperty
  /** @type { string } */
  newProperty

  /**
   * @typedef { object } QuerySumAsPropertyOptions
   * @property { string } sumProperty
   * @property { string } newProperty
   *
   * @param { QuerySumAsPropertyOptions } options
   */
  constructor(options) {
    this.sumProperty = options.sumProperty
    this.newProperty = options.newProperty
  }
}


export class QuerySort {
  info = { name: enums.classInfoNames.QuerySort, QuerySort: true }
  /** @type { 'asc' | 'dsc' } */
  direction
  /** @type { string } */
  property

  /**
   * @typedef { object } QuerySortOptions
   * @property { 'asc' | 'dsc' } direction
   * @property { string } property
   *
   * @param { QuerySortOptions } options
   */
  constructor (options) {
    this.direction = options.direction
    this.property = options.property
  }
}


export class QueryAliasProperty {
  info = { name: enums.classInfoNames.QueryAliasProperty, QueryAliasProperty: true }
  /** @type { string } */
  alias

  /**
   * @param { string } alias
   */
  constructor (alias) {
    this.alias = alias
  }
}


export class QueryLimit {
  info = { name: enums.classInfoNames.QueryLimit, QueryLimit: true }
  skip = /** @type { number | undefined } */ (undefined)
  count = /** @type { number | undefined } */ (undefined)

  /**
   * @typedef { object } QueryLimitOptions
   * @property { number } [ skip ]
   * @property { number } [ count ]
   *
   * @param { QueryLimitOptions } options
   */
  constructor (options) {
    construct(this, options, [ 'skip', 'count' ])
  }
}


export class QueryDerivedProperty {
  info = { name: enums.classInfoNames.QueryDerivedProperty, QueryDerivedProperty: true }
  /** @type { string } */
  property
  /** @type { enums.queryDerivedSymbol } */
  symbol
  /** @type { (QueryProperty | QueryValue | QueryDerivedGroup)[] } */
  items

  /**
   * @typedef { object } QueryDerivedPropertyOptions
   * @property { string } property
   * @property { enums.queryDerivedSymbol } symbol
   * @property { (QueryProperty | QueryValue | QueryDerivedGroup)[] } items
   *
   * @param { QueryDerivedPropertyOptions } options
   */
  constructor (options) {
    this.property = options.property
    this.symbol = options.symbol
    this.items = options.items
  }
}


export class QueryDerivedGroup {
  info = { name: enums.classInfoNames.QueryDerivedGroup, QueryDerivedGroup: true }
  /** @type { enums.queryDerivedSymbol } */
  symbol
  /** @type { (QueryProperty | QueryValue | QueryDerivedGroup)[] } */
  items

  /**
   * @typedef { object } QueryDerivedGroupOptions
   * @property { string } property
   * @property { enums.queryDerivedSymbol } symbol
   * @property { (QueryProperty | QueryValue | QueryDerivedGroup)[] } items
   *
   * @param { QueryDerivedGroupOptions } options
   */
  constructor (options) {
    this.symbol = options.symbol
    this.items = options.items
  }
}


export class QueryValue {
  info = { name: enums.classInfoNames.QueryValue, QueryValue: true }
  /** @type { any } */
  value

  /**
   * @param { any } value
   */
  constructor (value) {
    this.value = value
  }
}


export class QueryProperty {
  info = { name: enums.classInfoNames.QueryProperty, QueryProperty: true }
  relationships = /** @type { string[] | undefined } */ (undefined)
  /** @type { string } */
  property

  /**
   * @typedef { object } QueryPropertyOptions
   * @property { string[] } [ relationships ]
   * @property { string } property
   *
   * @param { QueryPropertyOptions } options
   */
  constructor (options) {
    this.relationships = options.relationships
    this.property = options.property
  }
}


export class QueryWhere {
  info = { name: enums.classInfoNames.QueryWhere, QueryWhere: true }
  /** @type { enums.queryWhereSymbol } */
  symbol
  /** @type { [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } */
  items

  /**
   * @typedef { object } QueryWhereOptions
   * @property { enums.queryWhereSymbol } symbol
   * @property { [ QueryProperty, QueryProperty ] | [ QueryValue, QueryProperty ] | [ QueryProperty, QueryValue ] } items
   *
   * @param { QueryWhereOptions } options
   */
  constructor (options) {
    this.symbol = options.symbol
    this.items = options.items
  }
}


export class QueryWhereDefined {
  info = { name: enums.classInfoNames.QueryWhereDefined, QueryWhereDefined: true }
  /** @type { QueryProperty } */
  property

  /**
   * @param { QueryProperty } property
   */
  constructor (property) {
    this.property = property
  }
}


export class QueryWhereUndefined {
  info = { name: enums.classInfoNames.QueryWhereUndefined, QueryWhereUndefined: true }
  /** @type { QueryProperty } */
  property

  /**
   * @param { QueryProperty } property
   */
  constructor (property) {
    this.property = property
  }
}


export class QueryWhereGroup {
  info = { name: enums.classInfoNames.QueryWhereGroup, QueryWhereGroup: true }
  /** @type { enums.queryWhereGroupSymbol } */
  symbol
  /** @type { (QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup)[] } */
  items

  /**
   * @typedef { object } QueryWhereGroupOptions
   * @property { enums.queryWhereGroupSymbol } symbol
   * @property { (QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup)[] } items
   *
   * @param { QueryWhereGroupOptions } options
   */
  constructor (options) {
    this.symbol = options.symbol
    this.items = options.items
  }
}


export class Schema {
  nodes = /** @type { { [nodeName: string]: { [propName: string]: SchemaProp | SchemaRelationshipProp } } | undefined } */ (undefined)
  relationships = /** @type { { [relationshipName: string]: SchemaOneToOne | SchemaOneToMany | SchemaManyToMany } | undefined } */ (undefined)

  /**
   * @typedef { object } SchemaOptions
   * @property { { [nodeName: string]: { [propName: string]: SchemaProp | SchemaRelationshipProp } } } [ nodes ]
   * @property { { [relationshipName: string]: SchemaOneToOne | SchemaOneToMany | SchemaManyToMany } } [ relationships ]
   *
   * @param { SchemaOptions } options
   */
  constructor (options) {
    construct(this, options, [ 'nodes', 'relationships' ])
  }
}


export class SchemaProp {
  info = { name: enums.classInfoNames.SchemaProp, SchemaProp: true }
  /** @type { enums.dataTypes } */
  dataType
  indices = /** @type { enums.indices[] | undefined } */ (undefined)
  options = /** @type { enums.schemaPropOptions[] | undefined } */ (undefined)

  /**
   * @typedef { object } SchemaPropOptions
   * @property { enums.dataTypes } dataType
   * @property { enums.indices[] } [ indices ]
   * @property { enums.schemaPropOptions[] } [ options ]
   *
   * @param { SchemaPropOptions } options
   */
  constructor (options) {
    this.dataType = options.dataType
    this.indices = options.indices
    this.options = options.options
  }
}


export class SchemaRelationshipProp {
  info = { name: enums.classInfoNames.SchemaRelationshipProp, SchemaRelationshipProp: true }
  /** @type { enums.has } */
  has
  /** @type { string } */
  nodeName
  /** @type { string } */
  relationshipName
  options = /** @type { enums.schemaRelationshipPropOptions[] | undefined } */ (undefined)

  /**
   * @typedef { object } SchemaRelationshipPropOptions
   * @property { enums.has } has
   * @property { string } nodeName
   * @property { string } relationshipName
   * @property { enums.schemaRelationshipPropOptions[] } [ options ]
   *
   * @param { SchemaRelationshipPropOptions } options
   */
  constructor (options) {
    this.has = options.has
    this.nodeName = options.nodeName
    this.relationshipName = options.relationshipName
\    this.options = options.options
  }
}


class SchemaXToY {
  props = /** @type { { [propName: string]: SchemaProp } | undefined } */ (undefined)

  /** @param { { [propName: string]: SchemaProp } } [ props ] */
  constructor(props) {
    this.props = props
  }
}
export class SchemaOneToOne extends SchemaXToY {
  info = { name: enums.classInfoNames.SchemaOneToOne, SchemaOneToOne: true }
}
export class SchemaOneToMany extends SchemaXToY {
  info = { name: enums.classInfoNames.SchemaOneToMany, SchemaOneToMany: true }
}
export class SchemaManyToMany extends SchemaXToY {
  info = { name: enums.classInfoNames.SchemaManyToMany, SchemaManyToMany: true }
}\n\n\n`


      /**
       * @param { string } prop 
       * @returns { string }
       */
      function getPropDescription (prop) {
        return `Set to true if you would love to see the property \`${ prop }\` in the response.`
      }


      if (schema?.nodes) {
        let relationshipClasses = ''

        for (const nodeName in schema.nodes) {
          const relationshipClassMap = /** Map<formatClassName, {}> @type { Map<string, { propValue: any, capHas: string, relationship: any }> } */ (new Map())
          const exactTypedefs = /** Common exact typedef code @type { string[] } */ ([])
          const schemaProps = /** <propName, { }> @type { Map<string, { propValue: any, mustBeDefined: boolean, dataType: string | boolean | number }> } */ (new Map())

          for (const propName in schema.nodes[nodeName]) {
            const propValue = schema.nodes[nodeName][propName]
            const dataType = getDataType(propValue.dataType)
            const mustBeDefined = propValue.options?.includes('defined') || false

            if (propValue.info.name === 'SchemaRelationshipProp') {
              const capHas = propValue.has === 'one' ? 'One' : 'Many'
              const formatClassName = `${ propValue.relationshipName }${ propValue.nodeName }Format${ capHas }`

              if (!relationshipClassMap.has(formatClassName)) relationshipClassMap.set(formatClassName, { capHas, propValue, relationship: schema.relationships?.[ propValue.relationshipName ] })
            }

            schemaProps.set(propName, { propValue, mustBeDefined, dataType })
            if (propValue.indices?.includes('exact')) exactTypedefs.push(`{ property: '${ propName }', value: ${ dataType } }`)
          }

          relationshipClassMap.forEach(({ capHas, propValue, relationship }, formatClassName) => {
            let commaProps = "'_uid', "
            let fields = '  _uid = /** @type { boolean | QueryAliasProperty | undefined  } */ (undefined)\n'
            let constructorProps = `   * @property { boolean | QueryAliasProperty } [ _uid ] - ${ getPropDescription('_uid') }\n`

            if (relationship.props) {
              for (const propName in relationship.props) {
                commaProps += `'${ propName }', `
                fields += `  ${ propName } = /** @type { boolean | QueryAliasProperty | undefined  } */ (undefined)\n`
                constructorProps += `   * @property { boolean | QueryAliasProperty } [ ${ propName } ] - ${ getPropDescription(propName) }\n`
              }
            }

            fields = fields.slice(0, -1) // remove trailing \n
            commaProps = commaProps.slice(0, -2) // remove trailing comma
            constructorProps = constructorProps.slice(0, -1) // remove trailing \n

            relationshipClasses += `export class ${ formatClassName } extends ${ propValue.nodeName }Format${ capHas } {
  $info = { name: enums.classInfoNames.${ capHas }, ${ capHas }: true, nodeName: '${ propValue.nodeName }', relationshipName: '${ propValue.relationshipName }', ${ formatClassName }: true }
${ fields }

  /**
   * @typedef { object } ${ formatClassName }Options
${ constructorProps }
   *
   * @param { ${ propValue.nodeName }Format${ capHas }Options & ${ formatClassName }Options } options
   */
  constructor (options) {
    super(options)
    construct(this, options, [ ${ commaProps } ])
  }
}\n\n\n`
          })

          const exactTypedef = exactTypedefs.join(' | ')

          const exactString = !exactTypedefs.length ? '' : `\n\nexport class ${ nodeName }QueryExact {
  info = { name: enums.classInfoNames.Exact, Exact: true, nodeName: '${ nodeName }' }
  url = /** @type { string | undefined } */ (undefined)
  property = /** @type { string | undefined } */ (undefined)
  exact = /** @type { ${ exactTypedef } | undefined } */ (undefined)
  format = /** @type { ${ nodeName }FormatOne | undefined } */ (undefined)

  /**
   * @typedef { object } ${ nodeName }QueryExactOptions
   * @property { string } url - This is the URL to your Ace Graph Database
   * @property { ${ exactTypedef } } exact - There is an exact index aplied to this node, using this property allows you to find a node using this index
   * @property { string } property - The response will be an object, the object's property that will hold this data is defined here
   * @property { ${ nodeName }FormatOne } format - Format the response exactly how you love
   *
   * @param { ${ nodeName }QueryExactOptions } options
   */
  constructor (options) { construct(this, options, [ 'url', 'exact', 'property', 'format' ]) }
}`

          const formatOneType = '(QueryDerivedProperty | QueryAliasProperty)[]'
          const formatManyType = '(QueryLimit | QuerySort | QuerySumAsProperty | QueryAverageAsProperty | QueryWhere | QueryWhereDefined | QueryWhereUndefined | QueryWhereGroup | QueryDerivedProperty | QueryAliasProperty)[]'

          let fieldsNode = ''
          let fieldsInsert = ''
          let bindPropsNode = ''
          let constuctorNode = ''
          let pipeQueryProps = ''
          let bindPropsInsert = ''
          let fieldsQueryFormat = ''
          let constructorInsert = ''
          let constructorQueryFormat = ''
          let commaQueryPropsAndRelationships = ''

          schemaProps.forEach(({ propValue, mustBeDefined, dataType }, propName) => {
            pipeQueryProps += `'${ propName }' | `
            commaQueryPropsAndRelationships += `'${ propName }', `
            bindPropsNode += `    this.${ propName } = options.${ propName }\n` 

            const bracketPropName = mustBeDefined ? propName : `[ ${ propName } ]`
            const relationshipDataType = `${ propValue.nodeName }${ propValue.has === 'many' ? '[]' : '' }`
            const relationshipFormatDataType = `${ propValue.relationshipName }${ propValue.nodeName }Format${ propValue.has === 'many' ? 'Many' : 'One' }`
            const defaultFields = mustBeDefined ?
              `  /** @type { ${ dataType } } */\n  ${ propName }\n` :
              `  ${ propName } = /** @type { ${ dataType } | undefined } */ (undefined)\n`

            fieldsInsert += propValue.info.name === 'SchemaProp' ? defaultFields : ''

            constructorQueryFormat += propValue.info.name === 'SchemaProp' ?
              `   * @property { boolean | QueryAliasProperty } [ ${ propName } ] - ${ getPropDescription(propName) }\n` :
              `   * @property { ${ relationshipFormatDataType } } [ ${ propName } ] - ${ getPropDescription(propName) }\n`
            
            fieldsQueryFormat += propValue.info.name === 'SchemaProp' ?
              `  ${ propName } = /** @type { boolean | QueryAliasProperty | undefined  } */ (undefined)\n` :
              `  ${ propName } = /** @type { ${ relationshipFormatDataType } | undefined } */ (undefined)\n`

            fieldsNode += propValue.info.name === 'SchemaProp' ?
              defaultFields :
              mustBeDefined ?
                `  /** @type { ${ relationshipDataType } } */\n  ${ propName }\n` :
                `  ${ propName } = /** @type { ${ relationshipDataType } | undefined } */ (undefined)\n` 

            constuctorNode += propValue.info.name === 'SchemaProp' ?
              `   * @property { ${ dataType } } ${ bracketPropName }\n` :
              `   * @property { ${ relationshipDataType } } ${ bracketPropName }\n`

            if (propValue.info.name === 'SchemaProp') {
              bindPropsInsert += `    this.${ propName } = options.${ propName }\n`
              constructorInsert += `   * @property { ${ dataType } } ${ bracketPropName }\n`
            }
          })

          bindPropsNode = bindPropsNode.slice(0, -1) // remove trailing \n
          bindPropsInsert = bindPropsInsert.slice(0, -1) // remove trailing \n
          pipeQueryProps = pipeQueryProps.slice(0, -2) // remove trailing pipe
          constuctorNode = constuctorNode.slice(0, -1) // remove trailing \n
          constructorInsert = constructorInsert.slice(0, -1) // remove trailing \n
          commaQueryPropsAndRelationships = commaQueryPropsAndRelationships.slice(0, -2) // remove trailing comma
          constructorQueryFormat = constructorQueryFormat.slice(0, -1) // remove trailing \n
          fieldsQueryFormat = fieldsQueryFormat.slice(0, -1) // remove trailing \n

          code += `/** NODE: ${ nodeName } */
export class ${ nodeName } {
  /** @type { string } */
  uid
${ fieldsNode }
  /**
   * @typedef { object } ${ nodeName }Options
   * @property { string } uid
${ constuctorNode }
   *
   * @param { ${ nodeName }Options } options
   */
  constructor (options) {
    this.uid = options.uid
${ bindPropsNode }
  }
}


export class ${ nodeName }Insert {
  $nodeName = '${ nodeName }'
  /** @type { string } */
  uid
${ fieldsInsert }
  /**
   * @typedef { object } ${ nodeName }InsertOptions
   * @property { string } uid
${ constructorInsert }
   *
   * @param { ${ nodeName }InsertOptions } options
   */
  constructor (options) {
    this.uid = options.uid
${ bindPropsInsert }
  }
}


export class ${ nodeName }QueryMany {
  info = { name: enums.classInfoNames.Many, Many: true, nodeName: '${ nodeName }' }
  /** @type { string } */
  url
  /** @type { string } */
  property
  /** @type { ${ nodeName }FormatMany } */
  format

  /**
   * @typedef { object } ${ nodeName }QueryManyOptions
   * @property { string } url - This is the URL to your Ace Graph Database
   * @property { string } property - The response will be an object, the object's property that will hold this data is defined here
   * @property { ${ nodeName }FormatMany } format - Format the response exactly how you love
   *
   * @param { ${ nodeName }QueryManyOptions } options
   */
  constructor (options) {
    this.url = options.url
    this.property = options.property
    this.format = options.format
  }
}


export class ${ nodeName }QueryUid {
  info = { name: enums.classInfoNames.Uid, Uid: true, nodeName: '${ nodeName }' }
  /** @type { string } */
  url
  /** @type { string } */
  property
  /** @type { ${ nodeName }FormatOne } */
  format
  /** @type { string } */
  uid

  /**
   * @typedef { object } ${ nodeName }QueryUidOptions
   * @property { string } url - This is the URL to your Ace Graph Database
   * @property { string } uid - This is the uid you would love to find
   * @property { string } property - The response will be an object, the object's property that will hold this data is defined here
   * @property { ${ nodeName }FormatOne } format - Format the response exactly how you love
   *
   * @param { ${ nodeName }QueryUidOptions } options
   */
  constructor (options) {
    this.url = options.url
    this.property = options.property
    this.format = options.format
    this.uid = options.uid
  }
}${ exactString }


export class ${ nodeName }FormatOne {
  $info = { name: enums.classInfoNames.One, One: true, nodeName: '${ nodeName }' }
  $options = /** @type { ${ formatOneType } | undefined } */ (undefined)
  uid = /** @type { boolean | QueryAliasProperty | undefined } */ (undefined)
${ fieldsQueryFormat }

  /**
   * @typedef { object } ${ nodeName }FormatOneOptions
   * @property { ${ formatOneType } } [ $options ]
   * @property { boolean | QueryAliasProperty } [ uid ] - ${ getPropDescription('uid') }
${ constructorQueryFormat }
   *
   * @param { ${ nodeName }FormatOneOptions } options
   */
  constructor (options) {
    construct(this, options, [ '$options', 'uid', ${ commaQueryPropsAndRelationships } ])
  }
}


export class ${ nodeName }FormatMany {
  $info = { name: enums.classInfoNames.Many, Many: true, nodeName: '${ nodeName }' }
  $options = /** @type { ${ formatManyType } | undefined } */ (undefined)
  uid = /** @type { boolean | QueryAliasProperty | undefined } */ (undefined)
${ fieldsQueryFormat }

  /**
   * @typedef { object } ${ nodeName }FormatManyOptions
   * @property { ${ formatManyType } } [ $options ]
   * @property { boolean | QueryAliasProperty } [ uid ] - ${ getPropDescription('uid') }
${ constructorQueryFormat }
   *
   * @param { ${ nodeName }FormatManyOptions } options
   */
  constructor (options) {
    construct(this, options, [ '$options', 'uid', ${ commaQueryPropsAndRelationships } ])
  }
}\n\n\n`
        }

        code += relationshipClasses
      }

      if (schema?.relationships) {
        for (const relationshipName in schema.relationships) {
          const options = schema.relationships[relationshipName]

          let bindProps = `    this.a = options.a\n    this.b = options.b\n`
          let constructorRelationship = ''
          let fieldsRelationship = ''
          
          if (options.props) {
            for (const propName in options.props) {
              const schemaPropOptions = options.props[propName]
              const dataType = getDataType(schemaPropOptions.dataType)
              const mustBeDefined = schemaPropOptions.options?.includes('defined') || false

              bindProps += `    this.${ propName } = options.${ propName }\n`
              constructorRelationship += mustBeDefined ? `\n   * @property { ${ dataType } } ${ propName }` : `\n   * @property { ${ dataType } } [ ${ propName } ]`
              fieldsRelationship += mustBeDefined ? `\n  /** @type { ${ dataType } } */\n  ${ propName }` : `\n  ${ propName } = /** @type { ${ dataType } | undefined } */ (undefined)`
            }
          }

          bindProps = bindProps.slice(0, -1) // remove trailing \n

          code += `/** RELATIONSHIP: ${ relationshipName } */
export class ${ relationshipName }Insert {
  $relationshipName = '${ relationshipName }'
  /** @type { string } */
  a
  /** @type { string } */
  b${ fieldsRelationship }

  /**
   * @typedef { object } ${ relationshipName }InsertOptions
   * @property { string } a
   * @property { string } b${ constructorRelationship }
   *
   * @param { ${ relationshipName }InsertOptions } options
   */
  constructor (options) {
${ bindProps }
  }
}\n\n\n`
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
 * @typedef { object } QueryRequestUid
 * @property { { name: typeof enums.classInfoNames.Uid, Uid: true, nodeName: string } } info
 * @property { string } property
 * @property { string } url
 * @property { enums.nodeNames } node
 * @property { string } [ uid ]
 * @property { never } [ exact ]
 * @property { QueryRequestFormatOne } format
 * 
 * @typedef { object } QueryRequestExact
 * @property { { name: typeof enums.classInfoNames.Exact, Exact: true, nodeName: string } } info
 * @property { string } property
 * @property { string } url
 * @property { enums.nodeNames } node
 * @property { never } [ uid ]
 * @property { { property: string, value: string | boolean | number } } [ exact ]
 * @property { QueryRequestFormatOne } format
 *
 * @typedef { object } QueryRequestMany
 * @property { { name: typeof enums.classInfoNames.Many, Many: true, nodeName: string } } info
 * @property { string } property
 * @property { string } url
 * @property { enums.nodeNames } node
 * @property { never } [ uid ]
 * @property { never } [ exact ]
 * @property { QueryRequestFormatMany } format
 *
 * @typedef { { [propertyName: string]: any,    $info: { name: typeof enums.classInfoNames.One, One: true, nodeName: string, relationshipName?: string },      uid?: boolean | classes.QueryAliasProperty,   $options?: (classes.QueryDerivedProperty | classes.QueryAliasProperty)[] } } QueryRequestFormatOne
 * @typedef { { [propertyName: string]: any,    $info: { name: typeof enums.classInfoNames.Many, Many: true, nodeName: string, relationshipName?: string },    uid?: boolean | classes.QueryAliasProperty,   $options?: (classes.QueryLimit | classes.QuerySort | classes.QuerySumAsProperty | classes.QueryAverageAsProperty | classes.QueryWhere | classes.QueryWhereGroup | classes.QueryWhereDefined | classes.QueryWhereUndefined | classes.QueryDerivedProperty | classes.QueryAliasProperty)[] } } QueryRequestFormatMany
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

          if (schema?.relationships) {
            for (const relationshipName in schema.relationships) {
              const options = schema.relationships[relationshipName]

              mutateRequest += `classes.${ relationshipName }Insert | `
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
