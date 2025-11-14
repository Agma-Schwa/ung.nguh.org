'use client'

import {useRouter} from 'next/navigation';
import {useActionCheckedExt} from '@/components-client';
import {CreateMotion} from '@/services';
import {EditOrCreateMotionData, EditOrCreateMotionForm} from '@/app/motions/client';

export function CreateMotionForm() {
    const router = useRouter()
    const { execute, isPending } = useActionCheckedExt(
        CreateMotion,
        (data: { id: bigint }) => router.push(`/motions/${data.id}`)
    )

    function Create({ type, title, text }: EditOrCreateMotionData) {
        execute({
            type,
            title,
            text,
        })
    }

    return <EditOrCreateMotionForm
        submit={Create}
        returnTo='/motions/new'
        isPending={isPending}
    />
}