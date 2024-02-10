import { enums } from '#manifest'


/**
 * @param { enums.schemaRelationshipPropOptions[] } [ options ]
 * @returns { { isInverse: boolean, isBidirectional: boolean } }
 */
export function getRelationshipOptionsDetails (options) {
  let isInverse = false
  let isBidirectional = false

  if (options) {
    for (const option of options) {
      switch (option) {
        case enums.schemaRelationshipPropOptions.inverse:
          isInverse = true
          break
        case enums.schemaRelationshipPropOptions.bidirectional:
          isBidirectional = true
          break
      }
    }
  }

  return {
    isInverse,
    isBidirectional,
  }
}
