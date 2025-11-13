import {Stripe} from '@/components';
import {db, GetAllMembers, GetMeetingOrThrow} from '@/services';
import {Motion} from '@/api';
import {MotionList} from '@/app/motions/motion';

export async function Meeting({
    id,
}: {
    id: bigint,
}) {
    const meeting = await GetMeetingOrThrow(id)
    const motions = await db`SELECT * FROM motions WHERE meeting = ${meeting.id}` as Motion[]
    const members = await GetAllMembers()
    return (
        <>
            <Stripe>Meeting {meeting.name}</Stripe>
            <MotionList motions={motions} members={members} meetings={[meeting]} />
        </>
    )
}