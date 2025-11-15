import {Stripe} from '@/components';
import {db, GetAllMembers, GetMe} from '@/services';
import {Meeting, Motion} from '@/api';
import {MotionList} from '@/app/motions/motion';
import {IsVotable} from '@/utils';

export default async function() {
    const me = await GetMe()
    const motions = await db`SELECT * FROM motions` as Motion[]
    const meetings = await db`SELECT * FROM meetings` as Meeting[]
    const members = await GetAllMembers()
    const active = motions.filter(m => IsVotable(m) && m.enabled)
    const open = motions.filter(m => IsVotable(m) && !m.enabled)
    const closed = motions.filter(m => !IsVotable(m))
    return (
        <>
            <Stripe>Motions</Stripe>
            <div className='flex flex-col gap-12'>
                {active.length !== 0 ? <div>
                    <h3 className='mb-4'>Active Motions</h3>
                    <MotionList motions={active} members={members} meetings={meetings} />
                </div> : null}

                {open.length !== 0 ? <div>
                    <h3 className='mb-4'>Open Motions</h3>
                    <MotionList motions={open} members={members} meetings={meetings} interactive={!!me?.administrator} />
                </div> : null}

                <div>
                    <h3 className='mb-4'>Closed Motions</h3>
                    <MotionList motions={closed} members={members} meetings={meetings} />
                </div>
            </div>
        </>
    )
}