import {Meeting, MemberProfile, Motion, MotionType, Vote} from '@/api';
import {Member} from '@/components';
import Link from 'next/link';
import {Fragment} from 'react';
import {ScheduleMotionButton} from '@/app/motions/client';
import {Dialog} from '@/components-client';

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
    hide_status,
}: {
    motions: Motion[],
    members: MemberProfile[],
    meetings: Meeting[],
    interactive?: boolean,
    hide_status?: boolean,
}) {
    return (
        <div className={`grid ${hide_status ? 'grid-cols-[auto_1fr]' : 'grid-cols-[auto_1fr_auto]'} gap-4 leading-8`}>
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
                    {!hide_status ? <div className='flex gap-2 justify-end'>
                        <span> {
                              motion.closed ? 'Closed'
                            : meeting       ? `Sched. f. ${meeting.name}`
                                            : 'Not Scheduled'
                        } </span>
                        {interactive ? <ScheduleMotionButton motion={motion} meetings={meetings} /> : null}
                    </div> : null }
                </Fragment>
            })}
        </div>
    )
}

export function VoteDialog({
    is_motion,
    vote,
}: {
    is_motion: boolean,
    vote: (vote: boolean) => void
}) {
    return <Dialog
        label={'Vote'}
        title={'Vote'} buttons={[
            {label: 'Aye', className: 'bg-green-800 hover:bg-green-700', action: () => vote(true)},
            {label: 'Cancel'},
            {label: 'No', className: 'bg-rose-800 hover:bg-rose-700', action: () => vote(false)},
        ]}
    >   <p>Vote in support of this {is_motion ? 'motion' : 'admission'}?</p>
        <p>You can still change your vote later for as long as the {is_motion ? 'motion' : 'admission'} remains open.</p>
    </Dialog>
}