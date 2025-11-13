'use client'

import {Motion, MotionType} from '@/api';
import {ActionForm, Button, FormTextInput, Label, Select, TextArea, useActionChecked} from '@/components-client';
import {EditMotion} from '@/services';
import {useState} from 'react';
import {MotionText} from '@/app/motions/[id]/client';
import {Stripe} from '@/components';
import {useRouter} from 'next/navigation';

function MotionTypeToString(type: MotionType) {
    switch (type) {
        case MotionType.Unsure: return 'Unsure'
        case MotionType.Legislative: return 'Legislative'
        case MotionType.Executive: return 'Executive'
        case MotionType.Constitutional: return 'Constitutional'
    }
}

export function MotionEditForm({
    motion,
}: {
    motion: Motion,
}) {
    const router = useRouter()
    const [type, setType] = useState<MotionType>(motion.type)
    const [title, setTitle] = useState<string>(motion.title)
    const [text, setText] = useState<string>(motion.text)
    const [preview, setPreview] = useState<boolean>(false)
    const execute = useActionChecked(EditMotion, () => router.push(`/motions/${motion.id}`))
    function Edit() {
        execute({
            motion_id: motion.id,
            type,
            title,
            text,
        })
    }

    return (
        <>
            <ActionForm action={Edit} returnTo={`/motions/${motion.id}`} extra_buttons={<Button onClick={() => setPreview(prev => !prev)}>
                {preview ? 'Hide' : 'Show'} Preview
            </Button>}>
                <Label label='Type'>
                    <Select defaultValue={String(type)} onChange={v => setType(BigInt(v) as MotionType)}>
                        {Object.values(MotionType).map(t => <option key={t} value={String(t)}>
                            {MotionTypeToString(t)}
                        </option>)}
                    </Select>
                </Label>
                <FormTextInput label='Title' initialValue={title} setValue={setTitle} />
                <Label label='Text'>
                    <TextArea className='field-sizing-content min-h-[20rem]' initialValue={text} onChange={e => setText(e)} />
                </Label>
            </ActionForm>
            {preview ? <>
                <MotionText text={text} />
            </> : null}
        </>
    )
}