import {Stripe} from '@/components';
import {db, Me} from '@/services';
import {Meeting, MemberProfile, Motion} from '@/api';
import {MotionList} from '@/app/motions/motion';
import {auth} from '@/auth';

export default async function() {
    const session = await auth()
    const me = await Me(session)
    const motions = await db`SELECT * FROM motions` as Motion[]
    const members = await db`SELECT * FROM members` as MemberProfile[]
    const meetings = await db`SELECT * FROM meetings` as Meeting[]
    const open = motions.filter(m => !m.closed)
    const closed = motions.filter(m => m.closed)
    return (
        <>
            <Stripe>Motions</Stripe>

            <h3 className='mb-4'>Open Motions</h3>
            <MotionList motions={open} members={members} meetings={meetings} interactive={!!me?.administrator} />

            <h3 className='mb-4 mt-12'>Closed Motions</h3>
            <MotionList motions={closed} members={members} meetings={meetings} />
        </>
    )
}