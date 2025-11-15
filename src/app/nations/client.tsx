'use client'

import {MemberProfile, NationProfile} from '@/api';
import {Dialog, Select, useActionChecked} from '@/components-client';
import {useEffect, useState} from 'react';
import {SetRepresentedNation} from '@/services';

export function SelectRepresentedNationWidget({
    me,
    nations,
}: {
    me: MemberProfile,
    nations: NationProfile[]
}) {
    const [nation, setNation] = useState<bigint>()
    const execute = useActionChecked(SetRepresentedNation)
    useEffect(() => setNation(nations[0]?.id), [nations])
    function Confirm() {
        if (nation === undefined || nation === me.represented_nation) return
        execute({ nation_id: nation })
    }

    return <Dialog label='Select Represented Nation' buttons={[
        {label: 'Confirm', action: Confirm},
        {label: 'Cancel'}
    ]}>
        <Select onChange={v => setNation(BigInt(v))}>
            {nations.map(n => <option key={n.id} value={String(n.id)}>
                {n.name}
            </option>)}
        </Select>
    </Dialog>
}