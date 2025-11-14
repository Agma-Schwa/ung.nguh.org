import {notFound} from 'next/navigation';
import {db, GetAdmissionOrThrow, GetMe} from '@/services';
import {MemberAvatar, NationBannerFullSize, Stripe, Votes} from '@/components';
import {AdmissionVote} from '@/api';
import {MarkdownText} from '@/app/motions/[id]/client';
import {AdmissionControls} from '@/app/admissions/[id]/client';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (e) { notFound() }
    const me = await GetMe()
    const admission = await GetAdmissionOrThrow(BigInt(id))
    const votes = await db`SELECT * FROM admission_votes WHERE admission = ${admission.id}` as AdmissionVote[]
    return (
        <>
            <Stripe>Admission</Stripe>
            <div className='flex flex-col gap-4 items-center'>
                <div className='text-4xl'>{admission.name}</div>
                {admission.ruler.length !== 0 ? <div className='text-2xl'>
                    <em>ruled by</em> <span className='[font-variant:small-caps]'> {admission.ruler}</span>
                </div> : null}
                <div className='flex gap-2 text-2xl mb-4'>
                    <MemberAvatar member={admission} />
                    <div className='leading-8'>
                        <span className={`select-none`}>
                            {admission.display_name}
                        </span>
                    </div>
                </div>
                <NationBannerFullSize bannerURL={admission.banner_url} />
            </div>

            {votes.length !== 0 || admission.closed ? <Votes votes={votes}/> : null }
            {admission.closed && admission.passed ?
                <p className='mt-4 text-emerald-400'><strong>ADMITTED</strong></p> : null}
            {admission.closed && !admission.passed ?
                <p className='mt-4 text-rose-400'><strong>REJECTED</strong></p> : null}

            <h3 className='mt-6'>Claims</h3>
            {     admission.claim_text              ? <MarkdownText text={admission.claim_text}/>
                : URL.canParse(admission.claim_url) ? <div className='flex justify-center mt-8'>
                    <div className='w-1/2 min-w-5 min-h-5 border border-neutral-500'>
                        <img src={admission.claim_url} alt='Map Image' className='w-full'/>
                    </div>
                </div>
                : <p>None given.</p>
            }

            {admission.trivia ? <>
                <h3 className='mt-6'>Description</h3>
                <MarkdownText text={admission.trivia}/>
            </> : null}

            <AdmissionControls admission={admission} me={me} />
        </>
    )
}