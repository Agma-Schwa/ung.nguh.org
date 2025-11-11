'use server'

import {Meeting, MemberProfile, Motion, NationProfile} from '@/api';
import {Session} from '@auth/core/types';
import {SQL} from 'bun';
import {auth} from '@/auth';
import {createSafeActionClient} from 'next-safe-action';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {notFound} from 'next/navigation';

// =============================================================================
//  Globals and Types
// =============================================================================
const API_URL = 'http://localhost:25000'

export const db = new SQL({
    adapter: 'sqlite',
    filename: process.env.DATABASE_URL,
    readonly: false,
    create: true,
    readwrite: true,
    strict: true,
    safeIntegers: true,
})

interface PartialMemberProfile {
    display_name: string;
    avatar_url: string;
}

// =============================================================================
//  Error Helpers
// =============================================================================
function BadRequest(message: string = 'Bad Request'): never {
    throw {status: 400, message}
}

function Forbidden(message: string = 'Forbidden'): never {
    throw {status: 403, message}
}

function Unauthorised(message: string = 'Unauthorized'): never {
    throw {status: 401, message}
}

// =============================================================================
//  Actions
// =============================================================================
const ActionClient = createSafeActionClient();

/** Add a member to a ŋation. */
export const AddMemberToNation = ActionClient.inputSchema(z.object({
    member_to_add: z.bigint(),
    nation_id: z.bigint(),
    ruler: z.boolean(),
})).action(Wrap(async ({ parsedInput: { member_to_add, nation_id, ruler } }) => {
    const { author, member, nation } = await GetMemberAuthorAndNation(member_to_add, nation_id)

    // Ensure that this user can edit this nation.
    await CheckHasEditAccessToNation(author, nation)

    // Staff-only accounts cannot be added to a nation.
    if (member.staff_only) BadRequest('Cannot add this user to a nation')

    // Add them.
    const res = await db`
        INSERT OR IGNORE INTO memberships (member, nation, ruler) 
        VALUES (${member.discord_id}, ${nation.id}, ${ruler})
        ON CONFLICT (member, nation)
        DO UPDATE SET ruler = ${ruler}
        WHERE ruler != ${ruler}
        RETURNING member
    `

    // If this changed something, and this member has no selected nation to represent,
    // set this ŋation as the selected ŋation, but only if the nation is not an observer
    // nation since those can’t vote in the first place.
    if (res.count && !nation.observer && !member.represented_nation) {
        await db`
            UPDATE members
            SET represented_nation = ${nation.id}
            WHERE discord_id = ${member.discord_id}
        `
    }

    revalidatePath(`/nations/${nation_id}`)
}))

/** Edit a ŋation. */
export const EditŊation = ActionClient.inputSchema(z.object({
    nation_id: z.bigint(),
    name: z.string().min(1).max(200),
    banner_url: z.string().max(6000),
    wiki_page_link: z.string().max(6000)
})).action(Wrap(async ({ parsedInput: { nation_id, name, banner_url, wiki_page_link } }) => {
    const { me, nation } = await GetMeAndNation(nation_id)
    await CheckHasEditAccessToNation(me, nation)
    await db`
        UPDATE nations 
        SET name = ${name},
            banner_url = ${banner_url},
            wiki_page_link = ${wiki_page_link}
        WHERE id = ${nation_id}
    `
    revalidatePath('/nations')
    revalidatePath(`/nations/${nation_id}`)
    revalidatePath(`/nations/${nation_id}/edit`)
}))

