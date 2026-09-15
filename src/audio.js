// Actual field recording: Joseph Sardin, BigSoundBank #1850, CC0.
// Continuous ambience preserves the recorded gallop rhythm; it is not per-hoof Foley.
export class RaceAudio {
 constructor(){this.enabled=false;this.source=null;}
 async toggle(){
  if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);}
  await this.ctx.resume();
  if(!this.buffer){const response=await fetch(new URL("../public/assets/audio/horse-grass.mp3",import.meta.url).href);if(!response.ok)throw new Error('草地疾馳錄音載入失敗');this.buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());}
  this.enabled=!this.enabled;if(!this.enabled)this.silence();return this.enabled;
 }
 silence(){
  if(!this.ctx||!this.source)return;
  const now=this.ctx.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setTargetAtTime(0,now,.025);
  this.source.stop(now+.15);this.source=null;
 }
 update(dt,running,progress,speed,runners=[]){
  if(!this.ctx||!this.enabled||!this.buffer)return;
  if(!running||!runners.some(h=>h.velocity>1)){this.silence();return;}
  if(!this.source){const source=this.ctx.createBufferSource();source.buffer=this.buffer;source.loop=true;source.connect(this.master);source.start();this.source=source;}
  // Keep natural pitch even at fast-forward simulation speeds.
  this.master.gain.setTargetAtTime(.8,this.ctx.currentTime,.12);
 }
 bell(){}
}
