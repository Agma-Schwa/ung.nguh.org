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

/**
 * The type of a motion.
 */
export const MotionType = {
    Unsure: 0n,
    Legislative: 1n,
    Executive: 2n,
    Constitutional: 3n
} as const

/**
 * UŊ Motion.
 */
export type Motion = {
  id: bigint;
  text: string;
  author: Snowflake;
  type: 0n | 1n | 2n | 3n;
  title: string;
  meeting?: bigint;
  quorum: bigint;
  locked: bool;
  closed: bool;
  supported: bool;
  passed: bool;
  enabled: bool;
};

/** UŊ Meeting. */
export type Meeting = {
    id: bigint;
    name: string;
}

export type Vote = {
    motion: bigint;
    member: bigint;
    nation: bigint;
    vote: bool;
}