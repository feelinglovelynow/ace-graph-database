import { ace } from './lib/ace/ace.js'
import { core } from './lib/ace/plugins/core.js'
import { createJWKs } from './lib/security/createJWKs.js'
import { ADD_NOW_DATE, REQUEST_UID_PREFIX, REQUEST_TOKEN_HEADER, PRE_QUERY_OPTIONS_FLOW, DEFAULT_QUERY_OPTIONS_FLOW, POST_QUERY_OPTIONS_FLOW, getNow } from './lib/variables.js'

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

export * as td from '../.ace/typedefs.js'
export * as enums from '../.ace/enums.js'
