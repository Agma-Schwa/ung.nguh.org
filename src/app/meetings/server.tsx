import {db, GetAllMembers} from '@/services';
import {Meeting, Motion} from '@/api';
import {MotionList} from '@/app/motions/motion';

export async function MeetingInfo({
    meeting,
}: {
    meeting: Meeting,
}) {
    const motions = await db`SELECT * FROM motions WHERE meeting = ${meeting.id}` as Motion[]
    const members = await GetAllMembers()
    return <MotionList
        motions={motions}
        members={members}
        meetings={[meeting]}
        hide_status={true}
    />
}