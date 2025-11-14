'use client'

import {MemberProfile, NationProfile} from '@/api';
import React, {useMemo, useRef} from 'react';
import {AddMemberToNation, RemoveMemberFromNation, SetNationStatus} from '@/services';
import {Button, Dialog, useActionChecked, useConfirm, XButton} from '@/components-client';
import {Member} from '@/components';
import {SortMembers} from '@/utils';
import {useRouter} from 'next/navigation';

export function AddMemberDialog({
    nation,
    not_members,
}: {
    nation: NationProfile
    not_members: MemberProfile[];
}) {
    const checkbox = useRef<HTMLInputElement>(null)
    const select = useRef<HTMLSelectElement>(null)
    const execute = useActionChecked(AddMemberToNation)

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
                {not_members.filter(m => !m.staff_only).map(m => <option key={m.discord_id} value={String(m.discord_id)}>
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

export function DemoteControls({
    nation,
    can_edit,
    me
}: {
    nation: NationProfile,
    can_edit: boolean,
    me: MemberProfile
}) {
    const { confirm } = useConfirm();
    const execute = useActionChecked(SetNationStatus)

    async function DemoteToObserver() {
        if (await confirm(nation.observer
            ? "Promote this ŋation from an observer ŋation?"
            : "Demote this ŋation to an observer ŋation?"
        )) {
            execute({
                nation_id: nation.id,
                observer: true,
                value: !nation.observer
            })
        }
    }

    async function MarkAsDeleted() {
        if (await confirm(nation.deleted
            ? "Restore this ŋation?"
            : "Mark this ŋation as deleted?"
        )) {
            execute({
                nation_id: nation.id,
                observer: false,
                value: !nation.deleted
            })
        }
    }

    return (
        <>
            {can_edit ? <Button onClick={DemoteToObserver} danger={!nation.observer}>
                {nation.observer ? 'Promote from' : 'Demote to'} Observer
            </Button> : null}
            {me.administrator ? <Button onClick={MarkAsDeleted} danger={!nation.deleted}>
                {nation.deleted ? 'Undelete' : 'Delete'} Nation
            </Button> : null}
        </>
    )
}

export function EditButton({ id }: { id: bigint }) {
    const router = useRouter()
    function Edit() {
        router.push(`/nations/${id}/edit`)
    }

    return <Button onClick={Edit}>Edit Ŋation</Button>
}

export function LeaveDialog({
    me,
    nation
}: {
    me: MemberProfile,
    nation: NationProfile
}) {
    const { confirm } = useConfirm()
    const execute = useActionChecked(RemoveMemberFromNation)

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
    const execute = useActionChecked(RemoveMemberFromNation)

    async function Remove(member: bigint) {
        if (await confirm('Are you sure you want to remove this member?')) execute({
            member_to_remove: member,
            nation_id: nation.id
        })
    }

    return (
        <div className='flex flex-col gap-4'>
            {members_sorted.map((m) => <div key={m.discord_id} className='flex flex-row gap-2'>
                {can_edit ? <XButton
                    enabled={!m.ruler || is_admin}
                    onClick={() => Remove(m.discord_id)} /> : null
                }
                <Member member={m}/>
            </div>)}
        </div>
    )
}