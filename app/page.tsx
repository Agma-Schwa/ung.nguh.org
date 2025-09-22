import {Stripe} from '@/app/components';
import {auth, signIn} from '@/auth';

export default async function CurrentMeeting() {
    const session = await auth()
    return (
        <>
            <Stripe>Current Meeting</Stripe>
        </>
    );
}
