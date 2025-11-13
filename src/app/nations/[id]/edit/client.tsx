'use client'

import {ReactNode, useState} from 'react';
import {NationProfile} from '@/api';
import {ActionForm, Button, FormTextInput, TextInput, useActionChecked} from '@/components-client';
import {useRouter} from 'next/navigation';
import {EditŊation} from '@/services';

export function NationEditForm({ nation }: { nation: NationProfile }) {
    const router = useRouter()
    const return_url = `/nations/${nation.id}`
    const [name, setName] = useState(nation.name);
    const [wikiPage, setWikiPage] = useState(nation.wiki_page_link ?? '');
    const [bannerURL, setBannerURL] = useState(nation.banner_url ?? '');
    const execute = useActionChecked(EditŊation, () => router.push(return_url))

    function Update() {
        execute({
            nation_id: nation.id,
            name,
            wiki_page_link: wikiPage,
            banner_url: bannerURL
        })
    }

    return (
        <ActionForm action={Update} returnTo={return_url}>
            <FormTextInput label='Name' initialValue={name} setValue={setName} />
            <FormTextInput label='Wiki Page URL' initialValue={wikiPage} setValue={setWikiPage} type='url' />
            <FormTextInput label='Banner URL' initialValue={bannerURL} setValue={setBannerURL} type='url' />
            {URL.canParse(bannerURL) ? <div className='flex items-center mt-8'>
                <img src={bannerURL} alt='Banner' className='
                    w-20
                    [box-shadow:_2px_2px_5px_var(--color-neutral-800)]
                    [image-rendering:crisp-edges]
                ' />
            </div> : null }
        </ActionForm>
    )
}