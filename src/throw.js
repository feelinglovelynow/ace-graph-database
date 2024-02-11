/**
 * @param { string } id 
 * @param { string } message
 * @param { { [errorItemKey: string]: any } } _errorData 
 * @returns { { id: string, _errors: string[], _errorData: string } }
 */
export function error (id, message, _errorData) {
  return { id, _errors: [ message ], _errorData: JSON.stringify(_errorData) }
}
