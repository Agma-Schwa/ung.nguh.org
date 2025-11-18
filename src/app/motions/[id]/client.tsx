'use client'

import {Button, Dialog, Select, useActionChecked, useConfirm} from '@/components-client';
import {ClosureReason, MemberProfile, Motion, MotionType} from '@/api';
import {useRouter} from 'next/navigation';
import {
    CloseMotion,
    DeleteMotion,
    EnableOrDisableMotion,
    LockOrUnlockMotion,
    ResetMotion,
    VoteMotion
} from '@/services';
import Markdown from 'react-markdown';
import {VoteDialog} from '@/app/motions/motion';
import {IsVotable} from '@/utils';
import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';

function FormatClosureReason(reason: ClosureReason) {
    switch (reason) {
        case ClosureReason.Passed: return 'Passed'
        case ClosureReason.RejectedByVote: return 'Rejected'
        case ClosureReason.RejectedNotSeconded: return 'Not Seconded'
        case ClosureReason.RejectedAgainstServerRules: return 'Against Server Rules'
        case ClosureReason.RejectedImproper: return 'Improper Procedure/Wording'
        case ClosureReason.RejectedNoConsensusReachedAfter7Days: return 'No Consensus'
    }
}

export function MotionButtons({
    me,
    motion,
    active_meeting,
    has_votes,
}: {
    me: MemberProfile | null,
    motion: Motion,
    active_meeting: bigint,
    has_votes: boolean,
}) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const close_motion = useActionChecked(CloseMotion)
    const delete_motion = useActionChecked(DeleteMotion)
    const enable_or_disable = useActionChecked(EnableOrDisableMotion)
    const lock_or_unlock = useActionChecked(LockOrUnlockMotion)
    const reset_motion = useActionChecked(ResetMotion)
    const vote_motion = useActionChecked(VoteMotion)
    const [reason, setReason] = useState<ClosureReason>(ClosureReason.RejectedByVote)
    const can_edit = me?.administrator || (me?.discord_id === motion.author && !motion.locked)

    async function Close() {
        if (motion.closed && motion.reason === reason) return

        // Only prompt the user if the motion isn’t closed yet.
        if (
            motion.closed ||
            await confirm(`Close this motion with reason '${FormatClosureReason(reason)}'?`)
        ) close_motion({
            motion_id: motion.id,
            reason
        })
    }

    async function Delete() {
        if (await confirm("Delete this motion? THIS CANNOT BE UNDONE!")) {
            delete_motion({motion_id: motion.id})
            router.replace('/motions') // Replace not push since the motion is gone.
        }
    }

    function Edit() {
        router.push(`/motions/${motion.id}/edit`)
    }

    function EnableOrDisable() {
        enable_or_disable({
            enable: !motion.enabled,
            motion_id: motion.id
        })
    }

    async function LockOrUnlock() {
        // Warn regular users that this action is destructive.
        if (
            !me?.administrator &&
            !await confirm("Lock this motion? You won’t be able to edit or delete it anymore.")
        ) return

        lock_or_unlock({
            lock: !motion.locked,
            motion_id: motion.id
        })
    }

    async function Reset() {
        if (await confirm("Reset this motion? This will remove all votes from it."))
            reset_motion({ motion_id: motion.id })
    }

    function Vote(vote: boolean) {
        vote_motion({
            vote,
            motion_id: motion.id
        })
    }

    return (
        <div className='flex mt-8 justify-center gap-10'>
            { motion.enabled ? <VoteDialog is_motion={true} vote={Vote} /> : null }
            { can_edit ? <Button onClick={Edit}>Edit</Button> : null }
            { can_edit ? <Button onClick={LockOrUnlock} danger={!me?.administrator}>
                {motion.locked ? 'Unlock' : 'Lock'}
            </Button> : null }
            { active_meeting === motion.meeting && motion.locked && !motion.closed && me?.administrator ?
                <Button onClick={EnableOrDisable}> {motion.enabled ? 'Disable' : 'Enable'} Voting</Button> : null }
            { me?.administrator ? <Dialog
                label={IsVotable(motion) ? 'Close as Rejected' : 'Adjust Rejection Reason'}
                danger={!motion.closed}
                buttons={[
                    {label: 'Confirm', action: () => Close()},
                    {label: 'Cancel'}
                ]}>
                <Select onChange={v => setReason(BigInt(v) as ClosureReason)} value={String(reason)} className={`
                    ${reason === ClosureReason.Passed ? 'bg-green-800' : 'bg-rose-700'}
                `}> {Object.values(ClosureReason).filter(r => r != ClosureReason.Passed)
                        .map(reason => <option key={reason} value={String(reason)} className='bg-rose-700'>
                            {FormatClosureReason(reason)}
                        </option>)
                    }
                </Select>
            </Dialog> : null }
            { me?.administrator && (has_votes || motion.closed || motion.enabled) ?
                <Button onClick={Reset} danger={true}>Reset</Button> : null}
            { can_edit && !motion.locked ? <Button onClick={Delete} danger={true}>Delete</Button> : null}
        </div>
    )
}

export function MarkdownText({
    text,
}: {
    text: string
}) {
    return <div className='
        [&>ol,ul]:ml-12 [&>ol,ul]:my-4
        [&_h1,h2,h3,h4,h5]:mt-8 [&_h3]:mt-6 [&_h3]:mb-2 [&_h4]:mt-6 [&_h4]:mb-2
        [&_p+p]:mt-4
    '><Markdown>{text}</Markdown></div>
}