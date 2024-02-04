import { enums, QueryAliasProperty } from '#manifest'


/**
 * @param { any } [ queryFormatSection ]
 * @returns { string | undefined}
 */
export function getAlias (queryFormatSection) {
  return /** @type { QueryAliasProperty } */ (queryFormatSection?.$options?.find((/** @type { QueryAliasProperty } */ $option) => $option.info.name === enums.classInfoNames.QueryAliasProperty))?.alias
}
