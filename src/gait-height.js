// A periodic low-frequency body path avoids snapping when the supporting hoof changes.
export function fitGaitHeight(samples){
 const n=samples.length,mean=samples.reduce((a,b)=>a+b,0)/n;
 const harmonics=[1,2].map(k=>({k,c:2/n*samples.reduce((s,y,i)=>s+y*Math.cos(i/n*Math.PI*2*k),0),s:2/n*samples.reduce((s,y,i)=>s+y*Math.sin(i/n*Math.PI*2*k),0)}));
 const base=p=>mean+harmonics.reduce((y,h)=>y+h.c*Math.cos(p*Math.PI*2*h.k)+h.s*Math.sin(p*Math.PI*2*h.k),0);
 // A constant clearance preserves smoothness; never clamp height per frame.
 const clearance=Math.max(...samples.map((y,i)=>y-base(i/n)));
 return phase=>base(phase)+clearance;
}
