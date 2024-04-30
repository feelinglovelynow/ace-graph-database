import { cryptAlgorithm, uint8ToBase64, base64ToUint8, arrayBufferToBase64, arrayBufferToString, stringToUint8 } from './util.js'


/**
 * @param { string } original 
 * @param { string } jwk 
 */
export async function encrypt (original, jwk) {
  const ivUint8 = crypto.getRandomValues(new Uint8Array(16))
  const ivBase64 = uint8ToBase64(ivUint8)

  const cryptoKey = await crypto.subtle.importKey('jwk', JSON.parse(jwk), cryptAlgorithm, true, ['encrypt', 'decrypt'])
  const encryptArrayBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: base64ToUint8(ivBase64) }, cryptoKey, stringToUint8(original))

  return {
    iv: ivBase64,
    encrypted: arrayBufferToBase64(encryptArrayBuffer)
  }
}


/**
 * @param { string } encrypted 
 * @param { string } iv 
 * @param { string } jwk 
 */
export async function decrypt (encrypted, iv, jwk) {
  const cryptoKey = await crypto.subtle.importKey('jwk', JSON.parse(jwk), cryptAlgorithm, true, ['encrypt', 'decrypt'])

  const decryptUint8 = base64ToUint8(encrypted)
  const decryptArrayBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToUint8(iv) }, cryptoKey, decryptUint8)

  return arrayBufferToString(decryptArrayBuffer)
}
