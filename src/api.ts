type Snowflake = bigint
type bool = bigint;

export type Admission = PartialMember & {
  id: bigint;
  passed: bool;
  closed: bool;
  name: string;
  ruler: string;
  banner_text: string;
  banner_url: string;
  claim_text: string;
  claim_url: string;
  trivia: string;
};

export type AdmissionVote = VoteCommon & {
    admission: bigint;
}

/** Member profile data common to admissions and full members. */
export type PartialMember = {
    discord_id: Snowflake;
    display_name: string;
    avatar_url: string;
}

/**
 * UŊ Member.
 */
export type MemberProfile = PartialMember & {
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

export type MotionType = 0n | 1n | 2n | 3n

/** Persistent global variables. */
export const GlobalVar = {
    /** The Id of the active meeting. */
    ActiveMeeting: 0n,
} as const

/**
 * UŊ Motion.
 */
export type Motion = {
  id: bigint;
  text: string;
  author: Snowflake;
  type: MotionType;
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

/** Used to indicate that there is no active meeting. */
export const NO_ACTIVE_MEETING: bigint = 0n

export type VoteCommon = {
    member: bigint;
    nation: bigint;
    vote: bool;
}

export type Vote = VoteCommon & {
    motion: bigint;
}