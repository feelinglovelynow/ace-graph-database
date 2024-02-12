import { subtle } from 'node:crypto'
import { getAlgorithmOptions } from './getAlgorithmOptions.js'

/**
 * This function will log the public & private JWK's in the terminal.
 * @returns { Promise<void> }
*/
(async function createJWKs () {
  /** @type { CryptoKeyPair } */ // @ts-ignore
  const { privateKey, publicKey } = await subtle.generateKey(getAlgorithmOptions('generate'), true, ['sign', 'verify'])

  console.log('privateJWK', JSON.stringify(await subtle.exportKey('jwk', privateKey)))
  console.log('publicJWK', JSON.stringify(await subtle.exportKey('jwk', publicKey)))
})()
