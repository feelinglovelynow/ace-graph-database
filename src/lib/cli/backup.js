import { aceFetch } from '../aceFetch.js'
import { CLIFalsyError } from '../objects/AceError.js'


/**
 * @param { string } host
 * @returns { Promise<string> }
 */
export async function getBackupFromSchema (host) {
  const response = await aceFetch({ url: host + '/ace', body: { request: { id: 'BackupGet', property: 'backup' } } })
  return response.backup
}


/**
 * @param { [number, string][] } bashEntries
 * @returns
 */
export function parseBackupLoadEntries (bashEntries) {
  let file, worker
  const three = bashEntries[3]?.[1]
  const four = bashEntries[4]?.[1]

  if (three?.startsWith('-f') || three?.startsWith('--file')) file = three.split('=')?.[1]
  else if (four?.startsWith('-f') || four?.startsWith('--file')) file = four.split('=')?.[1]

  if (three?.startsWith('-w') || three?.startsWith('--worker')) worker = three.split('=')?.[1]
  else if (four?.startsWith('-w') || four?.startsWith('--worker')) worker = four.split('=')?.[1]

  CLIFalsyError('file', '-f', '--file', file)
  CLIFalsyError('url', '-w', '--worker', worker)

  return {
    file, worker
  }
}
