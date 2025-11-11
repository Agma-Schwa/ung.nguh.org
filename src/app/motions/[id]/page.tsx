import {Member, Nation, Stripe} from '@/components';
import {db, GetAllMembers, GetAllNations, GetMeeting, GetMeetingOrThrow, GetMember, GetMotionOrThrow} from '@/services';
import {notFound} from 'next/navigation';
import {FormatMotionType, GetMotionEmoji} from '@/app/motions/motion';
import {Motion, MotionType, Vote} from '@/api';
import {Fragment} from 'react';
import Markdown from 'react-markdown';

function FormatMotionStatus(motion: Motion) {
    if (!motion.passed)
        return <p className='mt-4 text-rose-400'><strong>REJECTED</strong></p>
    if (motion.type != MotionType.Constitutional)
        return <p className='mt-4 text-emerald-400'><strong>PASSED</strong></p>
    if (motion.supported)
        return <p className='mt-4 text-emerald-400'><strong>SUPPORTED</strong></p>
    return <p className='mt-4 text-amber-200'><strong>PASSED ON CONDITION OF SUPPORT</strong></p>
}

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (e) { notFound() }
    const motion = await GetMotionOrThrow(BigInt(id))
    const member = await GetMember(motion.author) ?? notFound()
    const meeting = motion.meeting ? await GetMeeting(motion.meeting) : null
    const votes = await db`SELECT * FROM votes WHERE motion = ${motion.id}` as Vote[];
    const ayes = votes.filter(v => v.vote);
    const members = votes.length ? await GetAllMembers() : []
    const nations = votes.length ? await GetAllNations() : []
    return (
        <>
            <Stripe>
                #{motion.id}:
                <span className=''> {motion.title}</span>
                <span className='[font-variant:small-caps] text-neutral-300'> [{FormatMotionType(motion)}]</span>
                <span>{GetMotionEmoji(motion)}</span>
            </Stripe>
            <div className='flex justify-center -mt-8'>
                <Member member={member} />
            </div>

            <div className='text-center my-8 italic m-auto mx-auto'> {
                  votes.length !== 0 && motion.closed ? `Voted on During Meeting ${meeting?.name}`
                : meeting                             ? `Scheduled for Meeting ${meeting.name}`
                                                      : null
            } </div>
            {votes.length !== 0 || motion.enabled || motion.closed ? <>
                <h3>Votes</h3>
                <p>
                    Ayes: {ayes.length},
                    Noes: {votes.length - ayes.length}
                    {motion.quorum ? `, Quorum: ${motion.quorum}` : null}
                </p>
                <div className='grid gap-y-4 gap-x-16 leading-8 mt-4 items-center grid-cols-[auto_auto_auto_1fr]'>
                    {votes.map(v => <Fragment key={v.nation}>
                        <Nation
                            nation={nations.find(n => n.id === v.nation)!}
                            member={members.find(m => m.discord_id === v.member)}
                        />
                        <div className='-ml-14'>{v.vote ? '✅' : '❌'}</div>
                    </Fragment>)}
                </div>
            </> : null}

            {motion.closed ? FormatMotionStatus(motion) : null}
            <div className='
                mt-8
                [&>ol]:list-decimal [&>ul]:list-image-[url("/fleur-de-lis.svg")]
                [&>ol,ul]:list-inside [&>ol,ul]:ml-8 [&>ol,ul]:my-4 [&_p+p]:mt-4
            '><Markdown>{motion.text}</Markdown></div>

            {/*TODO: All of the motion controls and dialogs. */}
        </>
    )
}
