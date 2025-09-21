import type {Metadata} from 'next';
import {Libertinus_Sans} from 'next/font/google';
import './globals.css';

const font = Libertinus_Sans({
    variable: '--font-libertinus-sans',
    weight: '400',
    subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
    title: 'UŊ Hub',
    description: 'Website for managing ongoing affairs of the UŊ',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='en'>
            <body className={`${font.className} antialiased`}>
                <main className='px-20'>
                    {children}
                </main>
            </body>
        </html>
    );
}
