import {GetNation} from '@/services';
import {notFound} from 'next/navigation';
import {Stripe} from '@/components';
import {NationEditForm} from '@/app/nations/[id]/edit/client';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    // Get the ŋation.
    const { id } = await params
    const nation = await GetNation(BigInt(id)) ?? notFound();
    return (
        <>
            <Stripe>{nation.name}</Stripe>
            <NationEditForm nation={nation} />
        </>
    )
}