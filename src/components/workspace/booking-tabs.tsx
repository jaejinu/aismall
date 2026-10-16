'use client';
import {useState, type ReactNode} from 'react';
import {Bell,CalendarDays,ClipboardList,Inbox,Plus,Settings2} from 'lucide-react';
import {cn} from '@/lib/cn';
const icons:Record<string,typeof Bell>={reservations:ClipboardList,pending:Inbox,sessions:CalendarDays,create:Plus,notifications:Bell,settings:Settings2};
export function BookingTabs({items}:{items:{id:string;label:string;content:ReactNode}[]}) {
 const [active,setActive]=useState(items[0].id);
 return <><nav aria-label="예약 업무" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">{items.map(i=>{const Icon=icons[i.id]??ClipboardList;return <button key={i.id} type="button" aria-pressed={active===i.id} onClick={()=>setActive(i.id)} className={cn('flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-label-sm transition-colors sm:px-4',active===i.id?'border-primary text-fg':'border-transparent text-fg-muted hover:bg-subtle hover:text-fg')}><Icon size={16} aria-hidden/>{i.label}</button>;})}</nav>{items.map(i=><section key={i.id} aria-label={i.label} hidden={active!==i.id}>{i.content}</section>)}</>;
}
