import {MemberList, Stripe} from '@/components';
import {GetAllMembers} from '@/services';

export default async function Page() {
    const members = await GetAllMembers()
    return (
        <>
            <Stripe>Members</Stripe>
            <MemberList members={members}/>
        </>
    )
}