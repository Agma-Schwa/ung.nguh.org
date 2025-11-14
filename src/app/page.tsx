import {Stripe} from '@/components';
import {db, GetActiveMeeting, GetMe} from '@/services';
import {ActiveMeetingControls, NoActiveMeetingControls} from '@/app/client';
import {MeetingInfo} from '@/app/meetings/server';
import {Meeting, NO_ACTIVE_MEETING} from '@/api';

export default async function CurrentMeeting() {
    const me = await GetMe()
    const active = await GetActiveMeeting()
    const meetings = await db`SELECT * FROM meetings ORDER BY ROWID DESC` as Meeting[]
    if (active === NO_ACTIVE_MEETING) {
        if (!me?.administrator) return (
            <>
                <Stripe>Current Meeting</Stripe>
                <p>No meeting is currently active; please wait until an administrator creates a new meeting.</p>
            </>
        )

        return (
            <>
                <Stripe>Current Meeting</Stripe>
                <p className='mb-4'>No meeting is currently active.</p>
                <NoActiveMeetingControls meetings={meetings} />
            </>
        )
    }

    const meeting = meetings.find(m => m.id === active)!
    return (
        <>
            <Stripe>Current Meeting</Stripe>
            { me?.administrator ? <ActiveMeetingControls/> : null }
            <MeetingInfo meeting={meeting} />
        </>
    )
}
