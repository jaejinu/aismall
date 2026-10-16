import 'server-only';
import type {NotificationResultReason} from '../notifications/outbox';
import type {Pool} from 'pg';
import {withTenant} from '../access/tenant';
import {uuidPattern,type SessionProvider} from '../auth/session';
import {BookingInputError,type BookingScope} from './bookings';
export type NotificationStatus='all'|'pending'|'processing'|'delivered'|'dead';
export type NotificationDelivery={receipt_recorded:boolean;last_received_at:string|null;events:{type:string;occurred_at:string}[]};
export type NotificationMonitor={
 counts:Record<'pending'|'processing'|'delivered'|'dead'|'expired',number>;
 items:{delivery:NotificationDelivery;last_result:{reason:NotificationResultReason;generation:number;attempt:number;created_at:string}|null;redrive_count:number;can_redrive:boolean;id:string;booking_id:string;booking_version:number;event:string;status:Exclude<NotificationStatus,'all'>;attempts:number;
 last_error:'temporary'|'permanent'|'lease_expired'|null;created_at:string;available_at:string;finished_at:string|null;expired:boolean;
 customer:string;program:string;starts_at:string}[];
 hasMore:boolean;page:number;status:NotificationStatus;
};
export async function getNotificationMonitor(pool:Pool,provider:SessionProvider,scope:BookingScope,status:NotificationStatus='all',page=1):Promise<NotificationMonitor> {
 if(!uuidPattern.test(scope.branchId)||!['all','pending','processing','delivered','dead'].includes(status)||!Number.isSafeInteger(page)||page<1||page>10000)throw new BookingInputError('조회 조건을 확인해 주세요.');
 return withTenant(pool,provider,scope.tenantId,async db=>(await db.query('SELECT app_private.booking_notification_status($1,$2,$3,$4) AS data',[scope.tenantId,scope.branchId,status,page])).rows[0].data);
}

export async function redriveNotification(pool:Pool,provider:SessionProvider,scope:BookingScope,id:string,generation:number):Promise<void> {
 if(!uuidPattern.test(scope.branchId)||!uuidPattern.test(id)||!Number.isSafeInteger(generation)||generation<0||generation>2)throw new BookingInputError('재처리 요청을 확인해 주세요.');
 await withTenant(pool,provider,scope.tenantId,async db=>{await db.query('SELECT app_private.redrive_booking_notification($1,$2,$3,$4)',[scope.tenantId,scope.branchId,id,generation]);});
}
