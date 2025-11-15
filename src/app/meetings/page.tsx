import {Stripe} from '@/components';
import {db} from '@/services';
import {Meeting} from '@/api';
import Link from 'next/link';

export default async function() {
    const meetings = await db`SELECT * FROM meetings WHERE finished = TRUE ORDER BY ROWID DESC` as Meeting[]
    return (
        <>
            <Stripe>Past Meetings</Stripe>
            <ul className='flex flex-col gap-2'>
                {meetings.map(m => <li key={m.id}>
                    <Link href={`/meetings/${m.id}`}>Meeting {m.name}</Link>
                </li>)}
            </ul>
        </>
    )
}