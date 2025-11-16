import {Fragment, ReactNode} from 'react';
import {MemberProfile, NationPartial, PartialMember, VoteCommon} from '@/api';
import {GetAllMembers, GetAllNations} from '@/services';
import {twMerge} from 'tailwind-merge';
import {Noto_Color_Emoji} from 'next/font/google';
import Link from 'next/link';

const emoji_font = Noto_Color_Emoji({
    preload: true,
    weight: '400',
    fallback: ['system-ui'],
    subsets: ['emoji']
})

function Icon({ emoji, className }: { emoji: string, className?: string }) {
    return <span className={`${emoji_font.className} ${twMerge('select-none', className)}`}>
        {emoji}
    </span>;
}

export function IconArrows({ className }: { className?: string }) {
    return <Icon emoji='🗘' className={className} />
}

export function IconCross({ className }: { className?: string }) {
    return <Icon emoji='❌️' className={twMerge('ml-1.5', className)} />
}

export function IconCrown({ className }: { className?: string }) {
    return <Icon emoji='👑️' className={twMerge('-ml-1', className)} />
}

export function IconDove({ className }: { className?: string }) {
    return <Icon emoji='🕊️️️' className={className} />
}

export function IconEye({ className }: { className?: string }) {
    return <Icon emoji='👁️️' className={twMerge('ml-1', className)} />
}

export function IconHeadstone({ className }: { className?: string }) {
    return <Icon emoji='🪦' className={twMerge('ml-1', className)} />
}

export function IconHourglass({ className }: { className?: string }) {
    return <Icon emoji='⏳' className={twMerge('ml-1', className)} />
}

export function IconGhost({ className }: { className?: string }) {
    return <img src='/ghost.svg' className={twMerge('h-7 w-7', className)} alt='Banned user' />
}

export function IconLock({ className }: { className?: string }) {
    return <Icon emoji='🔒' className={twMerge('ml-1', className)} />
}

export function IconShield({ className }: { className?: string }) {
    return <Icon emoji='🛡️' className={twMerge('-ml-1', className)} />
}

export function IconStar({ className }: { className?: string }) {
    return <Icon emoji='⭐️' className={twMerge('ml-1', className)} />
}

export function IconTick({ className }: { className?: string }) {
    return <Icon emoji='✅️' className={twMerge('ml-1.5', className)} />
}

/** A section heading. */
export function Stripe({ children }: { children: ReactNode }) {
    return (
        <div>
            <h2 className='text-center mt-10 mb-6'>{children}</h2>
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
        <div className='flex flex-row items-center gap-2 text-2xl'>
            <MemberAvatar member={member} />
            <span className={`select-none text-ell-nowrap ${member.active ? '' : 'line-through text-neutral-500'}`}>
                {member.display_name}
            </span>
            {member.administrator ? <IconShield /> : null}
            {member.ruler ? <IconCrown /> : null}
            {!member.active ? <IconGhost /> : null}
        </div>
    )
}

function NationImpl({
    nation,
    member,
}: {
    nation: NationPartial,
    member?: PartialMember | null,
}) {
    return <>
        <div className='relative'>
            <img
                src={URL.canParse(nation.banner_url ?? '') ? nation.banner_url! : null!}
                alt=''
                className='
                    select-none rounded-[0_0_var(--width)_var(--width)]
                    w-(--width) min-w-(--width)
                    h-(--height) min-h-(--height)
                    [outline:1px_solid] outline-neutral-500
                '
            />
            {member ? <img
                src={member.avatar_url}
                alt=''
                className='
                    select-none absolute rounded-[50%]
                    w-[calc(var(--width)*.875)]
                    bottom-[calc(var(--width)*.1)]
                    left-[calc(var(--width)*.06)]
                '
            /> : null}
        </div>
        <span className='
            [font-variant:small-caps] text-2xl ml-1
        '>
            <span className={`text-ell-nowrap ${nation.deleted ? 'line-through text-neutral-500' : ''}`}>
                {nation.name}
            </span>
        </span>
    </>
}
/** A ŋation. */
export function Nation({
    nation,
    member,
    starred,
    link,
}: {
    nation: NationPartial,
    member?: PartialMember | null,
    starred?: boolean | null
    link: boolean
}) {
    return (
        <div className='flex [--width:1.25rem] [--height:calc(var(--width)*2)] items-center'>
            {link ? <Link href={`/nations/${nation.id}`} className='flex gap-2 items-center'>
                <NationImpl nation={nation} member={member} />
            </Link> : <div className='flex gap-2 items-center'>
                <NationImpl nation={nation} member={member} />
            </div>}

            {nation.observer && !nation.deleted ? <IconEye /> : null}
            {nation.deleted ? <IconHeadstone /> : null}
            {starred ? <IconStar /> : null}
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
        <div className='grid gap-y-4 gap-x-16 mt-4 items-center grid-cols-[auto_1fr]'>
            {votes.map(v => <Fragment key={v.nation}>
                <Nation
                    nation={nations.find(n => n.id === v.nation)!}
                    member={members.find(m => m.discord_id === v.member)}
                    link={true}
                />
                <div className='-ml-14'>{v.vote ? '✅' : '❌'}</div>
            </Fragment>)}
        </div>
    </>
}