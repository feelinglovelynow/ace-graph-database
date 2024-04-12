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
    const split = entry[1].split('=')
    if (split.length === 2) bashMap.set(split[0], split[1])
  }

  return bashMap
}
