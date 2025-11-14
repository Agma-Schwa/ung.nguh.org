import {CanEditNation, GetMe, GetNation} from '@/services';
import {notFound, redirect} from 'next/navigation';
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

    // Check if this user can edit the ŋation; if not, redirect to
    // the regular ŋation page.
    const me = await GetMe()
    if (!me || !await CanEditNation(me, nation))
        redirect(`/nations/${nation.id}`)

    return (
        <>
            <Stripe>{nation.name}</Stripe>
            <NationEditForm nation={nation} />
        </>
    )
}