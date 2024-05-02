export const idsAce = new Set([
  'Empty',

  // Backup
  'BackupGet',
  'BackupLoad',

  // Plugin
  'PluginInstall',
  'PluginUninstall',

  // Schema
  'SchemaGet',
  'SchemaAdd',
  'SchemaUpdateNodeName',
  'SchemaUpdateNodePropName',
  'SchemaUpdateRelationshipName',
  'SchemaUpdateRelationshipPropName',

  // Schema Update Prop
  'SchemaUpdatePropDataType',
  'SchemaUpdatePropMustBeDefined',
  'SchemaUpdatePropCascade',
  'SchemaUpdatePropIndex',
  'SchemaUpdatePropHas',

  // Node
  'NodeInsert',
  'NodeUpdate',
  'NodeUpsert',
  'NodeQuery',
  'NodeDeleteData',
  'NodePropDeleteData',
  'NodeDeleteDataAndDeleteFromSchema',
  'NodePropDeleteDataAndDeleteFromSchema',

  // Relationship
  'RelationshipInsert',
  'RelationshipUpdate',
  'RelationshipUpsert',
  'RelationshipQuery',
  'RelationshipDeleteData',
  'RelationshipPropDeleteData',
  'RelationshipDeleteDataAndDeleteFromSchema',
  'RelationshipPropDeleteDataAndDeleteFromSchema',
])
