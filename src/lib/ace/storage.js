import { td } from '#ace'


/**
 * Put into storage AND IF not in passport.$aceDataStructures.deletedKeys THEN add to passport.$aceDataStructures.putMap
 * @param { string } key 
 * @param { any } value
 * @param { td.AcePassport } passport
 */
export function put (key, value, passport) {
  passport.storage.put(key, value)
  if (!passport.$aceDataStructures.deletedKeys.has(key)) passport.$aceDataStructures.putMap.set(key, value)
}


/**
 * Delete from storage AND add to passport.$aceDataStructures.deletedKeys AND remove from passport.$aceDataStructures.putMap
 * @param { string } key 
 * @param { td.AcePassport } passport
 */
export function del (key, passport) {
  passport.storage.delete(key)
  passport.$aceDataStructures.deletedKeys.add(key)
  passport.$aceDataStructures.putMap.delete(key)
}
