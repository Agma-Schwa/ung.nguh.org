import {Nation, Stripe} from '@/components';
import {MemberProfile, NationProfile} from '@/api'
import {db, GetMe} from '@/services';
import {SelectRepresentedNationWidget} from '@/app/nations/client';

function List({
    me,
    nations
}: {
    me?: MemberProfile,
    nations: NationProfile[],
}) {
    return (
        <div className='flex flex-col gap-6 mb-12 ml-2'>
            {nations.map(n => <Nation
                key={n.id}
                nation={n}
                starred={me?.represented_nation === n.id}
                link={true}
            />)}
        </div>
    )
}

async function GetMyNations(me: MemberProfile | null): Promise<NationProfile[]> {
    if (!me) return []
    return db`
        SELECT nations.* FROM nations
        JOIN memberships ON memberships.nation = nations.id
        WHERE memberships.member = ${me.discord_id} AND nations.deleted = FALSE
    `;
}

export default async function() {
    const me = await GetMe()
    const all_nations = await db`SELECT * FROM nations ORDER BY name COLLATE NOCASE` as NationProfile[]
    const deleted = all_nations.filter(n => n.deleted)
    const not_deleted = all_nations.filter(n => !n.deleted)
    const my_nations = await GetMyNations(me)
    const my_non_observer_nations = my_nations.filter(n => !n.observer)
    const other_nations = not_deleted.filter(n => !my_nations.find(m => m.id === n.id))
    const num_deleted = deleted.length
    const num_observer = not_deleted.filter(n => n.observer).length
    const num_active = not_deleted.length - num_observer
    return (
        <>
            <Stripe>Ŋations</Stripe>
            <div>
                <p className='text-center text-2xl mb-8'>
                    Active Ŋations: {num_active},
                    Observer Ŋations: {num_observer}
                    {me?.administrator ? `, Deleted Ŋations: ${num_deleted}` : ''}
                </p>
                {!me ? <List nations={not_deleted} /> : <div>
                    {my_nations.length !== 0 ? <>
                        <h3 className='mb-6'>My Ŋations</h3>
                        {my_non_observer_nations.length > 1 ? <div className='mb-6'>
                            <SelectRepresentedNationWidget me={me} nations={my_non_observer_nations} />
                        </div> : null}
                        <List nations={my_nations} me={me} />
                        <h3 className='mb-6'>Other Ŋations</h3>
                    </> : null}
                    <List nations={other_nations} />
                    {me.administrator ? <>
                        <h3 className='mb-6'>Deleted Ŋations</h3>
                        <List nations={deleted} />
                    </> : null}
                </div>}
            </div>
        </>
    )
}