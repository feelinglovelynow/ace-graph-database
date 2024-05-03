import { ace } from './lib/ace/ace.js'
import { core } from './lib/ace/plugins/core.js'
import { sign, verify } from './lib/security/hash.js'
import { createJWKs } from './lib/security/createJWKs.js'
import { encrypt, decrypt } from './lib/security/crypt.js'
import { getRandomBase64 } from './lib/security/getRandomBase64.js'
import { ADD_NOW_DATE, REQUEST_UID_PREFIX, REQUEST_TOKEN_HEADER, PRE_QUERY_OPTIONS_FLOW, DEFAULT_QUERY_OPTIONS_FLOW, POST_QUERY_OPTIONS_FLOW, getNow } from './lib/variables.js'

const plugins = {
  core
}

const security = {
  sign,
  verify,
  encrypt,
  decrypt,
  createJWKs,
  getRandomBase64,
}

export {
  ace,
  getNow,
  plugins,
  security,
  ADD_NOW_DATE,
  REQUEST_UID_PREFIX,
  REQUEST_TOKEN_HEADER,
  PRE_QUERY_OPTIONS_FLOW,
  DEFAULT_QUERY_OPTIONS_FLOW,
  POST_QUERY_OPTIONS_FLOW,
}

export * as td from '../.ace/typedefs.js'
export * as enums from '../.ace/enums.js'
