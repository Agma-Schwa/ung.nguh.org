import {MemberList, Stripe} from '@/app/components';
import type {MemberProfile} from '@/app/api';
import {db} from '@/app/services';

export default async function Page() {
    const members = await db`SELECT * FROM members ORDER BY display_name` as MemberProfile[];
    return (
        <>
            <Stripe>Members</Stripe>
            <MemberList members={members}/>
        </>
    )
}