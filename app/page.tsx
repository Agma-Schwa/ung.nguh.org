import {ReactNode} from 'react';
import Link from 'next/link';
import {Stripe} from '@/app/components';

export default function MainPage() {
    function Column({ title, children }: { title: string, children: ReactNode }) {
        return (
            <div>
                <h3 className='mb-2'>{title}</h3>
                <div className='flex flex-col'>
                    {children}
                </div>
            </div>
        )
    }

    return (
        <>
            <Stripe>Main Page</Stripe>
            <section className='flex flex-row gap-10 justify-center'>
                <Column title='Meetings'>
                    <Link href='/meeting'>Next Meeting</Link>
                    <Link href='/meetings'>Past Meetings</Link>
                </Column>
                <Column title='Actions'>
                    <Link href='/motion'>Create a Motion</Link>
                    <Link href='/admission'>Create a Ŋation</Link>
                </Column>
                <Column title='Lists'>
                    <Link href='/members'>Members</Link>
                    <Link href='/nations'>Ŋations</Link>
                    <Link href='/motions'>Motions</Link>
                    <Link href='/admissions'>Admissions</Link>
                </Column>
            </section>
        </>
    );
}
