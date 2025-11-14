import {Nation, Stripe} from '@/components';
import {MemberProfile, NationProfile} from '@/api'
import {db, GetMe} from '@/services';
import Link from 'next/link';
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
            {nations.map(n => <Link key={n.id} href={`/nations/${n.id}`}>
                <Nation nation={n} starred={me?.represented_nation === n.id} />
            </Link>)}
        </div>
    )
}

async function GetMyNationIds(me: MemberProfile | null): Promise<{ nation: bigint }[]> {
    if (!me) return []
    return db`SELECT nation FROM memberships WHERE member = ${me.discord_id}`;
}

export default async function() {
    const me = await GetMe()
    const all_nations = await db`SELECT * FROM nations ORDER BY name COLLATE NOCASE` as NationProfile[]
    const my_nation_ids = await GetMyNationIds(me)
    const not_deleted = all_nations.filter(n => !n.deleted)
    const visible = me?.administrator ? all_nations : not_deleted
    const my_nations = my_nation_ids.map(my => visible.find(n => n.id === my.nation)!).filter(n => !n.deleted)
    const other_nations = visible.filter(n => !my_nations.includes(n) && !n.deleted)
    const num_deleted = all_nations.length - not_deleted.length
    const num_observer = visible.filter(n => n.observer).length
    const num_active = all_nations.length - num_deleted - num_observer
    return (
        <>
            <Stripe>Ŋations</Stripe>
            <div>
                <p className='text-center text-2xl mb-8'>
                    Active Ŋations: {num_active},
                    Observer Ŋations: {num_observer}
                    {me?.administrator ? `, Deleted Ŋations: ${num_deleted}` : ''}
                </p>
                {!me ? <List nations={visible} /> : <div>
                    {my_nations.length !== 0 ? <>
                        <h3 className='mb-6'>My Ŋations</h3>
                        {my_nations.filter(n => !n.observer).length > 1 ? <div className='mb-6'>
                            <SelectRepresentedNationWidget me={me} nations={my_nations} />
                        </div> : null}
                        <List nations={my_nations} me={me} />
                        <h3 className='mb-6'>Other Ŋations</h3>
                    </> : null}
                    <List nations={other_nations} />
                    {me.administrator ? <>
                        <h3 className='mb-6'>Deleted Ŋations</h3>
                        <List nations={all_nations.filter(n => n.deleted)} />
                    </> : null}
                </div>}
            </div>
        </>
    )
}