import { td } from '#ace'


/**
 * Put into storage AND IF not in passport.$aceDataStructures.deletedKeys THEN add to passport.$aceDataStructures.putMap
 * @param { string } key 
 * @param { any } value
 * @param { td.AcePassport } passport
 * @returns { void }
 */
export function put (key, value, passport) {
  passport.storage.put(key, value)
  if (!passport.$aceDataStructures.deletedKeys.has(key)) passport.$aceDataStructures.putMap.set(key, value)
}


/**
 * Delete from storage AND add to passport.$aceDataStructures.deletedKeys AND remove from passport.$aceDataStructures.putMap
 * @param { string } key 
 * @param { td.AcePassport } passport
 * @returns { void }
 */
export function del (key, passport) {
  passport.storage.delete(key)
  passport.$aceDataStructures.deletedKeys.add(key)
  passport.$aceDataStructures.putMap.delete(key)
}


/**
 * Delete all items in stoage, and reset all storage cache items
 * @param { td.AcePassport } passport
 * @returns { void }
 */
export function delAll (passport) {
  passport.storage.deleteAll()
  passport.schema = undefined
  passport.schemaDataStructures = {}
  passport.$aceDataStructures.putMap.clear()
  passport.$aceDataStructures.deletedKeys.clear()
}
