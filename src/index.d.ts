import { ace } from '../tsc/src/lib/ace/ace.d'
import { core } from '../tsc/src/lib/ace/plugins/core.d'
import { createJWKs } from '../tsc/src/lib/security/createJWKs.d'
import { ADD_NOW_DATE, REQUEST_UID_PREFIX, REQUEST_TOKEN_HEADER, getNow } from '../tsc/src/lib/variables.d'

const plugins = {
  core
}

export {
  ace,
  getNow,
  plugins,
  createJWKs,
  ADD_NOW_DATE,
  REQUEST_UID_PREFIX,
  REQUEST_TOKEN_HEADER,
}

export * as td from '../tsc/.ace/typedefs.d'
export * as enums from '../tsc/.ace/enums.d'
