import {Stripe} from '@/components';
import {GetLoggedInMemberOrThrow} from '@/services';
import {CreateMotionForm} from '@/app/motions/new/client';

export default async function() {
    await GetLoggedInMemberOrThrow()
    return (
        <>
            <Stripe>Submit a Motion</Stripe>
            <CreateMotionForm />
        </>
    )
}