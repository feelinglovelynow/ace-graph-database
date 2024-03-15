import { error } from './throw.js'
import { _query } from './query.js'
import { td, enums } from '#manifest'
import { _mutate } from './mutate.js'
import { Passport } from './Passport.js'
import { createJWKs } from './createJWKs.js'
import { validateSchema } from './schema.js'
import { NODE_UIDS_KEY, SCHEMA_KEY, getRevokesKey } from './variables.js'


/**
 * Start Ace Graph Database
 * @param { Passport } passport
 * @returns { Promise<td.AceStartResponse> }
 */
export async function start (passport) {
  /** @type { { [nodeName: string]: string[] } } - Uids of all nodes in graph  */
  const allNodeUids = (await passport.storage.get(NODE_UIDS_KEY)) || {}

  /** @type { number } - Count of nodes defined in schema  */
  const schemaNodesDefined = Object.keys(passport.schema?.nodes || {})?.length

  /** @type { number } - Count of relationships defined in schema  */
  const relationshipNodesDefined = Object.keys(passport.schema?.relationships || {})?.length

  /** @type { { username: string, uid: string, token: string, role: string } } - Common admin variables */
  const admin = { username: 'admin', uid: '_:userAdmin', token: '_:tokenAdmin', role: '_:roleAdmin' }

  validate()

  /** @type { [ { privateJWK: string, publicJWK: string }, td.Schema] } - Public JWK, Private JWK and Schema */
  const [ jwks ] = await Promise.all([ createJWKs(), setSchema() ])

  /** @type { td.MutateResponse } - Mutation response */
  const rMutate = await mutate()

  return {
    publicJWK: jwks.publicJWK,
    identity: rMutate.identity,
    privateJWK: jwks.privateJWK,
    admin: {
      uid: rMutate.identity[admin.uid],
      username: admin.username,
      token: rMutate.identity[admin.token]
    },
  }


  function validate () {
    if (schemaNodesDefined) throw error('start__schema-nodes-defined', 'Request fails because there are nodes defined in your schema. Start is meant to boot up a graph without nodes. Delete you schema if you would love to start a new graph.', { schemaNodesDefined })
    if (relationshipNodesDefined) throw error('start__schema-relationships-defined', 'Request fails because there are relationships defined in your schema. Start is meant to boot up a graph without relationships. Delete you schema if you would love to start a new graph.', { relationshipsLength: relationshipNodesDefined })
    if (allNodeUids?.length) throw error('start__nodes-found', 'Request fails because there are nodes in your graph. Start is meant to boot up a graph without nodes. Delete your nodes if you would love to start a new graph.', { allNodeUidsLength: allNodeUids.length })
  }


  async function setSchema () {
    if (passport.revokesAcePermissions?.has(getRevokesKey({ action: 'write', schema: true }))) throw error('auth__write-schema', 'Because the permission write schema is revoked from your AcePermission\'s, you cannot do this', { token: passport.token, source: passport.source })

    /** @type { td.Schema } */
    const schema = {
      nodes: {
        AceSetting: {
          name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
          slug: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true, uniqueIndex: true } },
          isOn: { id: 'Prop', x: { dataType: 'boolean', mustBeDefined: true } },
        },
        AceUser: {
          username: { id: 'Prop', x: { dataType: 'string' } },
          password: { id: 'Prop', x: { dataType: 'hash' } },
          token: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'AceToken', relationshipName: 'hasTheAceToken' } },
          role: { id: 'ForwardRelationshipProp', x: { has: 'one', nodeName: 'AceRole', relationshipName: 'isTheAceRole' } },
        },
        AceToken: {
          name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
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
          allowPropName: { id: 'Prop', x: { dataType: 'string', description: 'When Ace encounters a node or prop, Ace may find that this node or prop may not be queried (read) or mutated (write) b/c of this permission. However, Ace will allow the read or write when `AceSetting.enforcePermissions === true` IF `AceToken.user.id === node[ allowPropName ]`.' } },
          allowNewInsert: { id: 'Prop', x: { dataType: 'boolean', description: 'We may love to only allow writing to a prop IF this is an upsert and the current user is the user (done w/ allowPropName) or this is a fresh insert and not an upsert (done with allowNewInsert)' } },
          roles: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'AceRole', relationshipName: 'revokesAcePermission' } },
        }
      },
      relationships: {
        hasTheAceToken: { id: 'OneToOne' },
        isTheAceRole: { id: 'OneToMany' },
        revokesAcePermission: { id: 'ManyToMany' },
      }
    }

    passport.storage.put(SCHEMA_KEY, validateSchema(schema))

    return schema
  }


  async function mutate () {
    return _mutate(passport, {
      request: [
        { id: 'InsertNode', nodeName: 'AceSetting', x: { uid: '_:setting', name: 'Enforce Permissions', slug: enums.settings.enforcePermissions, isOn: false } },
        { id: 'InsertNode', nodeName: 'AceUser', x: { uid: admin.uid, username: admin.username } },
        { id: 'InsertNode', nodeName: 'AceToken',  x: { uid: admin.token, name: 'Admin', createdAt: 'now' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: admin.role, name: 'Admin', slug: 'admin' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: '_:roleArchitect', name: 'Architect', slug: 'architect' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: '_:roleEditor', name: 'Editor', slug: 'editor' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: '_:roleReader', name: 'Reader', slug: 'reader' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionSchema', action: 'write', schema: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionAceSetting', action: 'write', nodeName: 'AceSetting', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteAceUser', action: 'write', nodeName: 'AceUser', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteAceSetting', action: 'write', nodeName: 'AceSetting', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteAceToken', action: 'write', nodeName: 'AceToken', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteAceRole', action: 'write', nodeName: 'AceRole', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteAcePermission', action: 'write', nodeName: 'AcePermission', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteAnyNode', action: 'write', nodeName: '*', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWritePassword', action: 'write', nodeName: 'AceUser', propName: 'password', allowPropName: 'uid', allowNewInsert: true } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionReadPassword', action: 'read', nodeName: 'AceUser', propName: 'password', allowPropName: 'uid' } },

        { id: 'InsertRelationship', relationshipName: 'hasTheAceToken', x: { a: admin.uid, b: admin.token } },
        { id: 'InsertRelationship', relationshipName: 'isTheAceRole', x: { a: admin.uid, b: admin.role } },

        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceUser' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceToken' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWriteAcePermission' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionWritePassword' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionReadPassword' } },

        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionSchema' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceUser' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceToken' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteAcePermission' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWritePassword' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionReadPassword' } },

        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionSchema' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionWriteAnyNode' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionReadPassword' } },
      ]
    })
  }
}
