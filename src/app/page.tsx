import {Nation, Stripe} from '@/components';
import {db, GetActiveMeeting, GetAllNations, GetMe, GetMeeting, GetParticipationEnabled} from '@/services';
import {ActiveMeetingControls, NoActiveMeetingControls} from '@/app/client';
import {MeetingInfo} from '@/app/meetings/server';
import {Meeting, NO_ACTIVE_MEETING} from '@/api';
import {notFound} from 'next/navigation';

export default async function CurrentMeeting() {
    const me = await GetMe()
    const active = await GetActiveMeeting()
    if (active === NO_ACTIVE_MEETING) {
        if (!me?.administrator) return (
            <>
                <Stripe>Current Meeting</Stripe>
                <p>No meeting is currently active; please wait until an administrator creates a new meeting.</p>
            </>
        )

        const not_finished = await db`
            SELECT * FROM meetings
            WHERE finished = FALSE
            ORDER BY ROWID DESC
        ` as Meeting[]

        return (
            <>
                <Stripe>Current Meeting</Stripe>
                <p className='mb-4'>No meeting is currently active.</p>
                <NoActiveMeetingControls meetings={not_finished} />
            </>
        )
    }

    const meeting = await GetMeeting(active) ?? notFound()
    const nations = await GetAllNations()
    const participants = await db`SELECT nation FROM meeting_participants` as { nation: bigint }[]
    const enable_participation = await GetParticipationEnabled()
    return (
        <>
            <Stripe>Agenda</Stripe>
            <MeetingInfo meeting={meeting} />

            { enable_participation || me?.administrator ? <h2 className='mt-10 mb-6 text-center'>Participants</h2> : null }
            <ActiveMeetingControls
                me={me}
                meeting={meeting}
                enable_participation={!!enable_participation}
                participating={!!participants.find(p => p.nation === me?.represented_nation)}
            />

            <div className='flex flex-col gap-4'>
                {participants.map(p => <Nation key={p.nation} nation={nations.find(n => n.id === p.nation)!} />)}
            </div>
        </>
    )
}
