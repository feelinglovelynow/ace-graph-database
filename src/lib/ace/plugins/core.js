import { td, enums } from '#ace'


/**
 * @returns { td.AcePlugin }
 */
export function core () {
  const admin = { username: 'admin', uid: '_:userAdmin', token: '_:tokenAdmin', role: '_:roleAdmin' }

  return {
    install: {
      request: [
        {
          id: 'SchemaAdd',
          x: {
            schema: {
              nodes: {
                AceSetting: {
                  name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  enum: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true, uniqueIndex: true } },
                  isOn: { id: 'Prop', x: { dataType: 'boolean', mustBeDefined: true } },
                },
                AceUser: {
                  username: { id: 'Prop', x: { dataType: 'string' } },
                  password: { id: 'Prop', x: { dataType: 'hash' } },
                  tokens: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'AceToken', relationshipName: 'aceHasTheToken' } },
                  role: { id: 'ForwardRelationshipProp', x: { has: 'one', nodeName: 'AceRole', relationshipName: 'aceIsTheRole' } },
                },
                AceToken: {
                  name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  createdAt: { id: 'Prop', x: { dataType: 'isoString', mustBeDefined: true } },
                  user: { id: 'ReverseRelationshipProp', x: { has: 'one', nodeName: 'AceUser', relationshipName: 'aceHasTheToken' } },
                },
                AceRole: {
                  name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  enum: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  users: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'AceUser', relationshipName: 'aceIsTheRole' } },
                  aceRevokesPermissions: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'AcePermission', relationshipName: 'aceRevokesPermission' } },
                },
                AcePermission: {
                  action: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  schema: { id: 'Prop', x: { dataType: 'boolean' } },
                  nodeName: { id: 'Prop', x: { dataType: 'string' } },
                  relationshipName: { id: 'Prop', x: { dataType: 'string' } },
                  propName: { id: 'Prop', x: { dataType: 'string' } },
                  allowPropName: { id: 'Prop', x: { dataType: 'string', description: 'When `ace()` encounters a node, relationship or prop, Ace may learn that this item may not be acted upon (read/write/update/delete) as requested b/c of this permission. Ace will allow the action when `AceSetting.enforcePermissions === true` IF `AceToken.user.id === node[ allowPropName ]`.' } },
                  roles: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'AceRole', relationshipName: 'aceRevokesPermission' } },
                }
              },
              relationships: {
                aceHasTheToken: { id: 'OneToOne' },
                aceIsTheRole: { id: 'OneToMany' },
                aceRevokesPermission: { id: 'ManyToMany' },
              }

            }
          }
        },

        { id: 'InsertNode', nodeName: 'AceSetting', x: { uid: '_:setting', name: 'Enforce Permissions', enum: enums.settings.enforcePermissions, isOn: false } },
        { id: 'InsertNode', nodeName: 'AceUser', x: { uid: admin.uid, username: admin.username } },
        { id: 'InsertNode', nodeName: 'AceToken', x: { uid: admin.token, name: 'Admin', createdAt: 'now' } },
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

        { id: 'InsertRelationship', relationshipName: 'aceHasTheToken', x: { a: admin.uid, b: admin.token } },
        { id: 'InsertRelationship', relationshipName: 'aceIsTheRole', x: { a: admin.uid, b: admin.role } },

        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceUser' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceToken' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAcePermission' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionUpdatePassword' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionReadPassword' } },

        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionWriteSchema' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceUser' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceToken' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAcePermission' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionUpdatePassword' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadPassword' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadAcePermission' } },

        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionWriteSchema' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionInupAnyNode' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadPassword' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadAceSetting' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadAceRole' } },
        { id: 'InsertRelationship', relationshipName: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadAcePermission' } },
      ]
    }
  }
}
