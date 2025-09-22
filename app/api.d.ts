/**
 * UŊ Member.
 */
export type MemberProfile = {
    discord_id: Snowflake;
    display_name: string;
    avatar_url: string;
    represented_nation: number | null;
    active: boolean;
    administrator: boolean;
    staff_only: boolean;
};

/**
 * UŊ Ŋation with some data missing.
 */
export type NationPartial = {
    id?: number,
    name: string,
    banner_url: string | null,
    observer?: boolean,
}

/**
 * UŊ Ŋation.
 */
export type NationProfile = {
  id: number;
  name: string;
  banner_url: string | null;
  wiki_page_link: string | null;
  /**
   * An observer ŋation cannot vote and does not count towards quorums.
   */
  observer: boolean;
};