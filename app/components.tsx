import {ReactNode, useMemo} from 'react';
import type {MemberProfile} from '@/app/api';

/** A section heading. */
export function Stripe({ children }: { children: ReactNode }) {
    return (
        <div>
            <h2 className='text-center my-20 select-none'>{children}</h2>
        </div>
    )
}

/** A UŊ member. */
function Member({
    member
}: {
    member: MemberProfile
}) {
    return (
        <div className='flex gap-2 text-2xl'>
            <div>
                <img
                    src={member.avatar_url}
                    className='w-8 rounded-full select-none'
                    alt={member.display_name}
                />
            </div>
            <div className='leading-8'>
                <span className={member.active ? "" : "line-through text-gray-500"}>
                    {member.display_name}
                </span>
            </div>
            {member.administrator ? <span className='select-none'>🛡️</span> : null}
        </div>
    )
}

/** A list of UŊ members. */
export function MemberList({
    members
}: {
    members: MemberProfile[]
}) {
    // Put rulers first, then administrators, then other members by name.
    let members_sorted = useMemo(() => members.toSorted((m1, m2) => {
        // if (m1.ruler !== m2.ruler) return +m2.ruler - +m1.ruler
        if (m1.administrator !== m2.administrator) return +m2.administrator - +m1.administrator
        let name1 = m1.display_name.normalize('NFKC').toLowerCase();
        let name2 = m2.display_name.normalize('NFKC').toLowerCase();
        return name1.localeCompare(name2)
    }), [members])

    return (
        <div className='flex flex-col gap-4'>
            {members_sorted.map((m) => <Member key={m.discord_id} member={m}/>)}
        </div>
    )
}