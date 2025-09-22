'use client'

import {ReactNode, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import toast from 'react-hot-toast';

export function CheckSuccess(data: any, success_message?: string) {
    if (IsSuccess(data) && success_message)
        toast.success(success_message)
}

export function IsSuccess(data: any): boolean {
    if (
        data &&
        typeof data === 'object' &&
        'status' in data &&
        'message' in data &&
        Number(data.status) >= 400
    ) {
        toast.error(String(data.message))
        return false
    }

    return true
}

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
