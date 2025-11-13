import {notFound} from 'next/navigation';
import {Meeting} from '@/app/meetings/server';

export default async function({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    try { BigInt(id); } catch (e) { notFound() }
    return <Meeting id={BigInt(id)} />
}