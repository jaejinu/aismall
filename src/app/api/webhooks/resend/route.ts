import {handleDeliveryWebhook,getWebhookPool,saveDeliveryEvent} from '@/server/notifications/webhook';
export const runtime='nodejs';
export async function POST(request:Request) {
 return handleDeliveryWebhook(request,{enabled:process.env.NOTIFICATION_WEBHOOK_ENABLED==='true',secret:process.env.RESEND_WEBHOOK_SECRET},event=>saveDeliveryEvent(getWebhookPool(),event));
}
