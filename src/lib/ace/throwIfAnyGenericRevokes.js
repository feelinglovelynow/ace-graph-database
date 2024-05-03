import { td } from '#ace'
import { AceAuthError } from '../objects/AceError.js'


/**
 * @param { td.AcePassport } passport 
 * @returns { void }
 */
export function throwIfAnyGenericRevokes (passport) {
  if (passport.revokesAcePermissions) {
    for (const [ _, value ] of passport.revokesAcePermissions) {
      if (value.node) throw AceAuthError(value.action, passport, { node: value.node })
      if (value.schema === true) throw AceAuthError(value.action, passport, { schema: true })
      if (value.relationship) throw AceAuthError(value.action, passport, { relationship: value.relationship })
    }
  }
}
