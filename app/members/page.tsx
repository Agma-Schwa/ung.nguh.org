import {MemberList, Stripe} from '@/app/components';
import { sql } from 'bun'
import type {MemberProfile} from '@/app/api';

export default async function Page() {
    const members = await sql`SELECT * FROM members ORDER BY display_name` as MemberProfile[];
    return (
        <>
            <Stripe>Members</Stripe>
            <MemberList members={members}/>
        </>
    )
}