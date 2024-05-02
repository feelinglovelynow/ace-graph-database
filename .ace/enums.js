/** @typedef { 'hash' | 'string' | 'number' | 'boolean' | 'isoString' } dataTypes */
export const dataTypes = {
  hash: /** @type { 'hash' } */ ('hash'),
  string: /** @type { 'string' } */ ('string'),
  number: /** @type { 'number' } */ ('number'),
  boolean: /** @type { 'boolean' } */ ('boolean'),
  isoString: /** @type { 'isoString' } */ ('isoString'),
}


/** @typedef { 'one' | 'many' } has */
export const has = {
  one: /** @type { 'one' } */ ('one'),
  many: /** @type { 'many' } */ ('many'),
}


/** @typedef { 'Empty' | 'BackupGet' | 'BackupLoad' | 'PluginInstall' | 'PluginUninstall' | 'SchemaGet' | 'SchemaAdd' | 'SchemaUpdateNodeName' | 'SchemaUpdateNodePropName' | 'SchemaUpdateRelationshipName' | 'SchemaUpdateRelationshipPropName' | 'SchemaUpdatePropDataType' | 'SchemaUpdatePropMustBeDefined' | 'SchemaUpdatePropCascade' | 'SchemaUpdatePropIndex' | 'SchemaUpdatePropHas' | 'NodeInsert' | 'NodeUpdate' | 'NodeUpsert' | 'NodeQuery' | 'NodeDeleteData' | 'NodePropDeleteData' | 'NodeDeleteDataAndDeleteFromSchema' | 'NodePropDeleteDataAndDeleteFromSchema' | 'RelationshipInsert' | 'RelationshipUpdate' | 'RelationshipUpsert' | 'RelationshipQuery' | 'RelationshipDeleteData' | 'RelationshipPropDeleteData' | 'RelationshipDeleteDataAndDeleteFromSchema' | 'RelationshipPropDeleteDataAndDeleteFromSchema' } idsAce */
export const idsAce = {
  Empty: /** @type { 'Empty' } */ ('Empty'),
  BackupGet: /** @type { 'BackupGet' } */ ('BackupGet'),
  BackupLoad: /** @type { 'BackupLoad' } */ ('BackupLoad'),
  PluginInstall: /** @type { 'PluginInstall' } */ ('PluginInstall'),
  PluginUninstall: /** @type { 'PluginUninstall' } */ ('PluginUninstall'),
  SchemaGet: /** @type { 'SchemaGet' } */ ('SchemaGet'),
  SchemaAdd: /** @type { 'SchemaAdd' } */ ('SchemaAdd'),
  SchemaUpdateNodeName: /** @type { 'SchemaUpdateNodeName' } */ ('SchemaUpdateNodeName'),
  SchemaUpdateNodePropName: /** @type { 'SchemaUpdateNodePropName' } */ ('SchemaUpdateNodePropName'),
  SchemaUpdateRelationshipName: /** @type { 'SchemaUpdateRelationshipName' } */ ('SchemaUpdateRelationshipName'),
  SchemaUpdateRelationshipPropName: /** @type { 'SchemaUpdateRelationshipPropName' } */ ('SchemaUpdateRelationshipPropName'),
  SchemaUpdatePropDataType: /** @type { 'SchemaUpdatePropDataType' } */ ('SchemaUpdatePropDataType'),
  SchemaUpdatePropMustBeDefined: /** @type { 'SchemaUpdatePropMustBeDefined' } */ ('SchemaUpdatePropMustBeDefined'),
  SchemaUpdatePropCascade: /** @type { 'SchemaUpdatePropCascade' } */ ('SchemaUpdatePropCascade'),
  SchemaUpdatePropIndex: /** @type { 'SchemaUpdatePropIndex' } */ ('SchemaUpdatePropIndex'),
  SchemaUpdatePropHas: /** @type { 'SchemaUpdatePropHas' } */ ('SchemaUpdatePropHas'),
  NodeInsert: /** @type { 'NodeInsert' } */ ('NodeInsert'),
  NodeUpdate: /** @type { 'NodeUpdate' } */ ('NodeUpdate'),
  NodeUpsert: /** @type { 'NodeUpsert' } */ ('NodeUpsert'),
  NodeQuery: /** @type { 'NodeQuery' } */ ('NodeQuery'),
  NodeDeleteData: /** @type { 'NodeDeleteData' } */ ('NodeDeleteData'),
  NodePropDeleteData: /** @type { 'NodePropDeleteData' } */ ('NodePropDeleteData'),
  NodeDeleteDataAndDeleteFromSchema: /** @type { 'NodeDeleteDataAndDeleteFromSchema' } */ ('NodeDeleteDataAndDeleteFromSchema'),
  NodePropDeleteDataAndDeleteFromSchema: /** @type { 'NodePropDeleteDataAndDeleteFromSchema' } */ ('NodePropDeleteDataAndDeleteFromSchema'),
  RelationshipInsert: /** @type { 'RelationshipInsert' } */ ('RelationshipInsert'),
  RelationshipUpdate: /** @type { 'RelationshipUpdate' } */ ('RelationshipUpdate'),
  RelationshipUpsert: /** @type { 'RelationshipUpsert' } */ ('RelationshipUpsert'),
  RelationshipQuery: /** @type { 'RelationshipQuery' } */ ('RelationshipQuery'),
  RelationshipDeleteData: /** @type { 'RelationshipDeleteData' } */ ('RelationshipDeleteData'),
  RelationshipPropDeleteData: /** @type { 'RelationshipPropDeleteData' } */ ('RelationshipPropDeleteData'),
  RelationshipDeleteDataAndDeleteFromSchema: /** @type { 'RelationshipDeleteDataAndDeleteFromSchema' } */ ('RelationshipDeleteDataAndDeleteFromSchema'),
  RelationshipPropDeleteDataAndDeleteFromSchema: /** @type { 'RelationshipPropDeleteDataAndDeleteFromSchema' } */ ('RelationshipPropDeleteDataAndDeleteFromSchema'),
}


