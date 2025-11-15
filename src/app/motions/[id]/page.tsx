import {Member, Stripe, Votes} from '@/components';
import {db, GetActiveMeeting, GetMe, GetMeeting, GetMember, GetMotionOrThrow} from '@/services';
import {notFound} from 'next/navigation';
import {GetMotionEmoji} from '@/app/motions/motion';
import {Motion, MotionType, Vote} from '@/api';
import {MarkdownText, MotionButtons} from '@/app/motions/[id]/client';
import {FormatMotionType} from '@/utils';

function FormatMotionStatus(motion: Motion) {
    if (!motion.passed)
        return <p className='mt-4 text-rose-400'><strong>REJECTED</strong></p>
    if (motion.type != MotionType.Constitutional)
        return <p className='mt-4 text-emerald-400'><strong>PASSED</strong></p>
    if (motion.supported)
        return <p className='mt-4 text-emerald-400'><strong>SUPPORTED</strong></p>
    return <p className='mt-4 text-amber-200'><strong>PASSED ON CONDITION OF SUPPORT</strong></p>
}

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (e) { notFound() }
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

            <div className='text-center my-8 italic m-auto mx-auto'> {
                  motion.enabled                      ? `Currently Being Voted on`
                : votes.length !== 0 && motion.closed ? `Voted on During Meeting ${meeting?.name}`
                : meeting                             ? `Scheduled for Meeting ${meeting.name}`
                                                      : null
            } </div>
            {votes.length !== 0 || motion.enabled || motion.closed ?
                <Votes votes={votes} quorum={motion.quorum}/> : null}
            {motion.closed ? FormatMotionStatus(motion) : null}

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
