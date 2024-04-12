import { dataTypes } from '../enums/dataTypes.js'
import { has } from '../enums/has.js'
import { idsAce } from '../enums/idsAce.js'
import { idsQueryOptions } from '../enums/idsQueryOptions.js'
import { idsSchema } from '../enums/idsSchema.js'
import { passportSource } from '../enums/passportSource.js'
import { permissionActions } from '../enums/permissionActions.js'
import { queryDerivedSymbol } from '../enums/queryDerivedSymbol.js'
import { queryWhereGroupSymbol } from '../enums/queryWhereGroupSymbol.js'
import { queryWhereSymbol } from '../enums/queryWhereSymbol.js'
import { settings } from '../enums/settings.js'
import { sortOptions } from '../enums/sortOptions.js'



/**
 * @param { { nodes: any; relationships: any; } | null } schema
 * @returns {Map<string, Map<string, string> | Set<string>>}
 */
function setEnumsMap (schema) {
  const enumsMap = new Map()

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

  return enumsMap
}


/**
 * Generate the code for .ace/enums.js
 * @param { { nodes: any; relationships: any; } | null } schema
 * @returns { string }
 */
export function enums (schema) {
  let result = ''

  const enumsMap = setEnumsMap(schema)

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
