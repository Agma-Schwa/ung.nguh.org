'use client'

import {Button, Dialog, useActionChecked, useConfirm} from '@/components-client';
import {MemberProfile, Motion} from '@/api';
import {useRouter} from 'next/navigation';
import {
    CloseMotionAsRejected,
    DeleteMotion,
    EnableOrDisableMotion,
    LockOrUnlockMotion,
    ResetMotion,
    VoteMotion
} from '@/services';
import Markdown from 'react-markdown';

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
    const close_motion_as_rejected = useActionChecked(CloseMotionAsRejected)
    const delete_motion = useActionChecked(DeleteMotion)
    const enable_or_disable = useActionChecked(EnableOrDisableMotion)
    const lock_or_unlock = useActionChecked(LockOrUnlockMotion)
    const reset_motion = useActionChecked(ResetMotion)
    const vote_motion = useActionChecked(VoteMotion)
    const can_edit = me?.administrator || (me?.discord_id === motion.author && !motion.locked)

    async function CloseAsRejected() {
        if (await confirm("Close this motion as rejected?"))
            close_motion_as_rejected({ motion_id: motion.id })
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
            { motion.enabled ? <Dialog
                label={'Vote'}
                title={'Vote'} buttons={[
                    {label: 'Aye', className: 'bg-green-800 hover:bg-green-700', action: () => Vote(true)},
                    {label: 'Cancel'},
                    {label: 'No', className: 'bg-rose-800 hover:bg-rose-700', action: () => Vote(false)},
                ]}
            >   <p>Vote in support of this motion?</p>
                <p>You can still change your vote later for as long as the motion remains open.</p>
            </Dialog> : null }
            { can_edit ? <Button onClick={Edit}>Edit</Button> : null }
            { can_edit ? <Button onClick={LockOrUnlock}>{motion.locked ? 'Unlock' : 'Lock'}</Button> : null }
            { active_meeting === motion.meeting && me?.administrator ? <Button onClick={EnableOrDisable}>
                {motion.enabled ? 'Disable' : 'Enable'} Voting</Button> : null }
            { me?.administrator && (has_votes || motion.closed) ?
                <Button onClick={Reset} danger={true}>Reset</Button> : null}
            { me?.administrator && !motion.closed ? <Button onClick={CloseAsRejected} danger={true}>
                Close as Rejected</Button> : null }
            { can_edit ? <Button onClick={Delete} danger={true}>Delete</Button> : null}
        </div>
    )
}

export function MotionText({
    text,
}: {
    text: string
}) {
    return <div className='
        mt-8
        [&>ol,ul]:ml-12 [&>ol,ul]:my-4
        [&_h1,h2,h3,h4,h5]:mt-8 [&_h3]:mt-6 [&_h3]:mb-2 [&_h4]:mt-6 [&_h4]:mb-2
        [&_p+p]:mt-4
    '><Markdown>{text}</Markdown></div>
}