'use client'

//
// This file is a hard link to ../../common/components-client.tsx
//

import React, {createContext, ReactNode, RefObject, useContext, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import {twMerge} from 'tailwind-merge';
import z from 'zod';
import {HookSafeActionFn, useAction} from 'next-safe-action/hooks';
import {useRouter} from 'next/navigation';

interface ConfirmDialogState {
    confirm(prompt: string): Promise<boolean>
}

export const ConfirmDialogContext = createContext<ConfirmDialogState>({} as any)

export function CheckSuccess(data: any, success_message?: string) {
    if (IsSuccess(data) && success_message)
        toast.success(success_message)
}

/** Variant of useActionChecked() that exposes more state */
export function useActionCheckedExt<
    ServerError,
    S extends z.Schema,
    CVE,
    Data,
>(
    action: HookSafeActionFn<ServerError, S, CVE, Data>,
    onSuccess?: (data: Data) => void
) {
    const a = useAction(action, {
        onSuccess: ({ data }) => {
            CheckSuccess(data)
            a.reset()
            onSuccess?.(data)
        },
        onError: (e) => {
            console.error(e)
            toast.error('Invalid form data')
            a.reset()
        }
    })

    return a
}

/** Wrapper around useAction() that actually reports errors to the user. */
export function useActionChecked<
    ServerError,
    S extends z.Schema,
    CVE,
    Data,
>(
    action: HookSafeActionFn<ServerError, S, CVE, Data>,
    onSuccess?: (data: Data) => void
) {
    return useActionCheckedExt(action, onSuccess).execute
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

export function ActionForm({
    action,
    returnTo,
    children,
    extra_buttons,
    isPending
}: {
    action: () => void,
    returnTo: string,
    children: ReactNode,
    extra_buttons?: ReactNode,
    isPending?: boolean
}) {
    const router = useRouter()
    return (
        <div className='flex flex-col'>
            <div className='flex flex-col [&>*]:flex [&>*]:flex-col gap-6'>
                {children}
            </div>
            <div className='flex justify-center gap-6 mt-10'>
                <Button onClick={action} disabled={isPending}>Submit</Button>
                {extra_buttons}
                <Button onClick={() => router.push(returnTo)} disabled={isPending}>Cancel</Button>
            </div>
        </div>
    )
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
                ${enabled ? "hover:invert transition-[filter] duration-300" : "grayscale"}
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
    disabled,
    danger,
}: {
    ref?: RefObject<HTMLDialogElement | null>
    label: ReactNode,
    title?: ReactNode,
    children?: ReactNode,
    hide_open_button?: boolean,
    disabled?: boolean,
    danger?: boolean,
    buttons: {
        label: ReactNode,
        disabled?: boolean,
        className?: string,
        action?: () => any,
    }[]
}) {
    const local_ref = useRef<HTMLDialogElement>(null)
    const dialog = ref ?? local_ref
    return (
        <>
            <div className={hide_open_button ? 'hidden' : ''}>
                <Button onClick={() => dialog.current?.showModal()} disabled={disabled} danger={danger}>
                    {label}
                </Button>
            </div>
            <dialog ref={dialog} className={`
                fixed inset-1/2 -translate-1/2
                w-[40ch] max-w-[60ch] text-white
                open:flex flex-col bg-neutral-700
            `}>
                <div className='w-full text-(size:--text-size) text-center bg-neutral-600 select-none'>
                    {title ?? label}
                </div>
                <div className='flex flex-col h-full'>
                    <div className='p-2 flex flex-col min-h-[5rem] h-full w-full'>
                        {children}
                    </div>
                    <div className='flex justify-self-end flex-row mt-auto justify-around mb-3'>
                        {buttons.map(({ label, disabled, action, className }, index) => <div key={index}>
                            <Button
                                className={twMerge('bg-neutral-600 hover:bg-neutral-500 min-w-[7ch]', className ?? '')}
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

export function FormTextInput({
    label,
    type,
    initialValue,
    setValue,
}: {
    label: string,
    type?: string,
    initialValue: string,
    setValue: (value: string) => void,
}) {
    return <Label label={label}>
        <TextInput type={type} initialValue={initialValue} onChange={setValue} />
    </Label>
}

export function Label({
    label,
    children,
}: {
    label: ReactNode,
    children: ReactNode,
}) {
    return <label>
        <span className='text-xl'>{label}</span>
        {children}
    </label>
}

export function Select({
    className,
    onChange,
    value,
    children,
}: {
    className?: string
    onChange: (e: string) => void,
    value: string,
    children: ReactNode,
}) {
    return <select
        className={twMerge('border border-neutral-500 bg-neutral-700 pl-1', className)}
        onChange={(e) => onChange(e.target.value)}
        value={value}
    >{children}</select>
}

/** Multi-line text input control. */
export function TextArea({
    className,
    initialValue,
    onChange,
}: {
    className?: string,
    initialValue?: string,
    onChange: (e: string) => void,
}) {
    return <textarea
        className={twMerge('border border-neutral-500 bg-neutral-700 px-1', className)}
        defaultValue={initialValue}
        onChange={(e) => onChange(e.target.value)}
    />
}

/** Single-line text input control. */
export function TextInput({
    ref,
    initialValue,
    onChange,
    onEnter,
    className,
    type,
    placeholder,
}: {
    ref?: RefObject<HTMLInputElement | null>
    initialValue?: string
    onChange: (value: string) => void,
    onEnter?: () => void,
    className?: string
    type?: string
    placeholder?: string
}) {
    return <input
        ref={ref}
        type={type ? type : 'text'}
        placeholder={placeholder}
        defaultValue={initialValue}
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