/** @typedef { 'Prop' | 'RelationshipProp' | 'ForwardRelationshipProp' | 'ReverseRelationshipProp' | 'BidirectionalRelationshipProp' | 'OneToOne' | 'OneToMany' | 'ManyToMany' } idsSchema */
export const idsSchema = {
  Prop: /** @type { 'Prop' } */ ('Prop'),
  RelationshipProp: /** @type { 'RelationshipProp' } */ ('RelationshipProp'),
  ForwardRelationshipProp: /** @type { 'ForwardRelationshipProp' } */ ('ForwardRelationshipProp'),
  ReverseRelationshipProp: /** @type { 'ReverseRelationshipProp' } */ ('ReverseRelationshipProp'),
  BidirectionalRelationshipProp: /** @type { 'BidirectionalRelationshipProp' } */ ('BidirectionalRelationshipProp'),
  OneToOne: /** @type { 'OneToOne' } */ ('OneToOne'),
  OneToMany: /** @type { 'OneToMany' } */ ('OneToMany'),
  ManyToMany: /** @type { 'ManyToMany' } */ ('ManyToMany'),
}


/** @typedef { 'worker' | 'stamp' } passportSource */
export const passportSource = {
  worker: /** @type { 'worker' } */ ('worker'),
  stamp: /** @type { 'stamp' } */ ('stamp'),
}


/** @typedef { 'read' | 'write' | 'inup' | 'insert' | 'update' | 'delete' } permissionActions */
export const permissionActions = {
  read: /** @type { 'read' } */ ('read'),
  write: /** @type { 'write' } */ ('write'),
  inup: /** @type { 'inup' } */ ('inup'),
  insert: /** @type { 'insert' } */ ('insert'),
  update: /** @type { 'update' } */ ('update'),
  delete: /** @type { 'delete' } */ ('delete'),
}


/** @typedef { 'countAsProp' | 'sumAsProp' | 'avgAsProp' | 'minAmtAsProp' | 'maxAmtAsProp' | 'newProps' | 'propAdjToRes' | 'findByOr' | 'findByAnd' | 'findByDefined' | 'findByUndefined' | 'findByPropValue' | 'findByPropProp' | 'findByPropRes' | 'filterByOr' | 'filterByAnd' | 'filterByDefined' | 'filterByUndefined' | 'filterByPropValue' | 'filterByPropProp' | 'filterByPropRes' | 'sort' | 'limit' } queryOptions */
export const queryOptions = {
  countAsProp: /** @type { 'countAsProp' } */ ('countAsProp'),
  sumAsProp: /** @type { 'sumAsProp' } */ ('sumAsProp'),
  avgAsProp: /** @type { 'avgAsProp' } */ ('avgAsProp'),
  minAmtAsProp: /** @type { 'minAmtAsProp' } */ ('minAmtAsProp'),
  maxAmtAsProp: /** @type { 'maxAmtAsProp' } */ ('maxAmtAsProp'),
  newProps: /** @type { 'newProps' } */ ('newProps'),
  propAdjToRes: /** @type { 'propAdjToRes' } */ ('propAdjToRes'),
  findByOr: /** @type { 'findByOr' } */ ('findByOr'),
  findByAnd: /** @type { 'findByAnd' } */ ('findByAnd'),
  findByDefined: /** @type { 'findByDefined' } */ ('findByDefined'),
  findByUndefined: /** @type { 'findByUndefined' } */ ('findByUndefined'),
  findByPropValue: /** @type { 'findByPropValue' } */ ('findByPropValue'),
  findByPropProp: /** @type { 'findByPropProp' } */ ('findByPropProp'),
  findByPropRes: /** @type { 'findByPropRes' } */ ('findByPropRes'),
  filterByOr: /** @type { 'filterByOr' } */ ('filterByOr'),
  filterByAnd: /** @type { 'filterByAnd' } */ ('filterByAnd'),
  filterByDefined: /** @type { 'filterByDefined' } */ ('filterByDefined'),
  filterByUndefined: /** @type { 'filterByUndefined' } */ ('filterByUndefined'),
  filterByPropValue: /** @type { 'filterByPropValue' } */ ('filterByPropValue'),
  filterByPropProp: /** @type { 'filterByPropProp' } */ ('filterByPropProp'),
  filterByPropRes: /** @type { 'filterByPropRes' } */ ('filterByPropRes'),
  sort: /** @type { 'sort' } */ ('sort'),
  limit: /** @type { 'limit' } */ ('limit'),
}


