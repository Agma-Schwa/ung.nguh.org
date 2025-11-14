'use client'

import {MemberProfile, NationProfile} from '@/api';
import {Dialog, Select, useActionChecked} from '@/components-client';
import {useState} from 'react';
import {SetRepresentedNation} from '@/services';

export function SelectRepresentedNationWidget({
    me,
    nations,
}: {
    me: MemberProfile,
    nations: NationProfile[]
}) {
    const [nation, setNation] = useState(nations[0].id)
    const execute = useActionChecked(SetRepresentedNation)

    function Confirm() {
        if (nation === me.represented_nation) return
        execute({ nation_id: nation })
    }

    return <Dialog label='Select Represented Nation' buttons={[
        {label: 'Confirm', action: Confirm},
        {label: 'Cancel'}
    ]}>
        <Select onChange={v => setNation(BigInt(v))} defaultValue={String(nations[0].id)}>
            {nations.map(n => <option key={n.id} value={String(n.id)}>
                {n.name}
            </option>)}
        </Select>
    </Dialog>
}