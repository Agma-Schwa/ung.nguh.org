'use client'

import {Admission, MemberProfile} from '@/api';
import {Button, useActionChecked, useConfirm} from '@/components-client';
import {useRouter} from 'next/navigation';
import {VoteDialog} from '@/app/motions/motion';
import {DeleteAdmission, PassAdmission, VoteAdmission} from '@/services';

export function AdmissionControls({
    admission,
    me,
}: {
    admission: Admission,
    me: MemberProfile | null
}) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const delete_admission = useActionChecked(DeleteAdmission)
    const pass_admission = useActionChecked(PassAdmission)
    const vote_admission = useActionChecked(VoteAdmission)
    const can_edit = me?.administrator || (!admission.closed && admission.discord_id === me?.discord_id)
    const can_vote = !admission.closed && me?.represented_nation && me.discord_id !== admission.discord_id

    async function Delete() {
        if (await confirm("Are you sure you want to delete this admission?")) {
            delete_admission({admission_id: admission.id})
            router.replace('/admissions')
        }
    }

    function Edit() {
        router.push(`/admissions/${admission.id}/edit`);
    }

    async function Pass() {
        if (await confirm("Forcefully pass this admission?"))
            pass_admission({ admission_id: admission.id })
    }

    function Vote(vote: boolean) {
        vote_admission({
            admission_id: admission.id,
            vote
        })
    }

    return <div className='flex gap-8 mt-6 justify-center'>
        {can_vote ? <VoteDialog is_motion={false} vote={Vote} /> : null}
        {can_edit ? <Button onClick={Edit}>Edit</Button> : null}
        {me?.administrator && !admission.passed ? <Button onClick={Pass} className='bg-green-800 hover:bg-green-700'>Pass Admission</Button> : null}
        {can_edit && !admission.closed ? <Button onClick={Delete} danger={true}>Delete Admission</Button> : null}
    </div>
}