'use client'

import {Button, Select, TextInput, useActionChecked, useConfirm} from '@/components-client';
import {Meeting, MemberProfile, NO_ACTIVE_MEETING} from '@/api';
import {useEffect, useState} from 'react';
import {
    ClearParticipants,
    CreateMeeting,
    EnableOrDisableMeetingParticipation,
    FinishMeeting,
    JoinOrLeaveMeeting,
    SetActiveMeeting
} from '@/services';

export function NoActiveMeetingControls({
    meetings,
}: {
    meetings: Meeting[]
}) {
    const [active, setActive] = useState<bigint>()
    const [meetingName, setMeetingName] = useState('')
    const set_active_meeting = useActionChecked(SetActiveMeeting)
    const create_meeting = useActionChecked(CreateMeeting)
    useEffect(() => setActive(meetings[0]?.id), [meetings])
    function SetActive() {
        if (active === undefined) return
        set_active_meeting({ meeting_id: active })
    }

    function Create() {
        create_meeting({ name: meetingName })
    }

    return (
        <div className='grid grid-cols-[auto_auto] w-fit gap-6'>
            { meetings.length !== 0 ? <>
                <Button onClick={SetActive}>Set Active Meeting</Button>
                <Select onChange={e => setActive(BigInt(e))} value={String(active) ?? meetings[0].id} className='min-w-60'>
                    { meetings.map(m => <option value={String(m.id)} key={m.id}>
                        Meeting {m.name}
                    </option>) }
                </Select>
            </> : null }
            <Button onClick={Create} disabled={meetingName.trim().length === 0}>Create Meeting</Button>
            <TextInput onChange={setMeetingName} initialValue={meetingName} placeholder={'e.g. #25'} />
        </div>
    )
}

export function ActiveMeetingControls({
    me,
    meeting,
    enable_participation,
    participating,
}: {
    me: MemberProfile | null,
    meeting: Meeting,
    enable_participation: boolean,
    participating: boolean,
}) {
    const { confirm } = useConfirm()
    const set_active_meeting = useActionChecked(SetActiveMeeting)
    const enable_or_disable_participation = useActionChecked(EnableOrDisableMeetingParticipation)
    const join_or_leave = useActionChecked(JoinOrLeaveMeeting)
    const clear_participants = useActionChecked(ClearParticipants)
    const finish_meeting = useActionChecked(FinishMeeting)
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

    async function Finish() {
        if (await confirm('Conclude meeting and adjust quorums for all enabled motions? THIS CANNOT BE UNDONE!'))
            finish_meeting({})
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
                {me.administrator && !meeting.finished ? <Button onClick={Finish} danger={true}>Conclude Meeting</Button> : null }
                {me.administrator ? <Button onClick={Clear} danger={true}>Reset Participants</Button> : null }
            </div> }
        </>
    )
}