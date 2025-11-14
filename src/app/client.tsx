'use client'

import {Button, Select, TextInput, useActionChecked} from '@/components-client';
import {Meeting, NO_ACTIVE_MEETING} from '@/api';
import {useState} from 'react';
import {CreateMeeting, SetActiveMeeting} from '@/services';

export function NoActiveMeetingControls({
    meetings,
}: {
    meetings: Meeting[]
}) {
    const [active, setActive] = useState<bigint>(meetings[0].id)
    const [meetingName, setMeetingName] = useState('')
    const set_active_meeting = useActionChecked(SetActiveMeeting)
    const create_meeting = useActionChecked(CreateMeeting)
    function SetActive() {
        if (active === null) return
        set_active_meeting({ meeting_id: active })
    }

    function Create() {
        create_meeting({ name: meetingName })
    }

    return (
        <div className='grid grid-cols-[auto_auto] w-fit gap-6'>
            <Button onClick={SetActive}>Set Active Meeting</Button>
            <Select onChange={e => setActive(BigInt(e))} className='min-w-60'>
                {meetings.map(m => <option value={String(m.id)} key={m.id}>
                    Meeting {m.name}
                </option>)}
            </Select>
            <Button onClick={Create} disabled={meetingName.trim().length === 0}>Create Meeting</Button>
            <TextInput onChange={setMeetingName} initialValue={meetingName} />
        </div>
    )
}

export function ActiveMeetingControls() {
    const set_active_meeting = useActionChecked(SetActiveMeeting)
    function EndMeeting() {
        set_active_meeting({ meeting_id: NO_ACTIVE_MEETING })
    }

    return (
        <div className='flex gap-6 justify-center mb-6'>
            <Button onClick={EndMeeting}>End Meeting</Button>
        </div>
    )
}