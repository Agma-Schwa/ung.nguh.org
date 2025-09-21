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