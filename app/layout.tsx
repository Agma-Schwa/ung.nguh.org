import type {Metadata} from 'next';
import {Libertinus_Sans} from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import React, {ReactNode} from 'react';
import {auth, signIn} from '@/auth';
import {GetOwnDiscordProfile} from '@/app/services';
import Image from 'next/image';
import {Member} from '@/app/components';

const font = Libertinus_Sans({
    variable: '--font-libertinus-sans',
    preload: true,
    fallback: ['sans-serif'],
    weight: '400',
    subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
    title: 'UŊ Hub',
    description: 'Website for managing ongoing affairs of the UŊ',
};

async function SignIn() {
    'use server'
    await signIn('discord')
}

async function Sidebar() {
    function Section({ title, children }: { title: string, children: ReactNode }) {
        return (
            <div className='pl-4'>
                <h3 className='mb-1 select-none'>{title}</h3>
                <div className='flex flex-col ml-4'>
                    {children}
                </div>
            </div>
        )
    }

    const session = await auth()
    const profile = await GetOwnDiscordProfile(session)
    return (
        <div className='
            fixed left-0 top-0 h-full w-(--sidebar-width)
            bg-neutral-800
            border-r border-r-neutral-700
            gap-4 flex flex-col
        '>
            <Section title='Meetings'>
                <Link href='/'>Current Meeting</Link>
                <Link href='/meetings'>Past Meetings</Link>
            </Section>
            <Section title='Actions'>
                <Link href='/motion'>Create a Motion</Link>
                <Link href='/admission'>Create a Ŋation</Link>
            </Section>
            <Section title='Lists'>
                <Link href='/members'>Members</Link>
                <Link href='/nations'>Ŋations</Link>
                <Link href='/motions'>Motions</Link>
                <Link href='/admissions'>Admissions</Link>
            </Section>
            <div className='mt-auto border-t border-t-neutral-600 w-full flex'>
                <div className='w-full h-14 flex bg-neutral-700'>
                    {profile
                        ? <div className='m-auto'>
                            <Member member={profile}></Member>
                        </div>
                        : <form
                                className='w-full'
                                action={SignIn}
                            >   <button
                                    type='submit'
                                    className='
                                        mx-auto w-full block pt-4 pb-4 bg-neutral-700
                                        text-[1.5rem] leading-[1.5rem]
                                        hover:cursor-pointer hover:bg-neutral-600
                                        transition-[background] duration-300
                                    '
                                >   Sign In
                                </button>
                        </form>
                    }
                </div>
            </div>
        </div>
    )
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='en'>
            <body className={`${font.className} antialiased`}>
                <Sidebar />
                <main className='px-20 ml-(--sidebar-width)'>
                    {children}
                </main>
            </body>
        </html>
    );
}
