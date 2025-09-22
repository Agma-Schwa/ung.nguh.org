
import {Stripe} from '@/app/components';
import { sql } from 'bun'
import type {MemberProfile} from '@/app/api';

function Member({
    member
}: {
    member: MemberProfile
}) {
    return (
        <div className='flex gap-2 text-2xl'>
            <div>
                <img
                    src={member.avatar_url}
                    className='w-8 rounded-full select-none'
                    alt={member.display_name}
                />
            </div>
            <div className='leading-8'>
                <span className={member.active ? "" : "line-through text-gray-500"}>
                    {member.display_name}
                </span>
            </div>
            {member.administrator ? <span className='select-none'>🛡️</span> : null}
        </div>
    )
}

export default async function Page() {
    'use server';
    const members = await sql`SELECT * FROM members ORDER BY display_name` as MemberProfile[];

    return (
        <>
            <Stripe>Members</Stripe>
            <div className='flex flex-col gap-2'>
                {members.map((m) => <Member key={m.discord_id} member={m}/>)}
            </div>
        </>
    )
}