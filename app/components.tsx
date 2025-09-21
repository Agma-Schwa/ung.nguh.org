import {ReactNode} from 'react';

export function Stripe({ children }: { children: ReactNode }) {
    return (
        <div>
            <h2 className='text-center my-20'>{children}</h2>
        </div>
    )
}
