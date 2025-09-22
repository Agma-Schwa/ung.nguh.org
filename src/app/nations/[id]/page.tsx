import {MemberList, Stripe} from '@/components';
import {
    CheckHasEditAccessToNation,
    db,
    GetAllMembers, GetLoggedInMemberOrThrow,
    GetNation, Me,
} from '@/services';
import {notFound} from 'next/navigation';
import {MemberProfile} from '@/api';
import {AddMemberDialog, LeaveDialog} from '@/app/nations/[id]/client';
import {auth} from '@/auth';

export default async function Page({
    params
}: {
    params: Promise<{ id: string }>
}) {
    // Get the ŋation.
    const { id } = await params
    const nation = await GetNation(BigInt(id)) ?? notFound();

    // And its members.
    const members = await db`
        SELECT members.*, memberships.ruler FROM members
        INNER JOIN memberships ON members.discord_id = memberships.member
        WHERE memberships.nation = ${id}
    ` as MemberProfile[]

    // As well as all members that are *not* in the nation; we need this for
    // the 'add member' dialog.
    const not_members = (await GetAllMembers())
        .filter(m => !members.find(nm => nm.ruler && nm.discord_id === m.discord_id))

    // Get the current user.
    const me = await Me(await auth())

    // Check if this user can edit or leave this ŋation.
    let can_edit = me !== null;
    let can_leave = me !== null && members.find(nm => nm.discord_id === me.discord_id)
    if (me) {
        try { await CheckHasEditAccessToNation(me, nation) }
        catch (_) { can_edit = false }
    }

    return (
        <>
            <Stripe>{nation.name}</Stripe>
            <div className='flex'>
                <img src={nation.banner_url!} className='w-32 mx-auto'/>
            </div>
            {nation.observer ? <div className='flex justify-center text-2xl mt-8 gap-2'>
                <em>This ŋation is an observer ŋation</em>
                <span>👀</span>
            </div> : null}
            {nation.wiki_page_link && <a
                href={nation.wiki_page_link}
                className='text-center block mt-6 text-2xl'
            >View Wiki Page</a>}
            <h3 className='my-8 text-left'>Representatives</h3>
            <MemberList members={members} />
            <div className='flex flex-row mt-8 gap-4 h-8'>
                { can_edit ?  <AddMemberDialog nation={nation} not_members={not_members} />  : null }
                { can_leave ? <LeaveDialog nation={nation} me={me!} /> : null }
            </div>
        </>
    )
}