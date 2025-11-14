import {Nation, Stripe} from '@/components';
import {db} from '@/services';
import {Admission} from '@/api';
import {Fragment} from 'react';
import Link from 'next/link';

function Admissions({
    admissions,
}: {
    admissions: Admission[];
}) {
    return <div className='grid gap-4 grid-cols-[auto_1fr] mt-2'>
        {admissions.map(a => <Fragment key={a.id}>
            <Link href={`/admissions/${a.id}`}>
                <Nation nation={a} member={a} />
            </Link>
            <div className='text-ell-nowrap'>
                {a.trivia || <em>(No description provided)</em>}
            </div>
        </Fragment>)}
    </div>
}

export default async function() {
    const admissions = await db`SELECT * FROM admissions` as Admission[];
    const open = admissions.filter(a => !a.closed)
    const closed = admissions.filter(a => a.closed)
    return (
        <>
            <Stripe>Admissions</Stripe>
            <h3>Open Admissions</h3>
            { open.length !== 0 ? <Admissions admissions={open} /> : <p>There are no open admissions at the moment</p> }

            <h3 className='mt-12'>Closed Admissions</h3>
            <Admissions admissions={closed} />
        </>
    )
}