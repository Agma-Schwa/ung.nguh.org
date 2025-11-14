import {Fragment, ReactNode, useMemo} from 'react';
import {MemberProfile, NationPartial, PartialMember, VoteCommon} from '@/api';
import {SortMembers} from '@/utils';
import {GetAllMembers, GetAllNations} from '@/services';

/** A section heading. */
export function Stripe({ children }: { children: ReactNode }) {
    return (
        <div>
            <h2 className='text-center mt-10 mb-6 select-none'>{children}</h2>
        </div>
    )
}

/** UŊ member avatar. */
export function MemberAvatar({
    member
}: {
    member: PartialMember
}) {
    return (
        <div>
            <img
                src={member.avatar_url}
                className='w-8 min-w-8 max-w-8 h-8 min-h-8 max-h-8 rounded-full select-none aspect-square'
                alt={member.display_name}
            />
        </div>
    )
}

/** A UŊ member. */
export function Member({
    member
}: {
    member: MemberProfile
}) {
    return (
        <div className='flex gap-2 text-2xl'>
            <MemberAvatar member={member} />
            <div className='leading-8'>
                <span className={`select-none text-ell-nowrap ${member.active ? '' : 'line-through text-neutral-500'}`}>
                    {member.display_name}
                </span>
            </div>
            {member.administrator ? <span className='select-none -ml-1'>🛡️</span> : null}
            {member.ruler ? <span className='select-none -ml-1'>👑️</span> : null}
        </div>
    )
}

/** A ŋation. */
export function Nation({
    nation,
    member,
    starred,
}: {
    nation: NationPartial,
    member?: PartialMember | null,
    starred?: boolean | null
}) {
    return (
        <div className='flex gap-2 [--width:1.25rem] [--height:calc(var(--width)*2)]'>
            <div className='relative'>
                <img
                    src={URL.canParse(nation.banner_url ?? '') ? nation.banner_url! : null!}
                    className='
                        select-none rounded-[0_0_var(--width)_var(--width)]
                        w-(--width) min-w-(--width)
                        h-(--height) min-h-(--height)
                        [outline:1px_solid] outline-neutral-500
                    '
                />
                {member ? <img
                    src={member.avatar_url}
                    className='
                        select-none absolute rounded-[50%]
                        w-[calc(var(--width)*.875)]
                        bottom-[calc(var(--width)*.1)]
                        left-[calc(var(--width)*.06)]
                    '
                /> : null}
            </div>
            <span className='
                [font-variant:small-caps] h-(--height) leading-(--height) text-2xl ml-1
            '>
                <span className={`select-none text-ell-nowrap ${nation.deleted ? 'line-through text-neutral-500' : ''}`}>
                    {nation.name}
                </span>
                {nation.observer && !nation.deleted ? <span className='text-[1.5rem]'> 👀️</span> : null}
                {nation.deleted ? <span className='text-[1.5rem]'> 🪦</span> : null}
                {starred ? <span className='text-[1.5rem]'> ⭐️</span> : null}
            </span>
        </div>
    )
}

export function NationBannerFullSize({
    bannerURL,
}: {
    bannerURL: string;
}) {
    if (!URL.canParse(bannerURL)) return null
    return <div className='flex items-center'>
        <img src={bannerURL} alt='Banner' className='
            w-20
            [box-shadow:_2px_2px_5px_var(--color-neutral-800)]
            [image-rendering:crisp-edges]
        ' />
    </div>
}

export async function Votes({
    votes,
    quorum,
}: {
    votes: VoteCommon[]
    quorum?: bigint
}) {
    const ayes = votes.filter(v => v.vote);
    const members = votes.length ? await GetAllMembers() : []
    const nations = votes.length ? await GetAllNations() : []
    return <>
        <h3>Votes</h3>
        <p>
            Ayes: {ayes.length},
            Noes: {votes.length - ayes.length}
            {quorum ? `, Quorum: ${quorum}` : null}
        </p>
        <div className='grid gap-y-4 gap-x-16 leading-8 mt-4 items-center grid-cols-[auto_1fr]'>
            {votes.map(v => <Fragment key={v.nation}>
                <Nation
                    nation={nations.find(n => n.id === v.nation)!}
                    member={members.find(m => m.discord_id === v.member)}
                />
                <div className='-ml-14'>{v.vote ? '✅' : '❌'}</div>
            </Fragment>)}
        </div>
    </>
}