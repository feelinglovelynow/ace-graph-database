import { ace } from '../tsc/src/lib/ace/ace.d'
import { core } from '../tsc/src/lib/ace/plugins/core.d'
import { createJWKs } from '../tsc/src/lib/security/createJWKs.d'
import { ADD_NOW_DATE, REQUEST_UID_PREFIX, REQUEST_TOKEN_HEADER, PRE_QUERY_OPTIONS_FLOW, DEFAULT_QUERY_OPTIONS_FLOW, POST_QUERY_OPTIONS_FLOW, getNow } from '../tsc/src/lib/variables.d'

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
  PRE_QUERY_OPTIONS_FLOW,
  DEFAULT_QUERY_OPTIONS_FLOW,
  POST_QUERY_OPTIONS_FLOW,
}

export * as td from '../tsc/.ace/typedefs.d'
export * as enums from '../tsc/.ace/enums.d'
