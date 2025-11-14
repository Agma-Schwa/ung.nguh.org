'use server'

import {
    Admission,
    GlobalVar,
    Meeting,
    MemberProfile,
    Motion,
    MotionType,
    NationProfile,
    NO_ACTIVE_MEETING
} from '@/api';
import {Session} from '@auth/core/types';
import {SQL} from 'bun';
import {auth} from '@/auth';
import {createSafeActionClient} from 'next-safe-action';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {notFound} from 'next/navigation';
import {AdmissionSchema, CanEditMotion, MotionSchema} from '@/utils';

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

function InternalServerError(message: string = 'Internal Error'): never {
    throw {status: 500, message}
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
    if (
        res.count &&
        !nation.observer &&
        !nation.deleted &&
        !member.represented_nation
    ) await db`
        UPDATE members
        SET represented_nation = ${nation.id}
        WHERE discord_id = ${member.discord_id}
    `

    revalidatePath(`/nations/${nation_id}`)
}))

/** Close a motion as rejected. */
export const CloseMotionAsRejected = ActionClient.inputSchema(z.object({
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { motion_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    if (!me.administrator) Forbidden()

    await db`
        UPDATE motions
        SET enabled = FALSE,
            supported = FALSE,
            passed = FALSE,
            closed = TRUE
        WHERE id = ${motion.id} AND closed = 0 -- Disallow force-closing already-closed motions.
    `

    RevalidateMotion(motion)
}))

/** Create an admission. */
export const CreateAdmission = ActionClient.inputSchema(
    AdmissionSchema
).action(Wrap(async ({ parsedInput: {
    name,
    ruler,
    banner_text,
    banner_url,
    claim_text,
    claim_url,
    trivia
}}) => {
    // This route is special because non-members are allowed to post to it, because
    // this form is how people become members in the first place. Instead, check if
    // they’re a nguhcrafter here. This is something that the bot needs to do.
    const discord_id = await CheckIsNguhcrafter()

    // Conversely, people who are already rulers of a ŋation can’t create a new one
    // (they’d have to leave all other ŋations first).
    const ruler_count = await Scalar(db`
        SELECT COUNT(*) AS value
        FROM memberships
        WHERE member = ${discord_id} AND ruler = TRUE`
    )

    if (ruler_count !== 0n) BadRequest('A ruler of a ŋation cannot create a new ŋation')

    // The same applies if they already have an open admission.
    const admission_count = await Scalar(db`
        SELECT COUNT(*) AS value
        FROM admissions 
        WHERE discord_id = ${discord_id} AND closed = FALSE
    `)

    if (admission_count !== 0n) BadRequest('You already have an open admission')

    // Get the member’s profile; if this fails for some reason, give up.
    const profile = await GetMemberProfileFromDiscord(discord_id) ?? Forbidden()

    // Finally, create the admission.
    const admission = await Scalar(db`
        INSERT INTO admissions (
            discord_id,
            display_name,
            avatar_url,

            name,
            ruler,
            banner_text,
            banner_url,
            claim_text,
            claim_url,
            trivia
        ) VALUES (
            ${discord_id},
            ${profile.display_name},
            ${profile.avatar_url},

            ${name},
            ${ruler},
            ${banner_text},
            ${banner_url},
            ${claim_text},
            ${claim_url},
            ${trivia}
        ) RETURNING id AS value
    `)

    await SendWebhookMessage(
        `<@${discord_id}> has opened an admission for their ŋation [**${name}**](<${process.env.BASE_URL}/admissions/${admission}>)!`,
        true
    )

    return { id: admission }
}))

/** Create a new meeting. */
export const CreateMeeting = ActionClient.inputSchema(z.object({
    name: z.string().trim().min(1).max(50)
})).action(Wrap(async ({ parsedInput: { name } }) => {
    const me = await GetLoggedInMemberOrThrow()
    if (!me.administrator) Forbidden()
    await db`INSERT INTO meetings (name) VALUES (${name})`
    revalidatePath('/')
}))

/** Create a new motion. */
export const CreateMotion = ActionClient.inputSchema(
    MotionSchema
).action(Wrap(async ({ parsedInput: { type, title, text } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const id = await Scalar(db`
        INSERT INTO motions (author, type, title, text)
        VALUES (${me.discord_id}, ${type}, ${title}, ${text})
        RETURNING id AS value
    `)

    // If a meeting is active, schedule it automatically.
    const active = await GetActiveMeeting()
    if (active !== NO_ACTIVE_MEETING) await db`
        UPDATE motions
        SET meeting = ${active}
        WHERE id = ${id}
    `

    revalidatePath('/motions')
    return { id }
}))

/** Delete an admission. */
export const DeleteAdmission = ActionClient.inputSchema(z.object({
    admission_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { admission_id } }) => {
    const admission = await GetAdmissionOrThrow(admission_id)
    await CheckCanEditAdmission(admission);
    await db`DELETE FROM admissions WHERE id = ${admission.id}`
    RevalidateAdmission(admission)
}))

/** Delete a motion. */
export const DeleteMotion = ActionClient.inputSchema(z.object({
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { motion_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    if (!CanEditMotion(me, motion)) Forbidden()

    // Delete the motion. Data referencing it will be dropped via ON DELETE CASCADE.
    await db`DELETE FROM motions WHERE id = ${motion.id}`
    RevalidateMotion(motion)
}))

/** Edit an admission. */
export const EditAdmission = ActionClient.inputSchema(AdmissionSchema.extend({
    admission_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: {
    admission_id,
    name,
    ruler,
    banner_text,
    banner_url,
    claim_text,
    claim_url,
    trivia
}}) => {
    const admission = await GetAdmissionOrThrow(admission_id)
    await CheckCanEditAdmission(admission);
    await db`
        UPDATE admissions
        SET name = ${name},
            ruler = ${ruler},
            banner_text = ${banner_text},
            banner_url = ${banner_url},
            claim_text = ${claim_text},
            claim_url = ${claim_url},
            trivia = ${trivia}
        WHERE id = ${admission.id}
    `
    RevalidateAdmission(admission)
}))

/** Edit a motion. */
export const EditMotion = ActionClient.inputSchema(MotionSchema.extend({
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { motion_id, type, title, text } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    if (!CanEditMotion(me, motion)) Forbidden()

    await db`
        UPDATE motions
        SET type = ${type}, title = ${title}, text = ${text}
        WHERE id = ${motion.id}
    `

    RevalidateMotion(motion)
}))

/** Edit a ŋation. */
export const EditŊation = ActionClient.inputSchema(z.object({
    nation_id: z.bigint(),
    name: z.string().trim().min(1).max(200),
    banner_url: z.string().trim().max(6000),
    wiki_page_link: z.string().trim().max(6000)
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

/** Enable or disable a motion. */
export const EnableOrDisableMotion = ActionClient.inputSchema(z.object({
    enable: z.boolean(),
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { enable, motion_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    const active = await GetActiveMeeting()
    if (!me.administrator) Forbidden()

    // Can’t enable a motion unless the meeting for it is active.
    if (motion.meeting !== active) BadRequest()

    // Do it.
    if (enable) {
        await db`
            UPDATE motions
            SET enabled = TRUE, quorum = (SELECT COUNT(*) FROM meeting_participants)
            WHERE id = ${motion.id} AND meeting = ${motion.meeting}
        `
    } else {
        await db`
            UPDATE motions
            SET enabled = FALSE
            WHERE id = ${motion.id} AND meeting = ${motion.meeting}
        `
    }

    revalidatePath(`/motion/${motion.id}`)
}))

/** Lock or unlock a motion. */
export const LockOrUnlockMotion = ActionClient.inputSchema(z.object({
    lock: z.boolean(),
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { lock, motion_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)

    // Users can only lock their own motion; only admins can lock any
    // motion and unlock motions.
    if (!me.administrator && (!lock || me.discord_id !== motion.author))
        Forbidden()

    await db`
        UPDATE motions
        SET locked = ${lock}
        WHERE id = ${motion.id}
    `

    RevalidateMotion(motion)
}))

/** Pass an admission irrespective of vote counts. */
export const PassAdmission = ActionClient.inputSchema(z.object({
    admission_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { admission_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const admission = await GetAdmissionOrThrow(admission_id)
    if (!me.administrator) Forbidden()
    if (admission.passed) BadRequest('Admission already passed!')
    await PassAdmissionImpl(admission)
    RevalidateAdmission(admission)
    revalidatePath('/nations')
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
        const rulers = await Scalar(tx`
            SELECT COUNT(*) AS value FROM memberships
            WHERE nation = ${nation.id} AND ruler = TRUE
        `)


        if (rulers === 0n) {
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

/** Reset a motion. */
export const ResetMotion = ActionClient.inputSchema(z.object({
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { motion_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    if (!me.administrator) Forbidden()

    await db.transaction(async tx => {
        await tx`DELETE FROM votes WHERE motion = ${motion.id}`
        await tx`
            UPDATE motions
            SET enabled = FALSE,
                quorum = 0,
                supported = FALSE,
                closed = FALSE,
                passed = FALSE
            WHERE id = ${motion.id}
        `
    })

    RevalidateMotion(motion)
}))

/** Schedule a motion for a meeting (0 = no meeting). */
export const ScheduleMotion = ActionClient.inputSchema(z.object({
    motion_id: z.bigint(),
    meeting_id: z.bigint()
})).action(Wrap(async ({ parsedInput: { motion_id, meeting_id } }) => {
    await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    const meeting = meeting_id !== NO_ACTIVE_MEETING ? await GetMeetingOrThrow(meeting_id) : null
    if (motion.closed) BadRequest("Motion already closed")

    // Clear the meeting if null was passed, else set it to the meeting’s ID.
    if (meeting) {
        await db`UPDATE motions SET meeting = ${meeting.id} WHERE id = ${motion.id}`
    } else {
        await db`UPDATE motions SET meeting = NULL WHERE id = ${motion.id}`
    }

    RevalidateMotion(motion)
    if (meeting) revalidatePath(`/meeting/${meeting.id}`)
}))

/** Set the active meeting. */
export const SetActiveMeeting = ActionClient.inputSchema(z.object({
    meeting_id: z.bigint(),
})).action(Wrap (async ({ parsedInput: { meeting_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    if (!me.administrator) Forbidden()

    // Check that the meeting actually exists.
    if (meeting_id !== NO_ACTIVE_MEETING) await GetMeetingOrThrow(meeting_id)
    await db`
        UPDATE global_vars
        SET value = ${meeting_id}
        WHERE id = ${GlobalVar.ActiveMeeting}
    `

    revalidatePath('/')
    revalidatePath('/meetings')
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

        // Fetch the ŋation again to see if it’s either an observer ŋation or deleted.
        const nation_new = await GetNation(nation_id) ?? InternalServerError()

        // If it is, unset this as the represented ŋation.
        if (nation_new.observer || nation_new.deleted) {
            const members = await tx`
                UPDATE members
                SET represented_nation = NULL
                WHERE represented_nation = ${nation_id}
                RETURNING discord_id
            ` as { discord_id: bigint }[]

            // Assign a new represented ŋation to these members.
            for (const { discord_id } of members) {
                // Pick a 'random' ŋation that is neither deleted nor an observer.
                const nation = await One<{ id: bigint }>(tx`
                    SELECT memberships.nation as id
                    FROM memberships
                    JOIN nations ON nations.id = memberships.nation
                    WHERE nations.deleted = FALSE AND
                          nations.observer = FALSE AND
                          memberships.member = ${discord_id}
                    LIMIT 1
                `)

                if (nation) await tx`
                    UPDATE members
                    SET represented_nation = ${nation.id}
                    WHERE discord_id = ${discord_id}
                `
            }
        }

        // Conversely, if it is now no longer deleted nor an observer, set it as the
        // represented ŋation for any members whose represented ŋation is unset.
        else await tx`
            UPDATE members
            SET represented_nation = ${nation_id}
            WHERE represented_nation IS NULL AND discord_id IN (
                SELECT member FROM memberships
                WHERE nation = ${nation_id}
            )
        `
    })

    revalidatePath('/nations')
    revalidatePath(`/nations/${nation_id}`)
}))

/** Set a member’s represented ŋation. */
export const SetRepresentedNation = ActionClient.inputSchema(z.object({
    nation_id: z.bigint(),
})).action(Wrap (async ({ parsedInput: { nation_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const nation = await GetNation(nation_id) ?? notFound()
    await CheckHasVoteAccessToNation(me, nation)
    await db`
        UPDATE members
        SET represented_nation = ${nation.id}
        WHERE discord_id = ${me.discord_id}
    `
    revalidatePath('/nations')
}))

/** Cast a vote on an admission. */
export const VoteAdmission = ActionClient.inputSchema(z.object({
    vote: z.boolean(),
    admission_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { vote, admission_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const admission = await GetAdmissionOrThrow(admission_id)

    // Closed admissions can no longer be voted on.
    if (admission.closed) Forbidden('Admission is already closed')

    // A user can’t vote for themselves.
    if (admission.discord_id === me.discord_id) Forbidden('You cannot vote on your own admission')

    // A user must have registered an active ŋation before they can vote.
    const nation = await GetNationForVote(me)

    // Record the vote.
    await db.transaction(async tx => {
        const res = await tx`
            INSERT OR IGNORE INTO admission_votes (admission, member, nation, vote)
            VALUES (${admission.id}, ${me.discord_id}, ${nation.id}, ${vote})
            ON CONFLICT (admission, nation)
            DO UPDATE SET member = ${me.discord_id}, vote = ${vote}
            RETURNING ROWID -- Return the rowid to check if something changed
        `
        if (res.length === 0) return

        // We need to check if this causes the admission to pass; the way this works
        // is basically like constitutional support, except that it requires 50% of
        // all members.
        const quorum = await GetNationCountForQuorum(tx)
        const in_favour = await Scalar(tx`
            SELECT SUM(IIF(vote == 1, 1, 0)) as value
            FROM admission_votes
            WHERE admission = ${admission.id}
        `)

        // '>', not '>='!
        if (in_favour * 2n > quorum) await PassAdmissionImpl(admission)
    })

    RevalidateAdmission(admission)
}))

/** Cast a vote on a motion. */
export const VoteMotion = ActionClient.inputSchema(z.object({
    vote: z.boolean(),
    motion_id: z.bigint(),
})).action(Wrap(async ({ parsedInput: { vote, motion_id } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)

    // Only enabled motions can be voted on.
    if (!motion.enabled) Forbidden()

    // A user must have registered an active ŋation before they can vote.
    const nation = await GetNationForVote(me)

    // Record the vote.
    await db.transaction(async tx => {
        await tx`
            INSERT INTO votes (motion, member, nation, vote)
            VALUES (${motion.id}, ${me.discord_id}, ${nation.id}, ${vote})
            ON CONFLICT (motion, nation)
            DO UPDATE SET vote = ${vote}, member = ${me.discord_id}
        `

        await UpdateMotionAfterVote(tx, motion)
    })

    revalidatePath(`/motions/${motion.id}`)
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

async function GetNationForVote(member: MemberProfile): Promise<NationProfile> {
    if (!member.represented_nation) Forbidden('You need to choose a represented ŋation to vote')
    const nation = await GetNation(member.represented_nation) ?? InternalServerError();
    await CheckHasVoteAccessToNation(member, nation);
    return nation
}

async function CheckHasAccessToNationImpl(
    member: MemberProfile,
    nation: NationProfile,
    require_edit_access: boolean,
    allow_admins: boolean,
) {
    // Admins can edit nations regardless of other restrictions.
    if (member.administrator && allow_admins) return

    // Inactive nations cannot be altered or vote.
    if (nation.deleted) Forbidden('Ŋation has been deleted')

    // Otherwise, only representatives can vote for a nation.
    const { ruler } = await One<{ ruler: boolean }>(db`
        SELECT ruler FROM memberships
        WHERE member = ${member.discord_id}
        AND nation = ${nation.id}
        LIMIT 1
    `) ?? Forbidden('You cannot vote for this ŋation as you’re not a member')

    // Ok, the user is a member; if we requested edit access, check
    // that they’re also a ruler.
    if (require_edit_access && !ruler)
        Forbidden('Only rulers can edit a ŋation')
}

export async function CheckHasEditAccessToNation(
    member: MemberProfile,
    nation: NationProfile
) {
    return CheckHasAccessToNationImpl(member, nation, true, true)
}

export async function CheckHasVoteAccessToNation(
    member: MemberProfile,
    nation: NationProfile
) {
    return CheckHasAccessToNationImpl(member, nation, false, false);
}

export async function CanEditNation(
    member: MemberProfile,
    nation: NationProfile
): Promise<boolean> {
    try { await CheckHasEditAccessToNation(member, nation); return true }
    catch (e: unknown) { return false }
}

export async function GetAdmissionOrThrow(id: bigint): Promise<Admission> {
    return await One<Admission>(db`
        SELECT * FROM admissions
        WHERE id = ${id} LIMIT 1
    `) ?? notFound()
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
export async function GetActiveMeeting(): Promise<bigint> {
    const obj = await One<{ value: bigint }>(db`
        SELECT value FROM global_vars
        WHERE id = ${GlobalVar.ActiveMeeting} LIMIT 1
    `)

    return obj?.value ?? NO_ACTIVE_MEETING
}

export async function GetAllMembers(): Promise<MemberProfile[]> {
    return await db`SELECT * FROM members ORDER BY display_name COLLATE NOCASE` as MemberProfile[]
}

export async function GetAllNations(): Promise<NationProfile[]> {
    return await db`SELECT * FROM nations ORDER BY name COLLATE NOCASE` as NationProfile[]
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

async function GetNationCountForQuorum(sql: Bun.SQL): Promise<bigint> {
    return Scalar(sql`
        SELECT COUNT(*) AS value FROM (
            SELECT 1 FROM nations
            INNER JOIN memberships ON memberships.nation = nations.id
            WHERE nations.deleted = FALSE AND nations.observer = FALSE
            GROUP BY nations.id
        )
    `)
}

export async function GetOwnDiscordProfile(
    session: Session | null
): Promise<MemberProfile | null> {
    if (!session?.discord_id) return null

    // Check the DB first.
    let user = await GetMeImpl(session)
    if (user) return user

    // If the member is not in the DB, ask the bot.
    return GetMemberProfileFromDiscord(BigInt(session.discord_id))
}

async function GetMemberProfileFromDiscord(discord_id: bigint): Promise<MemberProfile | null> {
    // Fetch the profile from discord if this user isn’t in the DB.
    const res = await fetch(`${API_URL}/profile`, {
        headers: {
            'Authorization': process.env.SERVICE_TOKEN!,
            'NguhOrg-User-Id': String(discord_id),
        }
    })

    if (!res.ok) return null
    const partial = await res.json() as PartialMemberProfile
    return {
        discord_id,
        represented_nation: null,
        active: 1n,
        administrator: 0n,
        staff_only: 0n,
        ...partial
    } satisfies MemberProfile
}

// This function is a bit more complicated because some non-members may edit admissions.
export async function CheckCanEditAdmission(admission: Admission) {
    // Make sure they’re logged in.
    const session = await auth()
    if (!session?.discord_id) Unauthorised()
    const member_id = BigInt(session.discord_id)

    // Administrators can edit any admission.
    const member = await GetMember(member_id)
    if (member?.administrator) return

    // Otherwise, only the author of the admission can edit their own open admission.
    if (admission.closed || admission.discord_id !== member_id) Forbidden()
}

async function CheckIsNguhcrafter(): Promise<bigint> {
    const session = await auth()
    if (!session?.discord_id) Unauthorised()

    // If they’re in the DB, they’re definitely a member.
    //
    // FIXME: We need some way to ban users since we no longer check whether someone
    //        is a server member on *every* request. Ideally, the bot should just update our
    //        database directly, but for now, we can also do this manually.
    if (await GetMeImpl(session)) return BigInt(session.discord_id)

    // Ask the bot.
    const res = await fetch(`${API_URL}/is_nguhcrafter`, {
        headers: {
            'Authorization': process.env.SERVICE_TOKEN!,
            'NguhOrg-User-Id' : session.discord_id,
        }
    })

    // The bot returns either a 404 or a 204 for this.
    if (!res.ok) Forbidden('You must be a player on the MC server to create a ŋation')
    return BigInt(session.discord_id)
}

export async function GetMe(): Promise<MemberProfile | null> {
    return GetMeImpl(await auth())
}

export async function GetMeImpl(session: Session | null): Promise<MemberProfile | null> {
    if (!session?.discord_id) return null
    return GetMember(BigInt(session.discord_id))
}

export async function One<T>(query: SQL.Query<any>): Promise<T | null> {
    const res = await query
    if (res.length > 1) throw Error("Expected at most one row")
    if (res.length !== 1) return null
    return res[0] as T
}

export async function Scalar(query: SQL.Query<any>): Promise<bigint> {
    const res = await query
    if (res.length > 1) throw Error("Expected at most one row")
    if (res.length !== 1 || !('value' in res[0]) || typeof res[0].value != 'bigint') throw Error("Expected scalar")
    return res[0].value
}

// =============================================================================
//  Other Helpers
// =============================================================================
async function PassAdmissionImpl(admission: Admission) {
    await db.begin(async tx => {
        const result = await tx`
            UPDATE admissions
            SET passed = TRUE, closed = TRUE
            WHERE id = ${admission.id} AND closed = FALSE -- The AND clause is necessary to correctly query the affected rows.
            RETURNING ROWID -- Returning the rowid is a hack; this will return no rows if there were no changes 
        `

        // If this didn’t do anything, stop here so we don’t add a ŋation twice.
        if (result.length === 0) return

        // Add the ŋation.
        const nation_id = await Scalar(tx`
            INSERT INTO nations (name, banner_url) 
            VALUES (${admission.name}, ${admission.banner_url}) 
            RETURNING id AS value
        `)

        // Add the user as a member if they aren’t already one.
        //
        // And for simplicity just also set this as this member’s represented ŋation if
        // they don’t already have one.
        await tx`
            INSERT OR IGNORE INTO members (discord_id, display_name, avatar_url, represented_nation)
            VALUES (${admission.discord_id}, ${admission.display_name}, ${admission.avatar_url}, ${nation_id})
            ON CONFLICT (discord_id)
            DO UPDATE SET represented_nation = ${nation_id} WHERE represented_nation IS NULL
        `

        // And add them as a ruler to the ŋation.
        await tx`
            INSERT INTO memberships (member, nation, ruler) 
            VALUES (${admission.discord_id}, ${nation_id}, TRUE)
        `

        // Finally, forward everything to discord.
        await SendWebhookMessage(
            `<@${admission.discord_id}>’s ŋation [**${admission.name}**](<${process.env.BASE_URL}/nations/${nation_id}>) has been admitted!`
        )
    })

}

function RevalidateAdmission(admission: Admission) {
    revalidatePath('/admissions')
    revalidatePath(`/admission/${admission.id}`)
    revalidatePath(`/admission/${admission.id}/edit`)
}

function RevalidateMotion(motion: Motion) {
    revalidatePath('/motions')
    revalidatePath(`/motion/${motion.id}`)
    revalidatePath(`/motion/${motion.id}/edit`)
    if (motion.meeting) revalidatePath(`/meeting/${motion.meeting}`)
}

async function SendWebhookMessage(content: string, ping = false) {
    const res = await fetch(process.env.WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: `${ping ? `<@&${process.env.UNG_ROLE_ID}> ` : ''}${content}`
        })
    })

    if (!res.ok) console.error(
        'Could not send webhook message:',
        res.status,
        await res.text()
    )
}

async function UpdateMotionAfterVote(tx: Bun.TransactionSQL, motion: Motion) {
    const is_constitutional = motion.type === MotionType.Constitutional

    // The motion’s outcome has already been decided, and if it is a constitutional
    // motion, it already has support.
    if (motion.closed && (!is_constitutional || motion.supported)) return

    // Collect all votes for this motion.
    const res = await One<{ in_favour: bigint, total: bigint }>(tx`
        SELECT SUM(IIF(vote == 1, 1, 0)) as in_favour, COUNT(*) as total
        FROM votes
        WHERE motion = ${motion.id}
    `)

    // Check if the motion for sure passed or was rejected.
    const { in_favour, total } = res!
    if (!motion.closed) {
        // The quorum was fixed when the motion was put to a vote, and we need 50% of those to
        // be in favour. Note that a tie is a rejection. In order to make sure we can accurately
        // observe a tie, convert (a > b / 2) to (a * 2 > b), since that allows us to have no
        // remainder here.
        const passed = in_favour * 2n > motion.quorum;
        const rejected = (total - in_favour) * 2n >= /* (!) */ motion.quorum;

        // Close it and disable it unless it is a constitutional motion; constitutional
        // motions are disabled when constitutional support is reached.
        if (passed || rejected) await tx`
            UPDATE motions
            SET closed = TRUE,
                enabled = ${is_constitutional && !rejected},
                passed = ${passed}
            WHERE id = ${motion.id}
        `

        // No need to check for constitutional support if it hasn't even passed.
        if (!passed) return
    }

    // If this is constitutional motion, check for constitutional support.
    if (is_constitutional) {
        const support_quorum = await GetNationCountForQuorum(tx)

        // '>', not '>='!
        if (in_favour > support_quorum * 3n / 5n) await tx`
            UPDATE motions
            SET enabled = FALSE, supported = TRUE
            WHERE id = ${motion.id}
        `
    }
}