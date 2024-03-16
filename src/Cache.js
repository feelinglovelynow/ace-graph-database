import { td } from '#manifest'


export class Cache {
  putMap
  getMap
  storage
  deleteSet


  /** @param { td.CF_DO_Storage } storage */
  constructor (storage) {
    this.storage = storage
    this.putMap = new Map()
    this.getMap = new Map()
    this.deleteSet = new Set()
  }

  
  /**
   * @param { string } key 
   * @returns { Promise<null | any> }
   */
  async one (key) {
    return this.deleteSet.has(key) ?
      null :
      this.putMap.get(key) || this.getMap.get(key) || await this.storage.get(key)
  }


  
  /**
   * @param { string[] } keys
   * @returns { Promise<Map<string, any>> }
   */
  async many (keys) {
    /** @type { Map<string, any> } The map we will respond with */
    const response = new Map()

    /** @type { string [] } - If there are items we don't find in cache, add them to this list, we'll call storage once w/ this list if storageUids.length */
    const storageUids = []

    for (const key of keys) {
      if (this.deleteSet.has(key)) response.set(key, null)
      else {
        const putValue = this.putMap.get(key)

        if (putValue) response.set(key, putValue)
        else {
          const getValue = this.getMap.get(key)

          if (getValue) response.set(key, getValue)
          else storageUids.push(key)
        }
      }
    }

    if (storageUids.length) {
      const rStorage = await this.storage.get(storageUids)

      rStorage.forEach((/** @type { any } */node, /** @type { string } */uid) => {
        response.set(uid, node)
      })
    }

    return response
  }
}
