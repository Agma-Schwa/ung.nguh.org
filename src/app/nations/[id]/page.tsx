import {IconEye, IconHeadstone, Stripe} from '@/components';
import {CanEditNation, db, GetAllMembers, GetMe, GetNation,} from '@/services';
import {notFound} from 'next/navigation';
import {MemberProfile} from '@/api';
import {AddMemberDialog, DemoteControls, EditButton, LeaveDialog, NationMemberList} from '@/app/nations/[id]/client';

export default async function({
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
    const me = await GetMe()

    // Check if this user can edit or leave this ŋation.
    let can_edit = me !== null && await CanEditNation(me, nation);
    let can_leave = me !== null && members.find(nm => nm.discord_id === me.discord_id)
    return (
        <>
            <Stripe>{nation.name}</Stripe>
            <div className='flex'>
                <img src={URL.canParse(nation.banner_url ?? '') ? nation.banner_url! : null!} className='w-32 mx-auto'/>
            </div>
            {nation.observer && !nation.deleted ? <div className='flex justify-center text-2xl mt-8'>
                <em>This ŋation is an observer ŋation</em>
                <IconEye />
            </div> : null}
            {nation.deleted ? <div className='flex justify-center text-2xl mt-8'>
                <em>This ŋation has been deleted</em>
                <IconHeadstone />
            </div> : null}
            {nation.wiki_page_link && <a
                href={nation.wiki_page_link}
                className='text-center block mt-6 text-2xl'
            >View Wiki Page</a>}
            <h3 className='my-8 text-left'>Members</h3>
            <NationMemberList
                can_edit={can_edit}
                is_admin={!!me?.administrator}
                nation={nation}
                members={members}
            />
            <div className='flex flex-row mt-8 gap-4'>
                { can_edit ? <AddMemberDialog nation={nation} not_members={not_members} /> : null }
                { can_edit ? <EditButton id={nation.id} /> : null }
                { can_leave ? <LeaveDialog nation={nation} me={me!} /> : null }
                { me ? <DemoteControls nation={nation} can_edit={can_edit} me={me} /> : null }
            </div>
        </>
    )
}