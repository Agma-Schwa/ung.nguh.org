'use client'

import {
    ActionForm,
    Button,
    Dialog,
    FormTextInput,
    Label,
    Select,
    TextArea,
    useActionChecked
} from '@/components-client';
import {Meeting, Motion, MotionType} from '@/api';
import {ScheduleMotion} from '@/services';
import {useState} from 'react';
import {MarkdownText} from '@/app/motions/[id]/client';

function MotionTypeToString(type: MotionType) {
    switch (type) {
        case MotionType.Unsure: return 'Unsure'
        case MotionType.Legislative: return 'Legislative'
        case MotionType.Executive: return 'Executive'
        case MotionType.Constitutional: return 'Constitutional'
    }
}

export type EditOrCreateMotionData = { type: MotionType, title: string, text: string}
export function EditOrCreateMotionForm({
    motion,
    submit,
    returnTo,
    isPending,
}: {
    motion?: Motion,
    submit: (arg: EditOrCreateMotionData) => void,
    returnTo: string,
    isPending?: boolean
}) {
    const [type, setType] = useState<MotionType>(motion?.type ?? MotionType.Unsure)
    const [title, setTitle] = useState<string>(motion?.title ?? '')
    const [text, setText] = useState<string>(motion?.text ?? '')
    const [preview, setPreview] = useState<boolean>(false)
    function Submit() {
        submit({ type, title, text })
    }
    return (
        <>
            <ActionForm
                action={Submit}
                returnTo={returnTo}
                isPending={isPending}
                extra_buttons={<Button onClick={() => setPreview(prev => !prev)}>
                    {preview ? 'Hide' : 'Show'} Preview
                </Button>}
            >
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
                <MarkdownText text={text} />
            </> : null}
        </>
    )
}

export function ScheduleMotionButton({
    motion,
    meetings,
}: {
    motion: Motion,
    meetings: Meeting[],
}) {
    const execute = useActionChecked(ScheduleMotion)
    const [id, setId] = useState<bigint>(0n);

    function Schedule() {
        if (motion.meeting === id) return
        execute({
            motion_id: motion.id,
            meeting_id: id,
        })
    }

    // Yes, we are duplicating this dialog for every open motion, but that’s
    // not that many so I candidly don’t care.
    return <div>
        <Dialog label='🗘' title='Schedule Motion' buttons={[
            {label: 'Ok', action: Schedule},
            {label: 'Cancel'},
        ]}> <Select onChange={v => setId(BigInt(v))}>
                <option value='0'>Clear</option>
                {meetings.map(m => <option key={m.id} value={`${m.id}`}>{m.name}</option>)}
            </Select>
        </Dialog>
    </div>
}