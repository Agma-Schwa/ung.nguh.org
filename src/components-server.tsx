import {ReactNode} from 'react';
import {twMerge} from 'tailwind-merge';

export function SidebarSection({ title, children }: { title: string, children: ReactNode }) {
    return (
        <div className='pl-4'>
            <h3 className='mb-1 select-none'>{title}</h3>
            <div className='flex flex-col ml-4'>
                {children}
            </div>
        </div>
    )
}

export function Sidebar({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className='
            fixed left-0 top-0 h-full w-(--sidebar-width)
            bg-neutral-800
            border-r border-r-neutral-700
            gap-4 flex flex-col
            [&_a]:hover:underline
        '>
            {children}
        </div>
    )
}
