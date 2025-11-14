'use client'

import AdmissionCreateEditForm from '@/app/admissions/admission';
import {useActionCheckedExt} from '@/components-client';
import {CreateAdmission} from '@/services';
import {useRouter} from 'next/navigation';

export default function AdmissionForm() {
    const router = useRouter()
    const { execute, isPending } = useActionCheckedExt(
        CreateAdmission,
        (data: { id: bigint }) => router.push(`/admissions/${data.id}`)
    )

    return <AdmissionCreateEditForm
        action={execute}
        isPending={isPending}
        returnTo='/admissions'
    />
}