/** Remove a member from a ŋation. */
export const RemoveMemberFromNation = ActionClient.inputSchema(z.object({
    member_to_remove: z.bigint(),
    nation_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { member_to_remove, nation_id } }) => {
    const { author, member, nation } = await GetMemberAuthorAndNation(member_to_remove, nation_id)

    // A member is always allowed to remove themselves from a nation. If we’re
    // removing someone else, ensure that this user can edit this nation.
    if (author.discord_id !== member.discord_id)
        await CheckHasEditAccessToNation(author, nation)

    // Remove the member.
    await db.begin(async tx => {
        const res = await tx`
            DELETE FROM memberships 
            WHERE member = ${member.discord_id} 
            AND nation = ${nation.id}
            RETURNING member
        `

        // It’s possible for this to fail if two people attempt to remove
        // the same member at the same time; give up.
        if (res.count === 0) return

        // Ok, we removed them as a member. If this is this member’s current
        // main nation, remove it.
        await tx`
            UPDATE members
            SET represented_nation = NULL
            WHERE discord_id = ${member.discord_id} 
            AND represented_nation = ${nation.id}
        `

        // And if this leaves the ŋation without a ruler, promote a random
        // member to ruler.
        const rulers = await One<{value: bigint }>(tx`
            SELECT COUNT(*) as value FROM memberships 
            WHERE nation = ${nation.id} AND ruler = TRUE
        `)


        if (rulers?.value === 0n) {
            // This may return nothing if this nation is out of members.
            const random_member = await One<{ member: bigint }>(tx`
                SELECT member FROM memberships WHERE nation = ${nation.id} LIMIT 1
            `)

            if (random_member?.member) {
                await tx`
                    UPDATE memberships SET ruler = TRUE 
                    WHERE nation = ${nation.id} AND member = ${random_member.member}
                `
            }
        }
    })

    revalidatePath(`/nations/${nation_id}`)
}))

/** Schedule a motion for a meeting (0 = no meeting). */
export const ScheduleMotion = ActionClient.inputSchema(z.object({
    motion_id: z.bigint(),
    meeting_id: z.bigint()
})).action(Wrap(async ({ parsedInput: { motion_id, meeting_id } }) => {
    await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    const meeting = meeting_id !== 0n ? await GetMeetingOrThrow(meeting_id) : null
    if (motion.closed) BadRequest("Motion already closed")

    // Clear the meeting if null was passed, else set it to the meeting’s ID.
    if (meeting) {
        await db`UPDATE motions SET meeting = ${meeting.id} WHERE id = ${motion.id}`
    } else {
        await db`UPDATE motions SET meeting = NULL WHERE id = ${motion.id}`
    }

    revalidatePath('/motions')
    revalidatePath(`/motion/${motion.id}`)
    if (motion.meeting) revalidatePath(`/meeting/${motion.meeting}`)
    if (meeting) revalidatePath(`/meeting/${meeting.id}`)
}))

/** Demote a nation or mark it as deleted. */
export const SetNationStatus = ActionClient.inputSchema(z.object({
    nation_id: z.bigint(),
    observer: z.boolean(),
    value: z.boolean(),
})).action(Wrap(async ({ parsedInput: { nation_id, observer, value } }) => {
    const { me, nation } = await GetMeAndNation(nation_id)

    // Any ruler may toggle observer status, but only admins can mark
    // a nation as deleted.
    if (observer) {
        await CheckHasEditAccessToNation(me, nation)
    } else {
        if (!me.administrator) Forbidden()
    }

    await db.begin(async tx => {
        // Set observer status.
        if (observer) {
            await tx`UPDATE nations SET observer = ${value} WHERE id = ${nation_id}`
        } else {
            await tx`UPDATE nations SET deleted = ${value} WHERE id = ${nation_id}`
        }

        // If this enables observer status, unselect this nation as the represented
        // nation for all of its members.
        if (value) await tx`
            UPDATE members
            SET represented_nation = NULL
            WHERE represented_nation = ${nation_id}
        `
    })

    revalidatePath('/nations')
    revalidatePath(`/nations/${nation_id}`)
}))

// This abomination of a function compensates for the fact that NextJS is
// too stupid to allow us to return errors from actions in a sensible manner.
function Wrap<A extends any[]>(callable: (...args: [...A]) => Promise<any>) {
    return async (...args: [...A]): Promise<any> => {
        try { return await callable(...args) }
        catch (e: unknown) {
            if (e && typeof e === 'object' && 'status' in e && 'message' in e) return e
            throw e
        }
    }
}

// =============================================================================
//  Action Validation
// =============================================================================
async function GetMemberAuthorAndNation(member_to_remove_or_add: bigint, nation_id: bigint) {
    const author = await GetLoggedInMemberOrThrow()
    const nation = await GetNation(nation_id) ?? BadRequest('Nation not found')
    const member = await GetMember(member_to_remove_or_add) ?? BadRequest('Member not found')
    return {author, member, nation}
}

