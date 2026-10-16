'use server';
import {getDatabasePool} from '@/server/db/pool';
import {currentSessionProvider} from '@/server/auth/current';
import {redriveNotification,getNotificationMonitor,type NotificationStatus,type NotificationMonitor} from '@/server/services/notification-monitor';
import type {BookingScope} from '@/server/services/bookings';
export async function loadNotificationStatus(scope:BookingScope,status:NotificationStatus,page:number):Promise<{data?:NotificationMonitor;error?:string}> {
 try{return {data:await getNotificationMonitor(getDatabasePool(),await currentSessionProvider(),scope,status,page)};}
 catch{return {error:'알림 현황을 불러오지 못했어요. 로그인과 지점 관리 권한을 확인한 후 다시 시도해 주세요.'};}
}

export async function retryNotification(scope:BookingScope,id:string,generation:number):Promise<{error?:string}> {
 try{await redriveNotification(getDatabasePool(),await currentSessionProvider(),scope,id,generation);return {};}
 catch{return {error:'재처리하지 못했어요. 관리 권한과 최신 상태를 확인해 주세요. 오래된 요청이나 변경된 예약은 재처리할 수 없어요.'};}
}
