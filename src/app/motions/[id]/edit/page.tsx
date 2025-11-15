import {notFound, redirect} from 'next/navigation';
import {GetMe, GetMotionOrThrow} from '@/services';
import {Stripe} from '@/components';
import {CanEditMotion} from '@/utils';
import {MotionEditForm} from '@/app/motions/[id]/edit/client';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (_) { notFound() }
    const me = await GetMe()
    const motion = await GetMotionOrThrow(BigInt(id))

    if (!me || !CanEditMotion(me, motion))
        redirect(`/motions/${motion.id}`)

    return (
        <>
            <Stripe>Motion #{motion.id}</Stripe>
            <MotionEditForm motion={motion} />
        </>
    )
}