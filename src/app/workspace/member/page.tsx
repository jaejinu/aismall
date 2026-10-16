import {redirect} from 'next/navigation';
import {currentSessionProvider} from '@/server/auth/current';
import {AuthenticationRequired} from '@/server/auth/session';
import {getDatabasePool} from '@/server/db/pool';
import {getMemberBookings} from '@/server/services/member-bookings';
import {MemberBookingView} from '@/components/workspace/member-booking-view';
export default async function MemberBookingsPage() {
 let connections;
 try {connections=await getMemberBookings(getDatabasePool(),await currentSessionProvider());}
 catch(e){if(e instanceof AuthenticationRequired)redirect('/login');return <p role="alert" className="p-6">회원 예약 정보를 불러오지 못했어요.</p>;}
 return <MemberBookingView connections={connections} now={new Date().getTime()}/>;
}
