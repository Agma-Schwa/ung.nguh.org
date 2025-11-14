import {notFound, redirect} from 'next/navigation';
import {MeetingInfo} from '@/app/meetings/server';
import {GetActiveMeeting, GetMeetingOrThrow} from '@/services';
import {Stripe} from '@/components';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (e) { notFound() }
    const meeting = await GetMeetingOrThrow(BigInt(id))
    const active = await GetActiveMeeting()
    if (meeting.id === active) redirect('/')
    return (
        <>
            <Stripe>Meeting {meeting.name}</Stripe>
            <MeetingInfo meeting={meeting} />
        </>
    )
}