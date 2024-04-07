import { td } from '#manifest'


/** 
 * @param { td.Ace_CF_DO_Storage } storage
 * @returns { td.AceCache }
 * */
export function AceCache (storage) {
  return {
    storage,
    putMap: new Map(),
    getMap: new Map(),
    deleteSet: new Set(),
  }
}


/**
 * @param { string } key 
 * @param { td.AceCache } cache 
 * @returns { Promise<null | any> }
 */
export async function one (key, cache) {
  return cache.putMap.get(key) || cache.getMap.get(key) || await cache.storage.get(key)
}



/**
 * @param { string[] } keys
 * @param { td.AceCache } cache 
 * @returns { Promise<Map<string, any>> }
 */
export async function many (keys, cache) {
  /** @type { Map<string, any> } The map we will respond with */
  const response = new Map()

  /** @type { string [] } - If there are items we don't find in cache, add them to this list, we'll call storage once w/ this list if storageUids.length */
  const storageUids = []

  for (const key of keys) {
    const putValue = cache.putMap.get(key)

    if (putValue) response.set(key, putValue)
    else {
      const getValue = cache.getMap.get(key)

      if (getValue) response.set(key, getValue)
      else storageUids.push(key)
    }
  }

  if (storageUids.length) {
    const rStorage = await cache.storage.get(storageUids)

    rStorage.forEach((/** @type { any } */node, /** @type { string } */uid) => {
      response.set(uid, node)
    })
  }

  return response
}
