export const permissionActions = new Set([
  // schema / nodes / relationships / properties
  'read',

  // schema
  'write',

  // nodes / relationships / properties
  'inup', // may not (insert / update)
  'insert',
  'update',
  'delete',
])
