import {ReactNode, useMemo} from 'react';
import type {MemberProfile, NationPartial} from '@/api';
import {SortMembers} from '@/utils';

/** A section heading. */
export function Stripe({ children }: { children: ReactNode }) {
    return (
        <div>
            <h2 className='text-center my-20 select-none'>{children}</h2>
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
            <div>
                <img
                    src={member.avatar_url}
                    className='w-8 h-8 rounded-full select-none'
                    alt={member.display_name}
                />
            </div>
            <div className='leading-8'>
                <span className={`select-none ${member.active ? '' : 'line-through text-neutral-500'}`}>
                    {member.display_name}
                </span>
            </div>
            {member.administrator ? <span className='select-none -ml-1'>🛡️</span> : null}
            {member.ruler ? <span className='select-none -ml-1'>👑️</span> : null}
        </div>
    )
}

/** A list of UŊ members. */
export function MemberList({
    members
}: {
    members: MemberProfile[]
}) {
    let members_sorted = useMemo(() => SortMembers(members), [members])
    return (
        <div className='flex flex-col gap-4'>
            {members_sorted.map((m) => <Member key={m.discord_id} member={m}/>)}
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
    member?: MemberProfile | null,
    starred?: boolean | null
}) {
    return (
        <div className='flex gap-2 [--width:1.25rem] [--height:calc(var(--width)*2)]'>
            <div className='relative'>
                <img
                    src={nation.banner_url!}
                    className='
                        select-none rounded-[0_0_var(--width)_var(--width)] w-(--width)
                        h-(--height)
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
                <span className={`select-none ${nation.deleted ? 'line-through text-neutral-500' : ''}`}>
                    {nation.name}
                </span>
                {nation.observer && !nation.deleted ? <span className='text-[1.5rem]'> 👀️</span> : null}
                {nation.deleted ? <span className='text-[1.5rem]'> 🪦</span> : null}
                {starred ? <span className='text-[1.5rem]'> ⭐️</span> : null}
            </span>
        </div>
    )
}