import {Member, Stripe, Votes} from '@/components';
import {db, GetActiveMeeting, GetMe, GetMeeting, GetMember, GetMotionOrThrow} from '@/services';
import {notFound} from 'next/navigation';
import {GetMotionEmoji} from '@/app/motions/motion';
import {Meeting, MemberProfile, Motion, MotionType, Vote} from '@/api';
import {MarkdownText, MotionButtons} from '@/app/motions/[id]/client';
import {FormatMotionType} from '@/utils';
import {ScheduleMotionButton} from '@/app/motions/client';

function FormatMotionResult(motion: Motion) {
    if (!motion.passed)
        return <p className='mt-4 text-rose-400'><strong>REJECTED</strong></p>
    if (motion.type != MotionType.Constitutional)
        return <p className='mt-4 text-emerald-400'><strong>PASSED</strong></p>
    if (motion.supported)
        return <p className='mt-4 text-emerald-400'><strong>SUPPORTED</strong></p>
    return <p className='mt-4 text-amber-200'><strong>PASSED ON CONDITION OF SUPPORT</strong></p>
}

async function RescheduleMotionButton({
    me,
    motion
}: {
    me: MemberProfile | null,
    motion: Motion,
}) {
    if (!me?.administrator || motion.closed || motion.enabled) return null
    const non_finished_meetings = await db`SELECT * FROM meetings WHERE finished = false`
    return <ScheduleMotionButton motion={motion} non_finished_meetings={non_finished_meetings} />
}

async function MotionStatus({
    me,
    motion,
    meeting,
}: {
    me: MemberProfile | null,
    motion: Motion,
    meeting: Meeting | null,
}) {
    if (motion.enabled) return <em>Currently Being Voted on</em>;
    if (motion.closed) return <em>Voted on During Meeting {meeting?.name}</em>
    if (meeting) {
        return <>
            <em>Scheduled for Meeting {meeting.name}</em>
            <RescheduleMotionButton me={me} motion={motion} />
        </>
    }

    return <>
        <em>Not scheduled</em>
        <RescheduleMotionButton me={me} motion={motion} />
    </>
}

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (_) { notFound() }
    const me = await GetMe()
    const motion = await GetMotionOrThrow(BigInt(id))
    const member = await GetMember(motion.author) ?? notFound()
    const active = await GetActiveMeeting()
    const meeting = motion.meeting ? await GetMeeting(motion.meeting) : null
    const votes = await db`SELECT * FROM votes WHERE motion = ${motion.id}` as Vote[];
    return (
        <>
            <Stripe>
                #{motion.id}:
                <span className=''> {motion.title}</span>
                <span className='[font-variant:small-caps] text-neutral-300'> [{FormatMotionType(motion.type)}]</span>
                <span>{GetMotionEmoji(motion)}</span>
            </Stripe>
            <div className='flex justify-center mt-8'>
                <Member member={member} />
            </div>

            <div className='flex gap-4 justify-center text-center my-8 m-auto mx-auto'>
                <MotionStatus me={me} motion={motion} meeting={meeting} />
            </div>
            {votes.length !== 0 || motion.enabled || motion.closed ?
                <Votes votes={votes} quorum={motion.quorum}/> : null}
            {motion.closed ? FormatMotionResult(motion) : null}

            <div className='mt-8'><MarkdownText text={motion.text} /></div>
            <MotionButtons
                me={me}
                motion={motion}
                active_meeting={active}
                has_votes={votes.length !== 0}
            />
        </>
    )
}
