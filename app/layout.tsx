import type {Metadata} from 'next';
import {Libertinus_Sans} from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import {ReactNode} from 'react';

const font = Libertinus_Sans({
    variable: '--font-libertinus-sans',
    weight: '400',
    subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
    title: 'UŊ Hub',
    description: 'Website for managing ongoing affairs of the UŊ',
};

function Sidebar() {
    function Section({ title, children }: { title: string, children: ReactNode }) {
        return (
            <div>
                <h3 className='mb-1'>{title}</h3>
                <div className='flex flex-col'>
                    {children}
                </div>
            </div>
        )
    }

    return (
        <div className='fixed left-0 top-0 h-full w-(--sidebar-width) pl-4 border-r border-r-gray-500 gap-4 flex flex-col'>
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
