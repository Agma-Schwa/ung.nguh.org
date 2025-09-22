'use server'

import {MemberProfile, NationProfile} from '@/api';
import {Session} from '@auth/core/types';
import {SQL} from 'bun';
import {auth} from '@/auth';
import {createSafeActionClient, SafeActionFn} from 'next-safe-action';
import {z} from 'zod';
import {notFound} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {useAction} from 'next-safe-action/hooks';


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
    const author = await GetLoggedInMemberOrThrow()
    const nation = await GetNation(nation_id) ?? BadRequest('Nation not found')

    // Ensure that this user can edit this nation.
    await CheckHasEditAccessToNation(author, nation)

    // Ensure that the user we’re trying to add exists.
    let member = await GetMember(member_to_add) ?? BadRequest('Member not found')

    // Staff-only accounts cannot be added to a nation.
    if (member.staff_only) BadRequest('Cannot add this user to a nation')

    // Otherwise, attempt to add them.
    const res = await db`
        INSERT OR IGNORE INTO memberships (member, nation, ruler) 
        VALUES (${member.discord_id}, ${nation.id}, ${ruler})
        ON CONFLICT (member, nation)
        DO UPDATE SET ruler = ${ruler}
    `

    console.log(res)
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
async function CheckHasEditAccessToNationImpl(
    member: MemberProfile,
    nation: NationProfile,
    require_edit_access: boolean,
    allow_admins: boolean,
) {
    // Admins can edit nations regardless of other restrictions.
    if (member.administrator && allow_admins) return

    // Inactive nations cannot be altered.
    if (!nation.active) Forbidden('Nation is locked')

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

async function CheckHasEditAccessToNation(
    member: MemberProfile,
    nation: NationProfile
) {
    return CheckHasEditAccessToNationImpl(member, nation, true, true)
}

async function GetLoggedInMemberOrThrow(): Promise<MemberProfile> {
    const session = await auth()
    const id = session?.discord_id ?? Unauthorised()
    return await One<MemberProfile>(db`
        SELECT * FROM members WHERE 
        discord_id = ${id} LIMIT 1`
    ) ?? Unauthorised()
}

// =============================================================================
//  Data Fetching
// =============================================================================

export async function GetAllMembers(): Promise<MemberProfile[]> {
    return await db`SELECT * FROM members ORDER BY display_name` as MemberProfile[]
}

export async function GetMember(id: bigint): Promise<MemberProfile | null> {
    return One<MemberProfile>(db`
        SELECT * FROM members WHERE 
        discord_id = ${id} LIMIT 1
    `)
}

export async function GetNation(id: bigint): Promise<NationProfile | null> {
    return One<NationProfile>(db`
        SELECT * FROM nations 
        WHERE id = ${id} LIMIT 1`
    )
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
        active: true,
        administrator: false,
        staff_only: false,
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