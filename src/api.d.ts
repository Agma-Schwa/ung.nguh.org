type Snowflake = bigint
type bool = bigint;

/**
 * UŊ Member.
 */
export type MemberProfile = {
    discord_id: Snowflake;
    display_name: string;
    avatar_url: string;
    represented_nation: bigint | null;
    active: bool;
    administrator: bool;
    staff_only: bool;
    ruler?: bool;
};

/**
 * UŊ Ŋation with some data missing.
 */
export type NationPartial = {
    id?: bigint,
    name: string,
    banner_url: string | null,
    observer?: bool,
    deleted: bool,
}

/**
 * UŊ Ŋation.
 */
export type NationProfile = {
  id: bigint;
  name: string;
  banner_url: string | null;
  wiki_page_link: string | null;
  /**
   * An observer ŋation cannot vote and does not count towards quorums.
   */
  observer: bool;
  deleted: bool,
};