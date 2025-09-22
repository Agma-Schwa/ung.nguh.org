'use client'

import {MemberProfile, NationProfile} from '@/api';
import {useRef} from 'react';
import {useAction} from 'next-safe-action/hooks';
import {AddMemberToNation} from '@/services';
import {CheckSuccess, Dialog} from '@/components-client';

export function AddMemberDialog({
    nation,
    not_members,
}: {
    nation: NationProfile
    not_members: MemberProfile[];
}) {
    const checkbox = useRef<HTMLInputElement>(null)
    const select = useRef<HTMLSelectElement>(null)
    const { execute, reset } = useAction(AddMemberToNation, {
        onSuccess: ({ data }) => {
            CheckSuccess(data)
            reset()
        }
    })

    function Submit() {
        if (!checkbox.current || !select.current) return
        execute({
            member_to_add: BigInt(select.current.value),
            nation_id: nation.id,
            ruler: checkbox.current.checked
        })
    }

    return (
        <div className='mt-6'>
            <Dialog
                label='Add Member'
                title='Add Member'
                buttons={[
                    {label: 'Add', action: Submit},
                    {label: 'Cancel'},
                ]}
            >   <select ref={select} className='bg-neutral-600 m-auto' name='discord_id'>
                    {not_members.map(m => <option key={m.discord_id} value={String(m.discord_id)}>
                        {m.display_name}
                    </option>)}
                </select>
                <label className='mx-auto'>
                    <input ref={checkbox} type='checkbox' name='ruler' className='mr-2' />
                    Add as ruler
                </label>
            </Dialog>
        </div>
    )
}