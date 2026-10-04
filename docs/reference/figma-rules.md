# Figma 작업 공통 규칙 (fileKey JVxCGWm8ui8dTj72PcdX9G)
상태 원장: docs/reference/figma-ledger.json (page/component/screen IDs + notes) — 먼저 읽기.

## 규칙
- use_figma 호출은 절대 병렬 금지(순차). 한 호출에서 setCurrentPageAsync 1회.
- skillNames: "figma-use,figma-generate-design".
- 모든 fill/stroke는 Color 변수에 바인딩(하드코딩 금지). 텍스트는 텍스트 스타일 적용.
- 간격·패딩 값은 토큰 값만: 0,2,4,8,12,16,20,24,32,40,48 (10·14 같은 값은 바인딩 실패 → 0이 됨).
- 반경 토큰: 4,6,8,12,16,9999.
- resize()는 sizing mode를 FIXED로 바꿈 → 이후 AUTO/HUG 다시 지정.
- findAll(TEXT)로 셀 안 텍스트를 찾을 때 인스턴스(배지) 내부 텍스트가 섞임 → 인스턴스 하위 제외 후 인덱싱.
- 배경 막(Scrim)은 color/overlay/scrim + 노드 opacity 0.4.
- 클론하면 reactions·flow start가 따라옴 → 필요 시 setReactionsAsync([]) 후 다시 연결, 마지막에 page.flowStartingPoints 명시적으로 지정.
- 페르소나: 재진필라테스, 강남점·홍대점·마포점, 최고관리자 이미래, 강남점 오너 홍지수, 매니저 김민준·이유나, 직원 박준서·최서연·오태양(강사), 회원 김하늘·정다은·이수연·홍서준·윤서아·강도윤. 기준일 2026-10-14(수), 기준 데이터 docs/reference/canonical-data.md.
- 문구: 짧은 해요체. 한국어 표시명(오늘·문의함·승인함·활동 기록·지켜보기 모드 등). 이용권 문구 쓰지 않음(v1 제외).
- 화면 하나 만든 뒤 get_screenshot으로 확인(잘림·겹침·빈칸), 마지막에 토큰 미연결/스타일 없는 텍스트 감사.

## 주요 컴포넌트 ID
Button 5:130 (Label, Style Primary|Secondary|Ghost|Danger, Size Md|Sm, State Default|Disabled), Actor Badge 6:39 (Actor Human|AI|Automation|System|External App), Risk Badge 6:56 (Tier Low|Medium|High|Critical), Status Chip 6:95 (Pending|Confirmed|Expired|Superseded|Partially Failed|Blocked|Flagged), AI Label 7:33, Result Block 8:112 (Outcome), Simulation Banner 8:169, Approval Card 9:384, Nav Item 10:117, Tab Item 10:132, Schedule Row 11:2, Briefing Item 11:18, Approval Queue Row 13:325, Filter Chip 17:516, Session Card 19:109, Day Chip 19:116, Chat Bubble 19:135, Text Field 50:31, Checkbox 50:39, Radio 50:50, Toggle 50:55, Step 50:68. Icons: Info 3:74, Clock 3:91, CheckCircle 3:53, XCircle 3:60, AlertTriangle 3:67, Shield 3:47, Bell 10:68, Calendar 10:25, ArrowRight 3:80.
기존 모바일 화면(Screens / Member 21:2): Schedule 21:3, My Bookings 21:220, AI Assistant 21:365, Booking Sheet 22:234, Change Failed 22:324. Test A(17:2): Push(C) 18:345, Card A 18:361, Card B 18:523, Card C 18:639, Executing 18:739, Result Partial 18:845, Result Success 18:915.

