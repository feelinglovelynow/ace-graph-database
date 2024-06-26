import { td, enums } from '#ace'


/**  @returns { td.AcePlugin } */
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
                  tokens: { id: 'ForwardRelationshipProp', x: { has: 'many', node: 'AceToken', relationship: 'aceHasTheToken', cascade: true } },
                  role: { id: 'ForwardRelationshipProp', x: { has: 'one', node: 'AceRole', relationship: 'aceIsTheRole' } },
                },
                AceToken: {
                  name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  createdAt: { id: 'Prop', x: { dataType: 'isoString', mustBeDefined: true } },
                  user: { id: 'ReverseRelationshipProp', x: { has: 'one', node: 'AceUser', relationship: 'aceHasTheToken' } },
                },
                AceRole: {
                  name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  enum: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  users: { id: 'ReverseRelationshipProp', x: { has: 'many', node: 'AceUser', relationship: 'aceIsTheRole' } },
                  aceRevokesPermissions: { id: 'ForwardRelationshipProp', x: { has: 'many', node: 'AcePermission', relationship: 'aceRevokesPermission' } },
                },
                AcePermission: {
                  action: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
                  schema: { id: 'Prop', x: { dataType: 'boolean' } },
                  node: { id: 'Prop', x: { dataType: 'string' } },
                  relationship: { id: 'Prop', x: { dataType: 'string' } },
                  propName: { id: 'Prop', x: { dataType: 'string' } },
                  allowPropName: { id: 'Prop', x: { dataType: 'string', description: 'When `ace()` encounters a node, relationship or prop, Ace may learn that this item may not be acted upon (read/write/update/delete) as requested b/c of this permission. Ace will allow the action when `AceSetting.enforcePermissions === true` IF `AceToken.user.id === node[ allowPropName ]`.' } },
                  roles: { id: 'ReverseRelationshipProp', x: { has: 'many', node: 'AceRole', relationship: 'aceRevokesPermission' } },
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

        { id: 'NodeInsert', node: 'AceSetting', x: { uid: '_:setting', name: 'Enforce Permissions', enum: enums.settings.enforcePermissions, isOn: false } },
        { id: 'NodeInsert', node: 'AceUser', x: { uid: admin.uid, username: admin.username } },
        { id: 'NodeInsert', node: 'AceToken', x: { uid: admin.token, name: 'Admin', createdAt: 'now' } },
        { id: 'NodeInsert', node: 'AceRole', x: { uid: admin.role, name: 'Admin', enum: 'admin' } },
        { id: 'NodeInsert', node: 'AceRole', x: { uid: '_:roleArchitect', name: 'Architect', enum: 'architect' } },
        { id: 'NodeInsert', node: 'AceRole', x: { uid: '_:roleEditor', name: 'Editor', enum: 'editor' } },
        { id: 'NodeInsert', node: 'AceRole', x: { uid: '_:roleReader', name: 'Reader', enum: 'reader' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionWriteSchema', action: enums.permissionActions.write, schema: true } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionInupAceSetting', action: enums.permissionActions.inup, node: 'AceSetting', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionReadAceSetting', action: enums.permissionActions.read, node: 'AceSetting', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionInupAceUser', action: enums.permissionActions.inup, node: 'AceUser', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionInupAceToken', action: enums.permissionActions.inup, node: 'AceToken', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionInupAceRole', action: enums.permissionActions.inup, node: 'AceRole', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionReadAceRole', action: enums.permissionActions.read, node: 'AceRole', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionInupAcePermission', action: enums.permissionActions.inup, node: 'AcePermission', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionReadAcePermission', action: enums.permissionActions.read, node: 'AcePermission', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionInupAnyNode', action: enums.permissionActions.inup, node: '*', propName: '*' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionUpdatePassword', action: enums.permissionActions.update, node: 'AceUser', propName: 'password', allowPropName: 'uid' } },
        { id: 'NodeInsert', node: 'AcePermission', x: { uid: '_:permissionReadPassword', action: enums.permissionActions.read, node: 'AceUser', propName: 'password', allowPropName: 'uid' } },

        { id: 'RelationshipInsert', relationship: 'aceHasTheToken', x: { a: admin.uid, b: admin.token } },
        { id: 'RelationshipInsert', relationship: 'aceIsTheRole', x: { a: admin.uid, b: admin.role } },

        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceSetting' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceUser' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceSetting' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceToken' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAceRole' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionInupAcePermission' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionUpdatePassword' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleArchitect', b: '_:permissionReadPassword' } },

        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceSetting' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionWriteSchema' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceSetting' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceUser' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceToken' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAceRole' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionInupAcePermission' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionUpdatePassword' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadPassword' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadAceSetting' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadAceRole' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleEditor', b: '_:permissionReadAcePermission' } },

        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionWriteSchema' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionInupAnyNode' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadPassword' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadAceSetting' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadAceRole' } },
        { id: 'RelationshipInsert', relationship: 'aceRevokesPermission', x: { a: '_:roleReader', b: '_:permissionReadAcePermission' } },
      ]
    }
  }
}
