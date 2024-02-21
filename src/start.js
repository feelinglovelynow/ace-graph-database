import { error } from './throw.js'
import { _query } from './query.js'
import { td, enums } from '#manifest'
import { _mutate } from './mutate.js'
import { createJWKs } from './createJWKs.js'
import { _setSchema, _getSchema } from './schema.js'
import { NODE_UIDS_KEY, SCHEMA_KEY } from './variables.js'


/**
 * @typedef { Promise<{ username: string, token: string, privateJWK: string, publicJWK: string }> } StartResponse
 * @param { string } url - URL for the Cloudflare Worker that points to your Ace Graph Database
 * @returns { Promise<StartResponse> }
 */
export async function start (url) {
  /** @type { RequestInit } */
  const requestInit = { method: 'GET', headers: { 'content-type': 'application/json' } }
  const response = await fetch(`${ url }${ enums.endpoints.start }`, requestInit)
  return await response.json()
}


/**
 * @param { td.CF_DO_Storage } storage - Cloudflare Durable Object Storage (Ace Database)
 * @returns { Promise<StartResponse> }
 */
export async function _start (storage) {
  try {
    const getEntries = await storage.get([SCHEMA_KEY, NODE_UIDS_KEY])
    const allNodeUids = getEntries.get(NODE_UIDS_KEY)
    const schema = getEntries.get(SCHEMA_KEY)
    const userUids = allNodeUids ? allNodeUids['AceUser'] : []
    const roleUids = allNodeUids ? allNodeUids['AceRole'] : []
    const permissionUids = allNodeUids ? allNodeUids['AcePermission'] : []    
    const nodesLength = Object.keys(schema?.nodes || {})?.length
    const relationshipsLength = Object.keys(schema?.relationships || {})?.length

    if (nodesLength) throw error('start__schema-nodes-truthy', 'Request fails because there are nodes defined in your schema. Start is meant to boot up a graph without nodes. Delete you schema if you would love to start a new graph.', { nodesLength })
    if (relationshipsLength) throw error('start__schema-relationships-truthy', 'Request fails because there are relationships defined in your schema. Start is meant to boot up a graph without relationships. Delete you schema if you would love to start a new graph.', { relationshipsLength })
    if (userUids.length) throw error('start__users-found', 'Request fails because there are AceUser uids in your graph. Start is meant to boot up a graph without AceUser\'s. Delete your AceUser\'s if you would love to start a new graph.', { userUidsLength: userUids.length })
    if (roleUids.length) throw error('start__roles-found', 'Request fails because there are AceRole uids in your graph. Start is meant to boot up a graph without AceRole\'s. Delete your AceRole\'s if you would love to start a new graph.', { roleUidsLength: roleUids.length })
    if (permissionUids.length) throw error('start__permissions-found', 'Request fails because there are AcePermission uids in your graph. Start is meant to boot up a graph without AcePermission\'s. Delete your AcePermission\'s if you would love to start a new graph.', { permissionUidLength: permissionUids.length })

    const username = 'admin'
    const token = crypto.randomUUID()
    const [ jwks ] = await Promise.all([ createJWKs(), setSchema() ])

    await mutate()

    return {
      token,
      username,
      publicJWK: jwks.publicJWK,
      privateJWK: jwks.privateJWK,
    }

    async function setSchema () {
      return _setSchema(storage, {
        nodes: {
          AceSetting: {
            name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            slug: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            isOn: { id: 'Prop', x: { dataType: 'boolean', mustBeDefined: true } },
          },
          AceUser: {
            age: { id: 'Prop', x: { dataType: 'number' } },
            username: { id: 'Prop', x: { dataType: 'string' } },
            password: { id: 'Prop', x: { dataType: 'hash' } },
            token: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'AceToken', relationshipName: 'hasTheAceToken' } },
            role: { id: 'ForwardRelationshipProp', x: { has: 'one', nodeName: 'AceRole', relationshipName: 'isTheAceRole' } },
          },
          AceToken: {
            name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            value: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            createdAt: { id: 'Prop', x: { dataType: 'isoString', mustBeDefined: true } },
            user: { id: 'ReverseRelationshipProp', x: { has: 'one', nodeName: 'AceUser', relationshipName: 'hasTheAceToken' } },
          },
          AceRole: {
            name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            slug: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            users: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'AceUser', relationshipName: 'isTheAceRole' } },
            revokesAcePermissions: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'AcePermission', relationshipName: 'revokesAcePermission' } },
          },
          AcePermission: {
            action: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            schema: { id: 'Prop', x: { dataType: 'string' } },
            nodeName: { id: 'Prop', x: { dataType: 'string' } },
            relationshipName: { id: 'Prop', x: { dataType: 'string' } },
            propName: { id: 'Prop', x: { dataType: 'string' } },
            roles: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'AceRole', relationshipName: 'revokesAcePermission' } },
          }
        },
        relationships: {
          hasTheAceToken: { id: 'OneToOne' },
          isTheAceRole: { id: 'OneToMany' },
          revokesAcePermission: { id: 'ManyToMany' },
        }
      })
    }

    async function mutate () {
      return _mutate(storage, {
        insert: [
          { id: 'AceSetting', x: { uid: '_:setting', name: 'Enforce Permissions', slug: 'enforcePermissions', isOn: false } },
          { id: 'AceUser', x: { uid: '_:userAdmin', username, age: 18 } },
          { id: 'AceUser', x: { uid: '_:jenny', username: 'jenny', age: 21 } },
          { id: 'AceToken',  x: { uid: '_:tokenAdmin', name: 'Admin', value: token,  createdAt: 'now' } },
          { id: 'AceRole', x: { uid: '_:roleAdmin', name: 'Admin', slug: 'admin' } },
          { id: 'AceRole', x: { uid: '_:roleArchitect', name: 'Architect', slug: 'architect' } },
          { id: 'AceRole', x: { uid: '_:roleEditor', name: 'Editor', slug: 'editor' } },
          { id: 'AceRole', x: { uid: '_:roleReader', name: 'Reader', slug: 'reader' } },
          { id: 'AcePermission', x: { uid: '_:permissionSchema', action: 'write', schema: '*', } },
          { id: 'AcePermission', x: { uid: '_:permissionWriteAceUser', action: 'write', nodeName: 'AceUser', propName: '*' } },
          { id: 'AcePermission', x: { uid: '_:permissionWriteAceSetting', action: 'write', nodeName: 'AceSetting', propName: '*' } },
          { id: 'AcePermission', x: { uid: '_:permissionWriteAceToken', action: 'write', nodeName: 'AceToken', propName: '*' } },
          { id: 'AcePermission', x: { uid: '_:permissionWriteAceRole', action: 'write', nodeName: 'AceRole', propName: '*' } },
          { id: 'AcePermission', x: { uid: '_:permissionWriteAcePermission', action: 'write', nodeName: 'AcePermission', propName: '*' } },
          { id: 'AcePermission', x: { uid: '_:permissionWriteAnyNode', action: 'write', nodeName: '*', propName: '*' } },

          { id: 'hasTheAceToken', x: { a: '_:userAdmin', b: '_:tokenAdmin' } },
          { id: 'isTheAceRole', x: { a: '_:userAdmin', b: '_:roleArchitect' } },

          { id: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceUser' } },
          { id: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceSetting' } },
          { id: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceToken' } },
          { id: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceRole' } },
          { id: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAcePermission' } },

          { id: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionSchema' } },
          { id: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceUser' } },
          { id: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceSetting' } },
          { id: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceToken' } },
          { id: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceRole' } },
          { id: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAcePermission' } },

          { id: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionSchema' } },
          { id: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionWriteAnyNode' } },
        ]
      })
    }  
  } catch (error) {
    console.log('error', error)
    throw error
  }
}
