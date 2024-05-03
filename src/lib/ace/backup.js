import { td, enums } from '#ace'
import { put, delAll } from './storage.js'
import { AceError, AceAuthError } from '../objects/AceError.js'
import { throwIfAnyGenericRevokes } from './throwIfAnyGenericRevokes.js'


/**
 * @param { td.AcePassport } passport
 * @param { td.AceFnFullResponse } res
 * @param { td.AceQueryRequestItemBackupGet } reqItem
 */
export async function getBackup (passport, res, reqItem) {
  passport.revokesAcePermissions?.forEach((/** @type { td.AceGraphPermission } */ value) => {
    if (value.action === 'read' && value.schema === true) throw AceAuthError(enums.permissionActions.read, passport, { schema: true })
    if (value.action === 'read' && value.node) throw AceAuthError(enums.permissionActions.read, passport, { node: value.node })
    if (value.action === 'read' && value.relationship) throw AceAuthError(enums.permissionActions.read, passport, { relationship: value.relationship })
  })

  /** @type { td.AceBackupResponse } - We'll turn the map into this object */
  const rList = {}
  const listMap = await passport.storage.list()

  listMap.forEach((value, key) => { // skip if in deletedKeys
    if (!passport.$aceDataStructures.deletedKeys.has(key)) rList[key] = value
  })

  res.now[reqItem.prop] = rList
}


/** 
 * @param { td.AcePassport } passport
 * @param { td.AceMutateRequestItemBackupLoad } reqItem
 * @returns { Promise<void> }
 */
export async function loadBackup (passport, reqItem) {
  if (typeof reqItem?.x?.backup !== 'string') throw AceError('aceFn__loadBackup__invalidBackup', 'This request fails b/c reqItemXBackup is not typeof string', { reqItemXBackup: reqItem?.x?.backup })

  throwIfAnyGenericRevokes(passport)
  if (!reqItem.x.skipDataDelete) delAll(passport)

  const backup = JSON.parse(reqItem.x.backup)

  if (backup) {
    for (const key in backup) {
      put(key, backup[key], passport)
    }
  }
}
