import { td, enums } from '#manifest'


/**
 * @param { string } id - Short enum about the error. Should not change from occurrence to occurrence of the error
 * @param { string } detail - Human-readable explanation specific to this occurrence of the error
 * @param { { [errorItemKey: string]: any } } errorData - Additional members that extend the error details object with specifics about that error
 * @returns { td.AceError }
 */
export function AceError (id, detail, errorData) {
  return {
    id,
    detail,
    ...errorData
  }
}


/**
 * @param { enums.permissionActions } action
 * @param { td.AcePassport } passport
 * @param { td.AceAuthErrorOptions } options
 * @returns { td.AceError }
 */
export function AceAuthError (action, passport, options) {
  let id = 'auth__'
  let message = `Because the ${ action } permission to `

  if (options.schema) {
    id += `${ action }__schema`
    message += `the schema `
  } else if (options.nodeName) {
    id += 'node'
    message += `the node name \`${ options.nodeName }\` `
  } else if (options.relationshipName) {
    id += 'relationship'
    message += `the relationship name \`${ options.relationshipName }\` `
  }

  if (options.propName) {
    id += '__prop'
    message += `and the prop name \`${ options.propName }\` `
  }

  return AceError(id, message + 'is revoked from your AcePermissions, you cannot do this', { token: passport.token, source: passport.source })
}
