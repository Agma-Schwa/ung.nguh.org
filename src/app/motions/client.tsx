'use client'

import {Dialog, Select, useActionChecked} from '@/components-client';
import {Meeting, Motion} from '@/api';
import {ScheduleMotion} from '@/services';
import {useState} from 'react';

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