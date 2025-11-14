'use client'

import {Motion} from '@/api';
import {useActionCheckedExt} from '@/components-client';
import {EditMotion} from '@/services';
import {useRouter} from 'next/navigation';
import {EditOrCreateMotionData, EditOrCreateMotionForm} from '@/app/motions/client';

export function MotionEditForm({
    motion,
}: {
    motion: Motion,
}) {
    const router = useRouter()
    const { execute, isPending } = useActionCheckedExt(EditMotion, () => router.push(`/motions/${motion.id}`))
    function Edit({ type, title, text }: EditOrCreateMotionData) {
        execute({
            motion_id: motion.id,
            type,
            title,
            text,
        })
    }

    return <EditOrCreateMotionForm
        motion={motion}
        submit={Edit}
        returnTo={`/motions/${motion.id}`}
        isPending={isPending}
    />
}