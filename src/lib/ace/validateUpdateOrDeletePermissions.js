import { enums, td } from '#ace'
import { AceAuthError } from '../objects/AceError.js'


/**
 * @param { enums.permissionActions } action
 * @param { any } graphItem
 * @param { td.AcePassport } passport
 * @param { td.AceAuthErrorOptions } options
 * @param { td.AceGraphPermission } [ permission ]
 * @returns { void }
 */
export function validateUpdateOrDeletePermissions (action, graphItem, passport, options, permission) {
  if (permission && (!passport?.user?.uid || !permission.allowPropName || !graphItem?.x[permission.allowPropName] || graphItem.x[permission.allowPropName] !== passport.user.uid)) {
    throw AceAuthError(action, passport, options)
  }
}
