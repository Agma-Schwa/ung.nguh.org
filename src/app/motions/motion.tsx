import {Meeting, MemberProfile, Motion, MotionType} from '@/api';
import {Member} from '@/components';
import Link from 'next/link';
import {Fragment} from 'react';
import {ScheduleMotionButton} from '@/app/motions/client';

export function FormatMotionType(motion: Motion) {
    switch (motion.type) {
        case MotionType.Constitutional: return 'cons'
        case MotionType.Executive: return 'exec'
        case MotionType.Legislative: return 'leg'
        case MotionType.Unsure: return 'unsure'
        default: return 'invalid'
    }
}

export function GetMotionEmoji(m: Motion) {
    if (m.supported || (m.passed && m.type !== MotionType.Constitutional)) return ' ✅'
    if (m.passed) return ' ⌛'
    if (m.closed) return ' ❌'
    if (m.locked) return ' 🔒'
    return ''
}

export async function MotionList({
    motions,
    members,
    meetings,
    interactive,
}: {
    motions: Motion[],
    members: MemberProfile[],
    meetings: Meeting[],
    interactive?: boolean,
}) {
    return (
        <div className='grid grid-cols-[auto_1fr_auto] gap-4 leading-8'>
            {motions.map((motion) => {
                const member = members.find(m => m.discord_id === motion.author)!
                const meeting = meetings.find(m => m.id === motion.meeting)
                const type = FormatMotionType(motion)
                return <Fragment key={motion.id}>
                    <div><Member member={member}/></div>
                    <div><Link href={`/motions/${motion.id}`}>
                        <span className={`${motion.closed ? 'line-through text-neutral-500' : ''}`}>{motion.title}</span>
                        <span className='[font-variant:small-caps] text-neutral-300'> [{type}]</span>
                        <span>{GetMotionEmoji(motion)}</span>
                    </Link></div>
                    <div className='flex gap-2 justify-end'>
                        <span> {
                              motion.closed ? 'Closed'
                            : meeting       ? `Sched. f. ${meeting.name}`
                                            : 'Not Scheduled'
                        } </span>
                        {interactive ? <ScheduleMotionButton motion={motion} meetings={meetings} /> : null}
                    </div>
                </Fragment>
            })}
        </div>
    )
}
