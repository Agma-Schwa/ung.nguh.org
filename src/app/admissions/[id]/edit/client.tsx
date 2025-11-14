'use client'

import AdmissionCreateEditForm, {AdmissionCreateEditFormData} from '@/app/admissions/admission';
import {useActionCheckedExt} from '@/components-client';
import {EditAdmission} from '@/services';
import {useRouter} from 'next/navigation';
import {Admission} from '@/api';

export default function AdmissionEditForm({
    admission,
}: {
    admission: Admission,
}) {
    const router = useRouter()
    const { execute, isPending } = useActionCheckedExt(
        EditAdmission,
        () => router.push(`/admissions/${admission.id}`)
    )

    function Edit(data: AdmissionCreateEditFormData) {
        execute({
            admission_id: admission.id,
            ...data
        })
    }

    return <AdmissionCreateEditForm
        action={Edit}
        isPending={isPending}
        returnTo='/admissions'
        admission={admission}
    />
}