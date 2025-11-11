"use client"

import {useAction} from 'next-safe-action/hooks';
import {FooAction} from '@/services';

export function Foo() {
    const { execute, reset } = useAction(FooAction, {
        onSuccess: () => { reset(); }
    })

    function DoIt() {
        console.log("Adding foo")
        execute({foo: 42n})
    }

    return <button onClick={DoIt}>Add foo</button>
}