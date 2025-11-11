import {NextRequest, NextResponse} from 'next/server';

export function GET(req: NextRequest) {
    // We used to have individual motions under '/motion/X' rather than '/motions/X';
    // this redirect is here to prevent old links from breaking.
    return new NextResponse(null, {status: 301, headers: {
        'Location': req.nextUrl.pathname.replace('motion', 'motions')
    }})
}