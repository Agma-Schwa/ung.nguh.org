import {MemberProfile} from '@/api';

export function SortMembers(members: readonly MemberProfile[]): MemberProfile[] {
    return members.toSorted((m1, m2) => {
        // Put rulers first, then administrators, then other members by name.
        if (m1.ruler !== m2.ruler) return +!!m2.ruler - +!!m1.ruler
        if (m1.administrator !== m2.administrator) return Number(m2.administrator - m1.administrator)
        let name1 = m1.display_name.normalize('NFKC').toLowerCase();
        let name2 = m2.display_name.normalize('NFKC').toLowerCase();
        return name1.localeCompare(name2)
    })
}