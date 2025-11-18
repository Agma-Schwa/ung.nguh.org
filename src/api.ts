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
    updated: bigint;
    active: bool;
    administrator: bool;
    staff_only: bool;
    ruler?: bool;
};

/**
 * Ŋation data with some fields potentially missing; this is used for APIs
 * that also have to display ŋations that haven’t been admitted yet.
 */
export type NationPartial = {
    id?: bigint,
    name: string,
    banner_url: string | null,
    observer?: bool,
    deleted?: bool,
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

export type MotionType = typeof MotionType[keyof typeof MotionType];

/** Persistent global variables. */
export const GlobalVar = {
    /** The Id of the active meeting. */
    ActiveMeeting: 0n,

    /** Whether members can join the active meeting. */
    AllowMembersToJoinTheActiveMeeting: 1n,
} as const

/** Reason why a motion was closed. */
export const ClosureReason = {
    RejectedByVote: 0n,
    Passed: 1n,
    RejectedNotSeconded: 2n,
    RejectedNoConsensusReachedAfter7Days: 3n,
    RejectedAgainstServerRules: 4n,
    RejectedImproper: 5n,
} as const

export type ClosureReason = typeof ClosureReason[keyof typeof ClosureReason];

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
  reason: ClosureReason; // Only valid if 'closed' is true.
  enabled: bool;
};

/** UŊ Meeting. */
export type Meeting = {
    id: bigint;
    name: string;
    finished: bool;
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