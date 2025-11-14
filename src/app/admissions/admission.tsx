'use client'

import {Admission} from '@/api';
import {ActionForm, FormTextInput, Label, TextArea} from '@/components-client';
import {useState} from 'react';
import z from 'zod'
import type {AdmissionSchema} from '@/utils';

export type AdmissionCreateEditFormData = z.input<typeof AdmissionSchema>

export default function AdmissionCreateEditForm({
    action,
    admission,
    returnTo,
    isPending,
}: {
    action: (data: AdmissionCreateEditFormData) => void,
    admission?: Admission
    returnTo: string,
    isPending: boolean,
}) {
    const [name, setName] = useState(admission?.name ?? '')
    const [ruler, setRuler] = useState(admission?.ruler ?? '')
    const [bannerDesc, setBannerDesc] = useState(admission?.banner_text ?? '')
    const [bannerURL, setBannerURL] = useState(admission?.banner_url ?? '')
    const [claim, setClaim] = useState(admission?.claim_text ?? '')
    const [claimImage, setClaimImage] = useState(admission?.claim_url ?? '')
    const [trivia, setTrivia] = useState(admission?.trivia ?? '')

    function Submit() {
        action({
            name,
            ruler,
            banner_url: bannerURL,
            banner_text: bannerDesc,
            claim_text: claim,
            claim_url: claimImage,
            trivia
        })
    }

    return (
        <ActionForm action={Submit} returnTo={returnTo} isPending={isPending}>
            <FormTextInput label='Ŋation Name' initialValue={name} setValue={setName} />
            <FormTextInput label='Ruler Name' initialValue={ruler} setValue={setRuler} />
            <FormTextInput label='Banner Description' initialValue={bannerDesc} setValue={setBannerDesc} />
            <FormTextInput label='Banner URL' initialValue={bannerURL} setValue={setBannerURL} type='url' />
            <Label label='Claim Description'>
                <TextArea onChange={setClaim} initialValue={claim} />
            </Label>
            <FormTextInput label='Claim Image' initialValue={claimImage} setValue={setClaimImage} type='url' />
            <Label label='Additional Info'>
                <TextArea onChange={setTrivia} initialValue={trivia} />
            </Label>
        </ActionForm>
    )
}