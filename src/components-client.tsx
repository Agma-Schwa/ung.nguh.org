'use client'

//
// This file is a hard link to ../../common/components-client.tsx
//

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
    disabled,
    onClick,
    danger,
    hidden,
}: {
    className?: string,
    disabled?: boolean,
    children: ReactNode,
    onClick: () => void,
    danger?: boolean,
    hidden?: boolean,
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={twMerge(`
                text-(size:--text-size)
                height-(--text-size)
                block
                px-2 transition-[background] duration-300 select-none

                enabled:cursor-pointer 
                ${danger ? 'bg-rose-800 hover:bg-rose-700' : 'bg-neutral-700 hover:bg-neutral-600'} 
                ${danger ? 'disabled:bg-rose-400' : 'disabled:bg-neutral-400'}
                ${hidden ? 'hidden' : ''} 
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
    hide_open_button,
}: {
    ref?: RefObject<HTMLDialogElement | null>
    label: ReactNode,
    title: ReactNode,
    children?: ReactNode,
    hide_open_button?: boolean,
    buttons: {
        label: ReactNode,
        disabled?: boolean,
        action?: () => any,
    }[]
}) {
    const local_ref = useRef<HTMLDialogElement>(null)
    const dialog = ref ?? local_ref
    return (
        <>
            <div className={hide_open_button ? 'hidden' : ''}>
                <Button onClick={() => dialog.current?.showModal()}>
                    {label}
                </Button>
            </div>
            <dialog ref={dialog} className={`
                absolute inset-1/2 -translate-1/2
                w-[40ch] max-w-[60ch] min-h-[10rem] text-white
                open:flex flex-col bg-neutral-700
            `}>
                <div className='w-full text-(size:--text-size) text-center bg-neutral-600 select-none'>
                    {title}
                </div>
                <div className='flex flex-col h-full'>
                    <div className='p-2 flex flex-col h-full w-full'>
                        {children}
                    </div>
                    <div className='flex flex-row mt-auto justify-around mb-3'>
                        {buttons.map(({ label, disabled, action }, index) => <div key={index}>
                            <Button
                                className='bg-neutral-600 hover:bg-neutral-500'
                                disabled={disabled}
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

/** Single-line text input control. */
export function TextInput({
    ref,
    onChange,
    onEnter,
    className,
}: {
    ref?: RefObject<HTMLInputElement | null>
    onChange: (value: string) => void,
    onEnter?: () => void,
    className?: string
}) {
    return <input
        ref={ref}
        type='text'
        className={twMerge('border border-neutral-500 bg-neutral-700 px-1', className)}
        onChange={(event) => onChange(event.target.value)}
        onKeyDownCapture={!onEnter ? undefined : (event) => {
            if (event.key === 'Enter') onEnter()
        }}
    />
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
            <Dialog hide_open_button={true} ref={dialog} label='Warning' title='Warning' buttons={[
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