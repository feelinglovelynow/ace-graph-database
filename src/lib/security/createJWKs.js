import { getAlgorithmOptions } from './getAlgorithmOptions.js'


/**
 * Creates 1 set of public & private JWK's
 * @returns { Promise<{ privateJWK: string, publicJWK: string }> }
*/
export async function createJWKs () {
  /** @type { CryptoKeyPair } */ // @ts-ignore
  const { privateKey, publicKey } = await crypto.subtle.generateKey(getAlgorithmOptions('generate'), true, ['sign', 'verify'])
  const v = await Promise.all([ crypto.subtle.exportKey('jwk', privateKey), crypto.subtle.exportKey('jwk', publicKey) ])

  return { privateJWK: JSON.stringify(v[0]), publicJWK: JSON.stringify(v[1]) }
}
