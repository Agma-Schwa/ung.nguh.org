'use client'

import {ReactNode, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';

/** A dialog. */
export function Dialog({
    label,
    title,
    buttons,
    children,
}: {
    label: ReactNode,
    title: ReactNode,
    children?: ReactNode,
    buttons: {
        label: ReactNode,
        action?: () => any,
    }[]
}) {
    const dialog = useRef<HTMLDialogElement>(null)
    return (
        <>
            <button
                onClick={() => dialog.current?.showModal()}
                className='
                    my-4 text-[1.25rem] bg-neutral-700 px-2
                    cursor-pointer hover:bg-neutral-600
                    transition-[background] duration-300
                '
            >{label}</button>
            <dialog ref={dialog} className={`
                absolute inset-1/2 -translate-1/2
                w-[40ch] max-w-[60ch] h-[10rem] text-white
                open:flex flex-col bg-neutral-700
            `}>
                <div className='w-full text-[1.25rem] text-center bg-neutral-600'>
                    {title}
                </div>
                <div className='flex flex-col h-full'>
                    <div className='p-2 flex flex-col h-full w-full'>
                        {children}
                    </div>
                    <div className='flex flex-row mt-auto justify-around mb-3'>
                        {buttons.map(({ label, action }, index) => <div key={index}>
                            <button
                                onClick={async () => {
                                    if (action) {
                                        const a = action()
                                        if (a instanceof Promise) await a
                                    }
                                    dialog.current?.close()
                                }}
                                className='
                                    bg-neutral-600 px-2 py-1 w-20
                                    cursor-pointer hover:bg-neutral-500
                                    transition-[background] duration-300
                                '
                            >{label}</button>
                        </div>)}
                    </div>
                </div>
            </dialog>
        </>
    )
}

export function Mount(fragment: ReactNode, parent: HTMLElement = document.body): HTMLElement {
    const root = document.createElement('div');
    parent.appendChild(root);
    createRoot(root).render(fragment)
    return root;
}

export function ShowError(text: string) {
    function Dialog() {
        const ref = useRef<HTMLDialogElement>(null);
        useEffect(() => void ref.current!!.showModal());
        return (
            <dialog ref={ref} onClose={() => root.remove()} className='
                [--min-h:10rem] [--header-h:3rem] [--pad:.5rem]
                absolute inset-1/2 -translate-1/2
                min-h-(--min-h) max-h-[40rem] min-w-[30rem] max-w-[60rem]
                bg-neutral-700 text-white text-[1.5rem]
                backdrop:bg-black backdrop:opacity-60
            '>
                <div className='bg-rose-800 text-center h-(--header-h) leading-(--header-h)'>
                    Error
                </div>
                <div className='flex flex-col text-[1.25rem] p-(--pad) min-h-[calc(var(--min-h)-var(--header-h))]'>
                    <div className='grow'>
                        {text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                    <button onClick={() => root.remove()} className='mx-auto bg-rose-800 px-(--pad) w-20 cursor-pointer'>
                        Ok
                    </button>
                </div>
            </dialog>
        );
    }

    var root = Mount(<Dialog />);
}