/** @typedef { 'resHide' | 'propAsRes' | 'countAsRes' | 'sumAsRes' | 'avgAsRes' | 'minAmtAsRes' | 'maxAmtAsRes' | 'minNodeAsRes' | 'maxNodeAsRes' } postQueryOptions */
export const postQueryOptions = {
  resHide: /** @type { 'resHide' } */ ('resHide'),
  propAsRes: /** @type { 'propAsRes' } */ ('propAsRes'),
  countAsRes: /** @type { 'countAsRes' } */ ('countAsRes'),
  sumAsRes: /** @type { 'sumAsRes' } */ ('sumAsRes'),
  avgAsRes: /** @type { 'avgAsRes' } */ ('avgAsRes'),
  minAmtAsRes: /** @type { 'minAmtAsRes' } */ ('minAmtAsRes'),
  maxAmtAsRes: /** @type { 'maxAmtAsRes' } */ ('maxAmtAsRes'),
  minNodeAsRes: /** @type { 'minNodeAsRes' } */ ('minNodeAsRes'),
  maxNodeAsRes: /** @type { 'maxNodeAsRes' } */ ('maxNodeAsRes'),
}


/** @typedef { 'add' | 'subtract' | 'multiply' | 'divide' } queryDerivedSymbol */
export const queryDerivedSymbol = {
  add: /** @type { 'add' } */ ('add'),
  subtract: /** @type { 'subtract' } */ ('subtract'),
  multiply: /** @type { 'multiply' } */ ('multiply'),
  divide: /** @type { 'divide' } */ ('divide'),
}


/** @typedef { 'or' | 'and' } queryWhereGroupSymbol */
export const queryWhereGroupSymbol = {
  or: /** @type { 'or' } */ ('or'),
  and: /** @type { 'and' } */ ('and'),
}


/** @typedef { 'equals' | 'doesNotEqual' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqualTo' | 'lessThanOrEqualTo' | 'startsWith' | 'endsWith' | 'contains' | 'doesNotContain' | 'isoIsBefore' | 'isoIsAfter' } queryWhereSymbol */
export const queryWhereSymbol = {
  equals: /** @type { 'equals' } */ ('equals'),
  doesNotEqual: /** @type { 'doesNotEqual' } */ ('doesNotEqual'),
  greaterThan: /** @type { 'greaterThan' } */ ('greaterThan'),
  lessThan: /** @type { 'lessThan' } */ ('lessThan'),
  greaterThanOrEqualTo: /** @type { 'greaterThanOrEqualTo' } */ ('greaterThanOrEqualTo'),
  lessThanOrEqualTo: /** @type { 'lessThanOrEqualTo' } */ ('lessThanOrEqualTo'),
  startsWith: /** @type { 'startsWith' } */ ('startsWith'),
  endsWith: /** @type { 'endsWith' } */ ('endsWith'),
  contains: /** @type { 'contains' } */ ('contains'),
  doesNotContain: /** @type { 'doesNotContain' } */ ('doesNotContain'),
  isoIsBefore: /** @type { 'isoIsBefore' } */ ('isoIsBefore'),
  isoIsAfter: /** @type { 'isoIsAfter' } */ ('isoIsAfter'),
}



/** @typedef { string } nodeNames */
export const nodeNames =  ''



/** @typedef { string } relationshipNames */
export const relationshipNames =  ''


/** @typedef { 'enforcePermissions' } settings */
export const settings = {
  enforcePermissions: /** @type { 'enforcePermissions' } */ ('enforcePermissions'),
}


/** @typedef { 'asc' | 'dsc' } sortHow */
export const sortHow = {
  asc: /** @type { 'asc' } */ ('asc'),
  dsc: /** @type { 'dsc' } */ ('dsc'),
}