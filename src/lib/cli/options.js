import { td } from '#ace'


/**
 * @param { NodeJS.Process } process
 * @returns { td.AceCLIOptions }
 */
export function getCliOptions (process) {
  const bashEntries = [ ...process.argv.entries() ]

  
  /** @type { Map<string, string> } */
  const bashMap = new Map()

  for (const entry of bashEntries) {
    const index = entry[1].indexOf('=')
    const key = entry[1].substring(0, index)
    const value = entry[1].substring(index + 1)

    if (key && value) bashMap.set(key, value)
  }

  return bashMap
}
