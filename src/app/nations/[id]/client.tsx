'use client'

import {MemberProfile, NationProfile} from '@/api';
import React, {useMemo, useRef} from 'react';
import {useAction} from 'next-safe-action/hooks';
import {AddMemberToNation, RemoveMemberFromNation} from '@/services';
import {Button, CheckSuccess, Dialog, useConfirm, XButton} from '@/components-client';
import {Member} from '@/components';
import {SortMembers} from '@/utils';

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
                Add as a ruler
            </label>
        </Dialog>
    )
}

export function LeaveDialog({
    me,
    nation
}: {
    me: MemberProfile,
    nation: NationProfile
}) {
    const { confirm } = useConfirm()
    const { execute, reset } = useAction(RemoveMemberFromNation, {
        onSuccess: ({ data }) => {
            CheckSuccess(data)
            reset()
        }
    })

    if (!me) return null

    async function Leave() {
        if (await confirm('Are you sure you want to leave this ŋation?')) execute({
            member_to_remove: me.discord_id,
            nation_id: nation.id
        })
    }

    return (
        <Button onClick={Leave}>Leave</Button>
    )
}

export function NationMemberList({
    can_edit,
    is_admin,
    nation,
    members,
}: {
    can_edit: boolean,
    is_admin: boolean,
    nation: NationProfile,
    members: MemberProfile[]
}) {
    let members_sorted = useMemo(() => SortMembers(members), [members])
    const { confirm } = useConfirm()
    const { execute, reset } = useAction(RemoveMemberFromNation, {
        onSuccess: ({ data }) => {
            CheckSuccess(data)
            reset()
        }
    })

    async function Remove(member: bigint) {
        if (await confirm('Are you sure you want to remove this member?')) execute({
            member_to_remove: member,
            nation_id: nation.id
        })
    }

    return (
        <div className='flex flex-col gap-4'>
            {members_sorted.map((m) => <div key={m.discord_id} className='flex flex-row'>
                {can_edit ? <XButton
                    enabled={!m.ruler || is_admin}
                    onClick={() => Remove(m.discord_id)} /> : null
                }
                <Member member={m}/>
            </div>)}
        </div>
    )
}