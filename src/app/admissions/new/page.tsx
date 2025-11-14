import {Stripe} from '@/components';
import AdmissionForm from '@/app/admissions/new/client';
import {auth} from '@/auth';

export default async function() {
    const session = await auth()
    return (
        <>
            <Stripe>Create a Ŋation</Stripe>
            { session?.discord_id ? <AdmissionForm /> : <p>You must be logged in to create a ŋation</p> }
        </>
    )
}