## 헬퍼(각 호출에 그대로 붙여 쓰기)
```js
const V={};for(const v of await figma.variables.getLocalVariablesAsync())V[v.name]=v;
const TS={};for(const s of await figma.getLocalTextStylesAsync())TS[s.name]=s;
await Promise.all([...new Set(Object.values(TS).map(s=>JSON.stringify(s.fontName)))].map(f=>figma.loadFontAsync(JSON.parse(f))));
const SP={0:"spacing/none",2:"spacing/2xs",4:"spacing/xs",8:"spacing/sm",12:"spacing/md",16:"spacing/lg",20:"spacing/xl",24:"spacing/2xl",32:"spacing/3xl",40:"spacing/4xl",48:"spacing/5xl"};
const RA={4:"radius/sm",6:"radius/md",8:"radius/lg",12:"radius/xl",16:"radius/2xl",9999:"radius/full"};
const P=n=>figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:0,g:0,b:0}},"color",V[n]);
function F(parent,dir,o={}){const f=figma.createAutoLayout(dir);f.name=o.name||"frame";f.fills=o.fill?[P(o.fill)]:[];if(o.stroke){f.strokes=[P(o.stroke)];f.strokeWeight=1;f.strokeAlign="INSIDE";}
 if(o.gap!=null)f.setBoundVariable("itemSpacing",V[SP[o.gap]]);
 if(o.pad!=null){const a=Array.isArray(o.pad)?o.pad:[o.pad,o.pad,o.pad,o.pad];["paddingTop","paddingRight","paddingBottom","paddingLeft"].forEach((k,i)=>f.setBoundVariable(k,V[SP[a[i]]]));}
 if(o.r!=null)["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"].forEach(k=>f.setBoundVariable(k,V[RA[o.r]]));
 if(o.align)f.counterAxisAlignItems=o.align;if(o.justify)f.primaryAxisAlignItems=o.justify;
 if(parent){parent.appendChild(f);if(o.w==="FILL")f.layoutSizingHorizontal="FILL";else if(typeof o.w==="number"){f.resize(o.w,f.height);f.layoutSizingHorizontal="FIXED";}}
 return f;}
function T(parent,s,style="Body/Md",color="color/text/primary",o={}){const t=figma.createText();t.textStyleId=TS[style].id;t.characters=s;t.fills=[P(color)];t.name=o.name||s.slice(0,30);parent.appendChild(t);if(o.fill){t.layoutSizingHorizontal="FILL";t.textAutoResize="HEIGHT";}return t;}
const C={};for(const [k,id] of Object.entries({btn:"5:130",risk:"6:56",actor:"6:39",status:"6:95",ai:"7:33",tf:"50:31",cb:"50:39",radio:"50:50",tg:"50:55"}))C[k]=await figma.getNodeByIdAsync(id);
function I(parent,key,variant,props={}){const set=C[key];const comp=set.type==="COMPONENT"?set:(set.children.find(c=>Object.entries(variant).every(([k,v])=>c.name.split(", ").includes(k+"="+v)))||set.defaultVariant);const i=comp.createInstance();parent.appendChild(i);const defs=set.componentPropertyDefinitions;const pp={};for(const [k,v] of Object.entries(props)){const kk=Object.keys(defs).find(d=>d.split("#")[0]===k);if(kk)pp[kk]=v;}if(Object.keys(pp).length)i.setProperties(pp);return i;}
const tone={neutral:["color/status/neutral/bg","color/status/neutral/fg"],info:["color/status/info/bg","color/status/info/fg"],success:["color/status/success/bg","color/status/success/fg"],warning:["color/status/warning/bg","color/status/warning/fg"],danger:["color/status/danger/bg","color/status/danger/fg"]};
function chip(parent,s,t="neutral"){const c=F(parent,"HORIZONTAL",{name:"chip",fill:tone[t][0],r:9999,pad:[2,8,2,8]});T(c,s,"Label/Sm",tone[t][1]);return c;}
```
모바일 프레임: 390×844, bg color/bg/canvas, 상단 상태바 영역 + 내용(pad 16) + 하단 탭(홈·수업·내 예약·AI 도우미·내 정보, Tab Item 10:132).
