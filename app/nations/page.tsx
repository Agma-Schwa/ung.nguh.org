import {Nation, Stripe} from '@/app/components';
import {sql} from 'bun';
import {NationProfile} from '@/app/api'

export default async function Page() {
    const nations = await sql`SELECT * FROM nations ORDER BY name` as NationProfile[]
    const num_active = nations.filter(n => !n.observer).length
    console.log(nations)
    return (
        <>
            <Stripe>Ŋations</Stripe>
            <div>
                <p className='text-center text-2xl mb-8'>
                    Active Ŋations: {num_active},
                    Observer Ŋations: {nations.length - num_active}
                </p>
                {nations.map(n => <Nation key={n.id} nation={n} />)}
            </div>
        </>
    )
}