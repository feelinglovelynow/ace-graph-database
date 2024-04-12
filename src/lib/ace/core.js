import { _ace } from './ace.js'
import { td, enums } from '#ace'
import { addToSchema } from './mutate.js'
import { createJWKs } from '../security/createJWKs.js'


/**
 * Start Ace Graph Database
 * @param { td.AcePassport } passport
 * @returns { Promise<td.AceCoreResponse> }
 */
export async function core (passport) {
  /** @type { { username: string, uid: string, token: string, role: string } } - Common admin variables */
  const admin = { username: 'admin', uid: '_:userAdmin', token: '_:tokenAdmin', role: '_:roleAdmin' }

  _addToSchema()
  const [ jwks, response ] = await Promise.all([ createJWKs(), mutate() ])

  return {
    $ace: {
      newUids: response.$ace.newUids
    },
    jwks: {
      public: jwks.publicJWK,
      private: jwks.privateJWK,
    },
    admin: {
      uid: response.$ace.newUids[admin.uid],
      username: admin.username,
      token: response.$ace.newUids[admin.token]
    },
  }

  async function _addToSchema () {
    return addToSchema(passport, {
      nodes: {
        AceSetting: {
          name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
          enum: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true, uniqueIndex: true } },
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
          enum: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
          users: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'AceUser', relationshipName: 'isTheAceRole' } },
          revokesAcePermissions: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'AcePermission', relationshipName: 'revokesAcePermission' } },
        },
        AcePermission: {
          action: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
          schema: { id: 'Prop', x: { dataType: 'boolean' } },
          nodeName: { id: 'Prop', x: { dataType: 'string' } },
          relationshipName: { id: 'Prop', x: { dataType: 'string' } },
          propName: { id: 'Prop', x: { dataType: 'string' } },
          allowPropName: { id: 'Prop', x: { dataType: 'string', description: 'When Ace encounters a node or prop, Ace may find that this node or prop may not be queried (read) or mutated (write) b/c of this permission. However, Ace will allow the read or write when `AceSetting.enforcePermissions === true` IF `AceToken.user.id === node[ allowPropName ]`.' } },
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
    return _ace(passport, {
      request: [
        { id: 'InsertNode', nodeName: 'AceSetting', x: { uid: '_:setting', name: 'Enforce Permissions', enum: enums.settings.enforcePermissions, isOn: false } },
        { id: 'InsertNode', nodeName: 'AceUser', x: { uid: admin.uid, username: admin.username } },
        { id: 'InsertNode', nodeName: 'AceToken',  x: { uid: admin.token, name: 'Admin', createdAt: 'now' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: admin.role, name: 'Admin', enum: 'admin' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: '_:roleArchitect', name: 'Architect', enum: 'architect' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: '_:roleEditor', name: 'Editor', enum: 'editor' } },
        { id: 'InsertNode', nodeName: 'AceRole', x: { uid: '_:roleReader', name: 'Reader', enum: 'reader' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionWriteSchema', action: enums.permissionActions.write, schema: true } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionInupAceSetting', action: enums.permissionActions.inup, nodeName: 'AceSetting', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionReadAceSetting', action: enums.permissionActions.read, nodeName: 'AceSetting', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionInupAceUser', action: enums.permissionActions.inup, nodeName: 'AceUser', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionInupAceToken', action: enums.permissionActions.inup, nodeName: 'AceToken', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionInupAceRole', action: enums.permissionActions.inup, nodeName: 'AceRole', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionReadAceRole', action: enums.permissionActions.read, nodeName: 'AceRole', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionInupAcePermission', action: enums.permissionActions.inup, nodeName: 'AcePermission', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionReadAcePermission', action: enums.permissionActions.read, nodeName: 'AcePermission', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionInupAnyNode', action: enums.permissionActions.inup, nodeName: '*', propName: '*' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionUpdatePassword', action: enums.permissionActions.update, nodeName: 'AceUser', propName: 'password', allowPropName: 'uid' } },
        { id: 'InsertNode', nodeName: 'AcePermission', x: { uid: '_:permissionReadPassword', action: enums.permissionActions.read, nodeName: 'AceUser', propName: 'password', allowPropName: 'uid' } },

        { id: 'InsertRelationship', relationshipName: 'hasTheAceToken', x: { a: admin.uid, b: admin.token } },
        { id: 'InsertRelationship', relationshipName: 'isTheAceRole', x: { a: admin.uid, b: admin.role } },

        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceUser' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceToken' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionInupAcePermission' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionUpdatePassword' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleArchitect', b: '_:permissionReadPassword' } },

        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionWriteSchema' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionInupAceUser' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionInupAceToken' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionInupAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionInupAcePermission' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionUpdatePassword' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionReadPassword' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionReadAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionReadAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleEditor', b: '_:permissionReadAcePermission' } },

        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionWriteSchema' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionInupAnyNode' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionReadPassword' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionReadAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionReadAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'revokesAcePermission', x: { a: '_:roleReader', b: '_:permissionReadAcePermission' } },
      ]
    })
  }
}
