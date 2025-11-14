import {Stripe} from '@/components';
import {db, GetMe} from '@/services';
import {Meeting, MemberProfile, Motion} from '@/api';
import {MotionList} from '@/app/motions/motion';
import {IsVotable} from '@/utils';

export default async function() {
    const me = await GetMe()
    const motions = await db`SELECT * FROM motions` as Motion[]
    const members = await db`SELECT * FROM members` as MemberProfile[]
    const meetings = await db`SELECT * FROM meetings` as Meeting[]
    const open = motions.filter(m => IsVotable(m))
    const closed = motions.filter(m => !IsVotable(m))
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