async function GetMeAndNation(nation_id: bigint) {
    const me = await GetLoggedInMemberOrThrow()
    const nation = await GetNation(nation_id) ?? BadRequest('Nation not found')
    return {me, nation}
}

async function CheckHasAccessToNationImpl(
    member: MemberProfile,
    nation: NationProfile,
    require_edit_access: boolean,
    allow_admins: boolean,
) {
    // Admins can edit nations regardless of other restrictions.
    if (member.administrator && allow_admins) return

    // Inactive nations cannot be altered.
    if (nation.deleted) Forbidden('Cannot edit deleted nation')

    // Otherwise, only representatives can vote for a nation.
    const { ruler } = await One<{ruler: boolean}>(db`
        SELECT ruler FROM memberships
        WHERE member = ${member.discord_id}
        AND nation = ${nation.id}
        LIMIT 1
    `) ?? Forbidden()

    // Ok, the user is a member; if we requested edit access, check
    // that they’re also a ruler.
    if (require_edit_access && !ruler)
        Forbidden()
}

export async function CheckHasEditAccessToNation(
    member: MemberProfile,
    nation: NationProfile
) {
    return CheckHasAccessToNationImpl(member, nation, true, true)
}

export async function GetLoggedInMemberOrThrow(): Promise<MemberProfile> {
    const session = await auth()
    const id = session?.discord_id ?? Unauthorised()
    return await GetMember(BigInt(id)) ?? Unauthorised()
}

export async function GetMeetingOrThrow(id: bigint): Promise<Meeting> {
    return await GetMeeting(id) ?? notFound()
}

export async function GetMotionOrThrow(id: bigint): Promise<Motion> {
    return await One<Motion>(db`
        SELECT * FROM motions
        WHERE id = ${id} LIMIT 1
    `) ?? notFound()
}

// =============================================================================
//  Data Fetching
// =============================================================================
export async function GetAllMembers(): Promise<MemberProfile[]> {
    return await db`SELECT * FROM members ORDER BY display_name` as MemberProfile[]
}

export async function GetAllNations(): Promise<NationProfile[]> {
    return await db`SELECT * FROM nations ORDER BY name` as NationProfile[]
}

export async function GetMember(id: bigint): Promise<MemberProfile | null> {
    return One<MemberProfile>(db`
        SELECT * FROM members WHERE 
        discord_id = ${id} LIMIT 1
    `)
}

export async function GetMeeting(id: bigint): Promise<Meeting | null> {
    return One<Meeting>(db`
        SELECT * FROM meetings
        WHERE id = ${id} LIMIT 1
    `)
}

export async function GetNation(id: bigint): Promise<NationProfile | null> {
    return One<NationProfile>(db`
        SELECT * FROM nations
        WHERE id = ${id} LIMIT 1
    `)
}

export async function GetOwnDiscordProfile(
    session: Session | null
): Promise<MemberProfile | null> {
    'use server';
    if (!session?.discord_id) return null

    // Check the DB first.
    let user = Me(session)
    if (user) return user

    // Fetch the profile from discord if this user isn’t in the DB.
    const res = await fetch(`${API_URL}/profile`, {
        headers: {
            'Authorization': process.env.SERVICE_TOKEN!,
            'NguhOrg-User-Id' : session.discord_id,
        }
    })

    let partial = await res.json() as PartialMemberProfile
    return {
        discord_id: BigInt(session.discord_id),
        represented_nation: null,
        active: 1n,
        administrator: 0n,
        staff_only: 0n,
        ...partial
    } satisfies MemberProfile
}

export async function Me(session: Session | null): Promise<MemberProfile | null> {
    if (!session?.discord_id) return null
    return GetMember(BigInt(session.discord_id))
}

export async function One<T>(query: SQL.Query<any>): Promise<T | null> {
    const res = await query
    if (res.length > 1) throw Error("Expected at most one row")
    if (res.length !== 1) return null
    return res[0] as T
}