'use client'

import {Button, Select, TextInput, useActionChecked, useConfirm} from '@/components-client';
import {Meeting, MemberProfile, NO_ACTIVE_MEETING} from '@/api';
import {useState} from 'react';
import {
    ClearParticipants,
    CreateMeeting,
    EnableOrDisableMeetingParticipation,
    JoinOrLeaveMeeting,
    SetActiveMeeting
} from '@/services';

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

export function ActiveMeetingControls({
    me,
    enable_participation,
    participating,
}: {
    me: MemberProfile | null,
    enable_participation: boolean,
    participating: boolean,
}) {
    const { confirm } = useConfirm()
    const set_active_meeting = useActionChecked(SetActiveMeeting)
    const enable_or_disable_participation = useActionChecked(EnableOrDisableMeetingParticipation)
    const join_or_leave = useActionChecked(JoinOrLeaveMeeting)
    const clear_participants = useActionChecked(ClearParticipants)
    function SetInactive() {
        set_active_meeting({ meeting_id: NO_ACTIVE_MEETING })
    }

    function EnableOrDisableParticipation() {
        enable_or_disable_participation({ enable: !enable_participation })
    }

    function JoinOrLeave() {
        join_or_leave({ join: !participating })
    }

    async function Clear() {
        if (await confirm('Remove ALL meeting participants?'))
            clear_participants({})
    }

    return (
        <>
            { me && <div className='flex gap-6 justify-center mb-6'>
                { me.administrator ? <Button onClick={SetInactive}>Clear Active Meeting</Button> : null }
                { me.administrator ? <Button onClick={EnableOrDisableParticipation}>
                    {enable_participation ? 'Disable' : 'Enable'} Participation
                </Button> : null }
                { enable_participation && me.represented_nation ? <Button onClick={JoinOrLeave}>
                    {participating ? 'Leave' : 'Join'} Meeting
                </Button> : null }
                {me.administrator ? <Button onClick={Clear} danger={true}>Reset Participants</Button> : null }
            </div> }
        </>
    )
}