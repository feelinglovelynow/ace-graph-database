/**
 * 
 * @param {*} obj 
 * @returns { boolean }
 */
export function isObjectEmpty (obj) {
  let is = true

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) is = false
  else {
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        is = false
        break
      }
    }
  }

  return is
}
