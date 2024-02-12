/**
 * Get algorithm options 
 * @param { 'sign' | 'verify' | 'generate' | 'import' } isFor 
 * @returns { { name: string, namedCurve: string } | { name: string, hash: { name: string } } }
*/
export function getAlgorithmOptions (isFor) {
  switch (isFor) {
    case 'import':
    case 'generate':
      return { name: 'ECDSA', namedCurve: 'P-521' }
    case 'sign':
    case 'verify':
      return { name: 'ECDSA', hash: { name: 'SHA-512' } }
  }
}
