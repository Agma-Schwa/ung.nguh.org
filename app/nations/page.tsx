import {Nation, Stripe} from '@/app/components';
import {MemberProfile, NationProfile} from '@/app/api'
import {db, Me} from '@/app/services';
import {auth} from '@/auth';

export default async function Page() {
    function List({ nations }: { nations: NationProfile[] }) {
        return (
            <div className='flex flex-col gap-6 mb-12 ml-2'>
                {nations.map(n => <Nation key={n.id} nation={n} />)}
            </div>
        )
    }

    async function GetMyNationIds(me: MemberProfile | null): Promise<{ nation: bigint }[]> {
        if (!me) return []
        return db`SELECT nation FROM memberships WHERE member = ${me.discord_id}`;
    }

    const me = await Me(await auth())
    const nations = await db`SELECT * FROM nations ORDER BY name` as NationProfile[]
    const my_nation_ids = await GetMyNationIds(me)
    const my_nations = my_nation_ids.map(my => nations.find(n => n.id === my.nation)!)
    const other_nations = nations.filter(n => !my_nations.includes(n))
    const num_active = nations.filter(n => !n.observer).length
    return (
        <>
            <Stripe>Ŋations</Stripe>
            <div>
                <p className='text-center text-2xl mb-8'>
                    Active Ŋations: {num_active},
                    Observer Ŋations: {nations.length - num_active}
                </p>
                {!me ? <List nations={nations} /> : <div>
                    <h3 className='mb-6'>My Ŋations</h3>
                    <List nations={my_nations} />
                    <h3 className='mb-6'>Other Ŋations</h3>
                    <List nations={other_nations} />
                </div>}
            </div>
        </>
    )
}