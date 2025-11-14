'use client'

import {MemberProfile} from '@/api';
import {useMemo} from 'react';
import {SortMembers} from '@/utils';
import {Member} from '@/components';
import {Gavel} from 'lucide-react';
import {Button, useActionChecked, useConfirm} from '@/components-client';
import {SetMemberAccountStatus} from '@/services';

export function MemberList({
    members,
    admin,
}: {
    members: MemberProfile[],
    admin: boolean,
}) {
    const active = useMemo(() => SortMembers(members.filter(m => m.active)), [members])
    const inactive = useMemo(() => SortMembers(members.filter(m => !m.active)), [members])
    const { confirm } = useConfirm()
    const set_account_status = useActionChecked(SetMemberAccountStatus)
    async function SetAccountStatus(member: MemberProfile, new_status: boolean) {
        if (await confirm(`Are you sure you want to ${new_status ? 'unban': 'ban'} '${member.display_name}'?`)) {
            set_account_status({
                member_id: member.discord_id,
                active: new_status,
            })
        }
    }

    return (
        <>
            <div className='flex flex-col gap-4'>
                {active.map((m) => <div key={m.discord_id} className='flex flex-row gap-2 items-center'>
                    { admin ?
                        <Button onClick={() => SetAccountStatus(m, false)} disabled={!!m.administrator} className='
                            !bg-transparent !hover:bg-transparent
                        '>  <Gavel className={`
                                -scale-x-100 transition duration-300 ${
                                    m.administrator ? 'stroke-gray-400' : 'stroke-rose-400 hover:stroke-rose-300'
                                }
                            `} />
                        </Button>
                    : null }
                    <Member member={m}/>
                </div>)}
            </div>
            { admin && inactive.length ? <>
                <h3 className='mt-8 mb-2'>Banned Members</h3>
                <div className='flex flex-col gap-4'>
                    {inactive.map((m) => <div key={m.discord_id} className='flex flex-row gap-2 items-center'>
                        <Button onClick={() => SetAccountStatus(m, true)} className='
                            !bg-transparent !hover:bg-transparent
                        '><span className='hover:brightness-130 transition duration-300'>🕊️</span></Button>
                        <Member member={m}/>
                    </div>)}
                </div>
            </> : null }
        </>
    )
}

