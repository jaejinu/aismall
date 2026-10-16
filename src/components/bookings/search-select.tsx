'use client';
import {useId,useState,useTransition} from 'react';
import {findBookingChoices} from '@/app/workspace/booking-actions';
import type {BookingChoice,BookingScope} from '@/server/services/bookings';
import {Button} from '@/components/ui/button';
const field='mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-body-md';
export function SearchSelect({scope,kind,name,label,initial=[],programId,excludeId}:{scope:BookingScope;kind:'customer'|'program'|'session';name:string;label:string;initial?:BookingChoice[];programId?:string;excludeId?:string}) {
 const inputId=useId(),selectId=useId();
 const [query,setQuery]=useState(''),[items,setItems]=useState(initial.slice(0,50)),[selected,setSelected]=useState<BookingChoice|null>(null);
 const [message,setMessage]=useState('이름으로 검색해 주세요. 회차는 날짜(2026-10-22)로도 검색할 수 있어요.');
 const [pending,start]=useTransition();
 function search(){start(async()=>{const result=await findBookingChoices(scope,kind,query,programId);setItems(result.items);setMessage(result.error??(result.hasMore?'검색 결과가 50건보다 많아요. 검색어를 구체적으로 입력해 주세요.':result.items.length?'검색 결과에서 항목을 선택해 주세요.':'검색 결과가 없어요.'));});}
 const options=items.filter(i=>i.id!==excludeId);
 if(selected&&!options.some(i=>i.id===selected.id))options.unshift(selected);
 return <div className="space-y-2">
  <label htmlFor={inputId} className="block text-label-sm">{label} 검색</label>
  <div className="flex gap-2"><input id={inputId} className={field} type="search" value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(!pending)search();}}}/><Button type="button" disabled={pending} onClick={search}>{pending?'검색 중…':'검색'}</Button></div>
  <label htmlFor={selectId} className="block text-label-sm">{label}</label>
  <select id={selectId} name={name} className={field} required value={selected?.id??''} onChange={e=>setSelected(options.find(o=>o.id===e.target.value)??null)}>
   <option value="" disabled>검색 결과에서 선택해 주세요</option>{options.map(o=><option key={o.id} value={o.id} disabled={o.disabled}>{o.label}</option>)}
  </select><p role="status" className="text-caption text-fg-muted">{message}</p>
 </div>;
}
