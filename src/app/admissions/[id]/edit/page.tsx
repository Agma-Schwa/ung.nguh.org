import {notFound, redirect} from 'next/navigation';
import {CheckCanEditAdmission, GetAdmissionOrThrow} from '@/services';
import {Stripe} from '@/components';
import AdmissionEditForm from '@/app/admissions/[id]/edit/client';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (_) { notFound() }
    const admission = await GetAdmissionOrThrow(BigInt(id))
    try { await CheckCanEditAdmission(admission); } catch (_) { redirect(`/admissions/${admission.id}`) }
    return (
        <>
            <Stripe>Admission #{admission.id}</Stripe>
            <AdmissionEditForm admission={admission} />
        </>
    )
}