import { td, enums } from '#manifest'


/**
 * @param { any[] } [ $options ]
 * @returns { string | undefined}
 */
export function getAlias ($options) {
  return $options?.find((/** @type { td.QueryAliasProperty } */ $option) => $option.id === enums.idsQuery.Alias)?.x?.alias
}
