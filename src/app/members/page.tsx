import {Stripe} from '@/components';
import {GetAllMembers, GetMe} from '@/services';
import {MemberList} from '@/app/members/client';

export default async function() {
    const members = await GetAllMembers()
    const me = await GetMe()
    return (
        <>
            <Stripe>Members</Stripe>
            <MemberList members={members} admin={!!me?.administrator}/>
        </>
    )
}