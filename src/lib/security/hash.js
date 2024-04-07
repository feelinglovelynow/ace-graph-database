import { getAlgorithmOptions } from './getAlgorithmOptions.js'


/**
 * @param { CryptoKey } privateKey
 * @param { string } hashOriginal
 * @returns { Promise<string> }
 */
export async function sign (privateKey, hashOriginal) {
  const hashUint8 = new TextEncoder().encode(hashOriginal)
  const hashArrayBuffer = await crypto.subtle.sign(getAlgorithmOptions('sign'), privateKey, hashUint8)
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashArrayBuffer)))

  return hashBase64
}


/**
 * @param { CryptoKey } publicKey
 * @param { string } hashOriginal
 * @param { string } hashBase64
 * @returns { Promise<boolean> }
 */
export async function verify (publicKey, hashOriginal, hashBase64) {
  const hashUint8 = new TextEncoder().encode(hashOriginal)
  const hashArrayBuffer = Uint8Array.from(atob(hashBase64), c => c.charCodeAt(0))
  const isValid = await crypto.subtle.verify(getAlgorithmOptions('verify'), publicKey, hashArrayBuffer, hashUint8)

  return isValid
}
