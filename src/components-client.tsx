'use client'

import React, {createContext, ReactNode, RefObject, useContext, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import {twMerge} from 'tailwind-merge';

interface ConfirmDialogState {
    confirm(prompt: string): Promise<boolean>
}

export const ConfirmDialogContext = createContext<ConfirmDialogState>({} as any)

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

export function Button({
    className,
    children,
    onClick,
}: {
    className?: string;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={twMerge(`
                text-[1.25rem] bg-neutral-700 px-2
                cursor-pointer hover:bg-neutral-600
                transition-[background] duration-300
            `, className)}
        >{children}</button>
    )
}

/** X Button */
export function XButton({
    enabled,
    onClick,
}: {
    enabled: boolean,
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            disabled={!enabled}
            className={`
                w-8 h-8 p-0 !bg-transparent enabled:cursor-pointer
                ${enabled ? "hover:invert transition-[filter]" : "grayscale"}
            `}
        >❌</button>
    )
}

/** A dialog. */
export function Dialog({
    ref,
    label,
    title,
    buttons,
    children,
}: {
    ref?: RefObject<HTMLDialogElement | null>
    label: ReactNode,
    title: ReactNode,
    children?: ReactNode,
    buttons: {
        label: ReactNode,
        action?: () => any,
    }[]
}) {
    const dialog = ref ?? useRef<HTMLDialogElement>(null)
    return (
        <>
            <Button onClick={() => dialog.current?.showModal()}>
                {label}
            </Button>
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
                            <Button
                                className='bg-neutral-600 hover:bg-neutral-500'
                                onClick={async () => {
                                    if (action) {
                                        const a = action()
                                        if (a instanceof Promise) await a
                                    }
                                    dialog.current?.close()
                                }}
                            >{label}</Button>
                        </div>)}
                    </div>
                </div>
            </dialog>
        </>
    )
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const dialog = useRef<HTMLDialogElement>(null)
    const [prompt, set_prompt] = useState<string>('')
    const resolver = useRef<(v: boolean) => void>(() => {})
    async function Open(msg: string): Promise<boolean> {
        if (!dialog.current) return Promise.resolve(false)
        set_prompt(msg)
        dialog.current.showModal()
        return new Promise<boolean>((resolve) => { resolver.current = resolve })
    }

    return (
        <>
            <Dialog ref={dialog} label='Warning' title='Warning' buttons={[
                { label: 'Yes', action: () => resolver.current?.(true) },
                { label: 'Cancel', action: () => resolver.current?.(false) },
            ]}>
                <div>{prompt}</div>
            </Dialog>
            <ConfirmDialogContext value={{confirm: Open}} >
                {children}
            </ConfirmDialogContext>
        </>
    )
}

export function useConfirm() {
    return useContext(ConfirmDialogContext)
}