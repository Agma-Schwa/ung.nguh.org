'use server'

import {
    Admission, ClosureReason,
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
import {
    AdmissionSchema, CanEditMotion,
    ClosureReasonSchema, FormatMotionType, IsVotable, MotionSchema, UnixTimestampSeconds
} from '@/utils';

// =============================================================================
//  Globals and Types
// =============================================================================
const API_URL = 'http://localhost:25000'
const MEMBER_UPDATE_INTERVAL_SECONDS = 60n * 60n * 6n

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
    const affected = await AffectedRows(db`
        INSERT OR IGNORE INTO memberships (member, nation, ruler) 
        VALUES (${member.discord_id}, ${nation.id}, ${ruler})
        ON CONFLICT (member, nation)
        DO UPDATE SET ruler = ${ruler}
        WHERE ruler != ${ruler}
    `)

    // If this changed something, and this member has no selected nation to represent,
    // set this ŋation as the selected ŋation, but only if the nation is not an observer
    // nation since those can’t vote in the first place.
    if (
        affected &&
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

/** Remove all participants from a meeting. */
export const ClearParticipants = ActionClient.inputSchema(z.object({})).action(Wrap(async() =>{
    const me = await GetLoggedInMemberOrThrow()
    if (!me.administrator) Forbidden()
    await ClearParticipantsImpl(db)
    revalidatePath('/')
}))

/** Close a motion. */
export const CloseMotion = ActionClient.inputSchema(z.object({
    motion_id: z.bigint(),
    reason: ClosureReasonSchema
})).action(Wrap(async ({ parsedInput: { motion_id, reason } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const motion = await GetMotionOrThrow(motion_id)
    if (!me.administrator) Forbidden()

    // Disallow passing motions as this should only be used for rejections.
    if (reason === ClosureReason.Passed)
        Forbidden('A motion cannot be passed this way!')

    await CloseMotionImpl(db, motion, reason)
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

    await SendWebhookMessage(
        `<@${me.discord_id}> has proposed a new motion: [**${title} [${FormatMotionType(type).toUpperCase()}]**](<${process.env.BASE_URL}/motions/${id}>)!`,
        false
    )

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

/** Enable or disable participation. */
export const EnableOrDisableMeetingParticipation = ActionClient.inputSchema(z.object({
    enable: z.boolean()
})).action(Wrap (async ({ parsedInput: { enable }}) => {
    const me = await GetLoggedInMemberOrThrow()
    if (!me.administrator) Forbidden()
    await SetParticipationEnabled(db, enable)
    revalidatePath('/')
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

    // Can’t enable a motion that has been closed.
    if (motion.closed) BadRequest('Motion is already closed')

    // Do it.
    if (enable) {
        await db.transaction(async tx => {
            await tx`
                UPDATE motions
                SET enabled = TRUE, quorum = (SELECT COUNT(*) FROM meeting_participants)
                WHERE id = ${motion.id} AND meeting = ${motion.meeting}
            `
        })
    } else {
        await db`
            UPDATE motions
            SET enabled = FALSE
            WHERE id = ${motion.id} AND meeting = ${motion.meeting}
        `
    }

    revalidatePath(`/motion/${motion.id}`)
}))

/** Formally end the current meeting. */
export const FinishMeeting = ActionClient.inputSchema(z.object({})).action(Wrap(async () => {
    const me = await GetLoggedInMemberOrThrow()
    const active = await GetActiveMeeting()
    const meeting = await GetMeetingOrThrow(active)
    if (!me.administrator) Forbidden()
    if (meeting.finished) BadRequest('Meeting already finished!')
    await db.transaction(async tx => {
        // For all open motions that are part of this meeting and which have not
        // been closed yet, recompute the quorum based on the total member count.
        const quorum = await GetNationCountForQuorum(tx)
        await tx`
            UPDATE motions
            SET quorum = ${quorum}, locked = TRUE, enabled = TRUE
            WHERE meeting = ${active} AND closed = FALSE
        `

        // Disable meeting participation and remove all participants.
        await SetParticipationEnabled(tx, false)
        await ClearParticipantsImpl(tx)

        // Clear the active meeting.
        await SetActiveMeetingImpl(tx, NO_ACTIVE_MEETING)

        // Mark that the meeting is finished.
        await tx`
            UPDATE meetings
            SET finished = TRUE
            WHERE id = ${meeting.id}
        `
    })

    // TODO: If there are any enabled motions left, ping everyone to vote on them.
    await SendWebhookMessage(`Meeting ${meeting.name} has concluded`)
    revalidatePath('/')
    revalidatePath('/meetings')
}))

/** Join or leave the current meeting. */
export const JoinOrLeaveMeeting = ActionClient.inputSchema(z.object({
    join: z.boolean(),
})).action(Wrap (async ({ parsedInput: { join }}) => {
    const me = await GetLoggedInMemberOrThrow()
    const nation = await GetNationForVote(me)
    const active = await GetActiveMeeting()
    await GetMeetingOrThrow(active) // Just ensure there is one.
    if (!await GetParticipationEnabled()) Forbidden("Participation is currently disabled")
    await db.transaction(async tx => {
        // Add the member.
        if (!join) {
            if (!await AffectedRows(tx`
                DELETE FROM meeting_participants WHERE nation = ${nation.id}
            `)) return
        } else {
            if (!await AffectedRows(tx`
                INSERT OR IGNORE INTO meeting_participants (nation)
                VALUES (${nation.id})
            `)) return
        }

        // If this changed something, adjust the quorum for any currently enabled motions
        // that this member nation has not voted on.
        await tx`
            UPDATE motions
            SET quorum = quorum + ${join ? 1n : -1n}
            WHERE closed = FALSE AND
                  enabled = TRUE AND
                  meeting = ${active} AND
                  ${nation.id} NOT IN (
                SELECT nation FROM votes
                WHERE motion = motions.id
            )
        `
    })

    revalidatePath('/')
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
        const affected = await AffectedRows(tx`
            DELETE FROM memberships 
            WHERE member = ${member.discord_id} 
            AND nation = ${nation.id}
        `)

        // It’s possible for this to fail if two people attempt to remove
        // the same member at the same time; give up.
        if (!affected) return

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
            const random_member = await One<{ member: bigint }>(tx`
                SELECT member FROM memberships WHERE nation = ${nation.id} LIMIT 1
            `)

            // This may return nothing if this ŋation is out of members; demote the
            // ŋation to an observer ŋation in that case.
            if (!random_member?.member) {
                await tx`UPDATE nations SET observer = TRUE WHERE id = ${nation.id}`
            } else {
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
                reason = 0
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
    if (motion.closed) BadRequest('Motion already closed')
    if (motion.enabled) BadRequest('Can’t reschedule a motion that is still enabled')

    // Clear the meeting if null was passed, else set it to the meeting’s ID.
    if (meeting) {
        if (meeting.finished) BadRequest('Can’t schedule a motion for a finished meeting')
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

    // Check that the meeting actually exists and is not finished.
    if (meeting_id !== NO_ACTIVE_MEETING) {
        const meeting = await GetMeetingOrThrow(meeting_id)
        if (meeting.finished) BadRequest('Cannot set finished meeting as active')
    }

    await SetActiveMeetingImpl(db, meeting_id)

    revalidatePath('/')
    revalidatePath('/meetings')
}))

/** Ban or unban a user. */
export const SetMemberAccountStatus = ActionClient.inputSchema(z.object({
    member_id: z.bigint(),
    active: z.boolean()
})).action(Wrap (async ({ parsedInput: { member_id, active } }) => {
    const me = await GetLoggedInMemberOrThrow()
    const member = await GetMember(member_id) ?? notFound()
    if (!me.administrator) Forbidden()
    if (member.administrator) Forbidden("Cannot ban an administrator")
    await db`
        UPDATE members
        SET active = ${active}
        WHERE discord_id = ${member_id}
    `
    revalidatePath('/members')
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
        const affected = await AffectedRows(tx`
            INSERT OR IGNORE INTO admission_votes (admission, member, nation, vote)
            VALUES (${admission.id}, ${me.discord_id}, ${nation.id}, ${vote})
            ON CONFLICT (admission, nation)
            DO UPDATE SET member = ${me.discord_id}, vote = ${vote}
        `)

        if (!affected) return

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
    if (!motion.enabled || !IsVotable(motion)) {
        // If the motion is closed, it’s likely that someone’s vote just passed
        // or rejected it; don’t error in that case and just reload the page.
        if (motion.closed) {
            RevalidateMotion(motion)
            return
        }

        Forbidden()
    }

    // A user must have registered an active ŋation before they can vote.
    const nation = await GetNationForVote(me)

    // If the meeting that the motion is scheduled for is active, then a member
    // can only vote if they are a meeting participant.
    if (await GetActiveMeeting() === motion.meeting) {
        const participant = await Scalar(db`
            SELECT COUNT(*) AS value FROM meeting_participants
            WHERE nation = ${nation.id}
        `)

        if (participant === 0n) Forbidden('You must join the meeting before you can vote!')
    }

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

    RevalidateMotion(motion)
}))

// This abomination of a function compensates for the fact that NextJS is
// too stupid to allow us to return errors from actions in a sensible manner.
//
// The silver lining is that this wrapper effectively acts as a kind of middleware,
// which just happens to be what we need to perform some early access checks.
function Wrap<A extends any[]>(callable: (...args: [...A]) => Promise<any>) {
    return async (...args: [...A]): Promise<any> => {
        try {
            // Prevent inactive members from taking any action.
            const me = await GetMe()
            if (me !== null && !me.active) Forbidden()

            // Forward the request.
            return await callable(...args)
        } catch (e: unknown) {
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
    if (nation.observer) Forbidden('Observer ŋations cannot vote or join meetings!')
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
    catch (_: unknown) { return false }
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
    const members = await db`SELECT * FROM members ORDER BY display_name COLLATE NOCASE` as MemberProfile[]
    return Promise.all(members.map(m => UpdateMember(m)))
}

export async function GetAllNations(): Promise<NationProfile[]> {
    return await db`SELECT * FROM nations ORDER BY name COLLATE NOCASE` as NationProfile[]
}

export async function GetMember(id: bigint): Promise<MemberProfile | null> {
    const member = await One<MemberProfile>(db`
        SELECT * FROM members WHERE
        discord_id = ${id} LIMIT 1
    `)

    return UpdateMember(member)
}

export async function GetMembersOfNation(id: bigint): Promise<MemberProfile[]> {
    const members = await db`
        SELECT members.*, memberships.ruler FROM members
        INNER JOIN memberships ON members.discord_id = memberships.member
        WHERE memberships.nation = ${id}
        ORDER BY members.display_name COLLATE NOCASE
    ` as MemberProfile[]
    return Promise.all(members.map(m => UpdateMember(m)))
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
    const user = await GetMeImpl(session)
    if (user) return user

    // If the member is not in the DB, ask the bot.
    const discord_id = BigInt(session.discord_id)
    const partial = await GetMemberProfileFromDiscord(discord_id);
    if (!partial) return null
    return {
        discord_id,
        updated: UnixTimestampSeconds(),
        represented_nation: null,
        active: 1n,
        administrator: 0n,
        staff_only: 0n,
        ...partial
    } satisfies MemberProfile
}

export async function GetParticipationEnabled(): Promise<bigint> {
    return await Scalar(db`
        SELECT value FROM global_vars
        WHERE id = ${GlobalVar.AllowMembersToJoinTheActiveMeeting}
    `)
}

async function GetMemberProfileFromDiscord(discord_id: bigint): Promise<PartialMemberProfile | null> {
    // Fetch the profile from discord if this user isn’t in the DB.
    const res = await fetch(`${API_URL}/profile`, {
        headers: {
            'Authorization': process.env.SERVICE_TOKEN!,
            'NguhOrg-User-Id': String(discord_id),
        }
    })

    if (!res.ok) return null
    return await res.json() as PartialMemberProfile
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

export async function AffectedRows(query: SQL.Query<any>): Promise<bigint> {
    const res = await query
    return res.count
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
async function ClearParticipantsImpl(tx: Bun.SQL) {
    // Yes, delete all data from this table.
    return tx`DELETE FROM meeting_participants`
}

async function CloseMotionImpl(tx: Bun.SQL, motion: Motion, reason: ClosureReason) {
    await tx`
        UPDATE motions
        SET closed = TRUE,
            enabled = ${motion.type === MotionType.Constitutional && reason === ClosureReason.Passed},
            reason = ${reason}
        WHERE id = ${motion.id}
    `
}

async function PassAdmissionImpl(admission: Admission) {
    await db.begin(async tx => {
        const affected = await AffectedRows(tx`
            UPDATE admissions
            SET passed = TRUE, closed = TRUE
            WHERE id = ${admission.id} AND closed = FALSE -- The AND clause is necessary to correctly query the affected rows. 
        `)

        // If this didn’t do anything, stop here so we don’t add a ŋation twice.
        if (!affected) return

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
    try {
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
    } catch (e) {
        console.error('Error sending webhook message:', e)
    }
}

async function SetActiveMeetingImpl(tx: Bun.SQL, meeting_id: bigint) {
    return tx`
        UPDATE global_vars
        SET value = ${meeting_id}
        WHERE id = ${GlobalVar.ActiveMeeting}
    `
}

async function SetParticipationEnabled(tx: Bun.SQL, enable: boolean) {
    return tx`
        UPDATE global_vars
        SET value = ${enable}
        WHERE id = ${GlobalVar.AllowMembersToJoinTheActiveMeeting}
    `
}

async function UpdateMember<T extends MemberProfile | null>(member: T): Promise<T> {
    // Return the object as-is if the member is inactive.
    if (!member || !member.active) return member

    // Don’t do this in dev mode since we don’t have access to the right server.
    if (process.env.NODE_ENV === 'development') return member

    // Update the profile if the update interval has elapsed.
    const now = UnixTimestampSeconds();
    if (now - member.updated > MEMBER_UPDATE_INTERVAL_SECONDS) {
        const partial = await GetMemberProfileFromDiscord(member.discord_id)

        // If something goes wrong here, assume the member has been banned; we
        // can always unban them manually. Also update the object that we’re about
        // to return (we don’t update the 'updated' field because it’s only used here).
        if (!partial) {
            member.active = 0n
            await db`
                UPDATE members
                SET active = FALSE, updated = ${now}
                WHERE discord_id = ${member.discord_id}
            `
        } else {
            member.display_name = partial.display_name
            member.avatar_url = partial.avatar_url
            await db`
                UPDATE members
                SET display_name = ${partial.display_name},
                    avatar_url = ${partial.avatar_url},
                    updated = ${now}
                WHERE discord_id = ${member.discord_id}
            `
        }

        console.log("HERE", member)
    }

    return member
}

async function UpdateMotionAfterVote(tx: Bun.SQL, motion: Motion) {
    // Collect all votes for this motion.
    const res = await One<{ in_favour: bigint, total: bigint }>(tx`
        SELECT SUM(IIF(vote == 1, 1, 0)) as in_favour, COUNT(*) as total
        FROM votes
        WHERE motion = ${motion.id}
    `)

    // Check if the motion for sure passed or was rejected.
    const is_constitutional = motion.type === MotionType.Constitutional
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
        if (passed || rejected) await CloseMotionImpl(
            tx,
            motion,
            passed ? ClosureReason.Passed : ClosureReason.RejectedByVote
        )

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