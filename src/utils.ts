import {ClosureReason, MemberProfile, Motion, MotionType} from '@/api';
import {z} from 'zod';

export const AdmissionSchema = z.object({
    name: z.string().trim().min(1).max(200),
    ruler: z.string().trim().min(0).max(200),
    banner_text: z.string().trim().min(0).max(1000),
    banner_url: z.string().trim().min(0).max(6000),
    claim_text: z.string().trim().min(0).max(6000),
    claim_url: z.string().trim().min(0).max(6000),
    trivia: z.string().trim().min(0).max(6000),
})

export const MotionSchema = z.object({
    type: z.literal(Object.values(MotionType)),
    title: z.string().trim().min(1).max(500),
    text: z.string().trim().min(1).max(10000),
})

export const ClosureReasonSchema = z.literal(Object.values(ClosureReason))

export function CanEditMotion(
    member: MemberProfile,
    motion: Motion,
): boolean {
    if (member.administrator) return true
    if (motion.locked) return false
    return motion.author === member.discord_id
}

export function FormatMotionType(type: MotionType) {
    switch (type) {
        case MotionType.Constitutional: return 'cons'
        case MotionType.Executive: return 'exec'
        case MotionType.Legislative: return 'leg'
        case MotionType.Unsure: return 'unsure'
        default: return 'invalid'
    }
}

export function SortMembers(members: readonly MemberProfile[]): MemberProfile[] {
    return members.toSorted((m1, m2) => {
        // Put rulers first, then administrators, then other members by name.
        if (m1.ruler !== m2.ruler) return +!!m2.ruler - +!!m1.ruler
        if (m1.administrator !== m2.administrator) return Number(m2.administrator - m1.administrator)
        const name1 = m1.display_name.normalize('NFKC').toLowerCase();
        const name2 = m2.display_name.normalize('NFKC').toLowerCase();
        return name1.localeCompare(name2)
    })
}

export function UnixTimestampSeconds() {
    return BigInt(Math.floor(new Date().getTime() / 1000));
}