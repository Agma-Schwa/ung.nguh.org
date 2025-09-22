import {MemberProfile, NationPartial} from '@/app/api';
import {Session} from '@auth/core/types';
import {SQL} from 'bun';

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

export async function Me(session: Session | null): Promise<MemberProfile | null> {
    if (!session || !session?.user?.id) return null
    let user = await db`SELECT * FROM members WHERE discord_id = ${session.user.id} LIMIT 1`
    if (user.length === 1) return user[0]
    return null
}

export async function GetOwnDiscordProfile(
    session: Session | null
): Promise<MemberProfile | null> {
    'use server';
    if (!session || !session?.user?.id) return null

    // Check the DB first.
    let user = Me(session)
    if (user) return user

    // Fetch the profile from discord if this user isn’t in the DB.
    const res = await fetch(`${API_URL}/profile`, {
        headers: {
            'Authorization': process.env.SERVICE_TOKEN!,
            'NguhOrg-User-Id' : session.user.id,
        }
    })

    let partial = await res.json() as PartialMemberProfile
    return {
        discord_id: session.user.id,
        represented_nation: null,
        active: true,
        administrator: false,
        staff_only: false,
        ...partial
    } satisfies MemberProfile
}