import {notFound, redirect} from 'next/navigation';
import {auth} from '@/auth';
import {GetMotionOrThrow, Me} from '@/services';
import {Stripe} from '@/components';
import {CanEditMotion} from '@/utils';
import {MotionEditForm} from '@/app/motions/[id]/edit/client';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (e) { notFound() }
    const session = await auth()
    const me = await Me(session)
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