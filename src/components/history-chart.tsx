"use client";
import { useState } from "react";

type Point={label:string;correct:number;scored:number;href:string;position:number};
export function HistoryChart({points,title}:{points:Point[];title:string}) {
 const [focused,setFocused]=useState<number|null>(null);
 const selected=focused===null?null:points[focused];
 const min=Math.min(...points.map(p=>p.position)),max=Math.max(...points.map(p=>p.position));
 const x=(p:Point)=>max===min?360:65+(p.position-min)/(max-min)*620;
 const y=(p:Point)=>220-180*p.correct/p.scored;
 return <section className="card history-chart"><h2>{title}</h2><p className="muted">Correct picks as a percentage of scored picks. Select a point to see the saved picks. Missing periods appear as gaps.</p>
  <p className="history-scroll-hint muted">Swipe across the chart to explore all periods.</p>
  <div className="history-plot"><svg viewBox="0 0 740 270" role="group" aria-label={title}>
   {[0,25,50,75,100].map(n=><g key={n}><line x1="65" x2="685" y1={220-1.8*n} y2={220-1.8*n} stroke="var(--line)"/><text x="52" y={225-1.8*n} textAnchor="end" fontSize="12" fill="currentColor">{n}%</text></g>)}
   {points.map((p,i)=>i>0&&p.position===points[i-1].position+1&&<line key={p.label} x1={x(points[i-1])} y1={y(points[i-1])} x2={x(p)} y2={y(p)} stroke="var(--blue)" strokeWidth="3" pointerEvents="none"/>)}
   {points.map((p,i)=><g key={p.label}>
    <a href={p.href} aria-label={`${p.label}: ${p.correct} of ${p.scored} correct, ${(100*p.correct/p.scored).toFixed(1)} percent. View picks.`} onFocus={()=>setFocused(i)} onBlur={()=>setFocused(null)} onMouseEnter={()=>setFocused(i)} onMouseLeave={()=>setFocused(null)}>
     <circle cx={x(p)} cy={y(p)} r="10" fill="transparent"/>
     <circle cx={x(p)} cy={y(p)} r={focused===i?7:5} fill="var(--blue)" stroke="white" strokeWidth="2"/>
     <title>{p.label}: {p.correct}/{p.scored} ({(100*p.correct/p.scored).toFixed(1)}%)</title>
    </a>
    {(points.length<=10||i%2===0||i===points.length-1)&&<text x={x(p)} y="248" textAnchor="middle" fontSize="12" fill="currentColor">{p.label}</text>}
   </g>)}
  </svg></div>
  <p className="history-chart-detail" aria-live="polite">{selected?`${selected.label}: ${selected.correct} of ${selected.scored} correct (${(100*selected.correct/selected.scored).toFixed(1)}%)`:"Hover or focus a point for details. The same figures are available in the table below."}</p>
 </section>;
}
