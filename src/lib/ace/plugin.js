import { td } from '#ace'
import { _ace } from './ace.js'


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AceMutateRequestItemPluginInstall } reqItem 
 * @returns { Promise<void> }
 */
export async function installPlugin (passport, res, reqItem) {
  const resItem = await _ace({
    passport,
    request: reqItem.x.install.request,
    publicJWKs: reqItem.x.install.publicJWKs,
    privateJWKs: reqItem.x.install.privateJWKs,
  })

  if (reqItem.prop) res.now[reqItem.prop] = resItem
}


/**
 * @param { td.AcePassport } passport 
 * @param { td.AceFnFullResponse } res 
 * @param { td.AceMutateRequestItemPluginUninstall } reqItem 
 * @returns { Promise<void> }
 */
export async function uninstallPlugin  (passport, res, reqItem) {
  const resItem = await _ace({ passport, request: reqItem.x.request })
  if (reqItem.prop) res.now[reqItem.prop] = resItem
}
