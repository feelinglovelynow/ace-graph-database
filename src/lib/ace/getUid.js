import { td } from '#ace'
import { REQUEST_UID_PREFIX } from '../variables.js'



/**
 * @param { td.AcePassport } passport 
 * @param { { uid?: any, uids?: any[] } } options 
 */
export function getUid (passport, options) {
  if (options.uid) return _getUid(passport, options.uid)
  else if (options.uids) {
    const newUids = []

    for (let uid of options.uids) {
      newUids.push(_getUid(passport, uid))
    }

    return newUids
  }
}


/**
 * @param { td.AcePassport } passport 
 * @param { any } uid 
 * @returns { any }
 */
function _getUid (passport, uid) {
  return (typeof uid === 'string' && uid.startsWith(REQUEST_UID_PREFIX)) ? passport.$aceDataStructures.newUids.get(uid) : uid
}
