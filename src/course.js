import {DISTANCE} from './race.js';
export const TRACK={straight:145,radius:78,width:22};
export const TRACK_LENGTH=TRACK.straight*4+Math.PI*2*TRACK.radius;
// Clockwise oval. Final straight runs left-to-right, the finish post is shared with the starting position.
export function coursePoint(distance,lane=0){
 const H=TRACK.straight,R=TRACK.radius;
 const s=((distance/DISTANCE*TRACK_LENGTH+H+80)%TRACK_LENGTH+TRACK_LENGTH)%TRACK_LENGTH;
 let x,z,tx,tz;
 if(s<2*H){x=-H+s;z=R+lane;tx=1;tz=0;}
 else if(s<2*H+Math.PI*R){const a=(s-2*H)/R;x=H+Math.sin(a)*(R+lane);z=Math.cos(a)*(R+lane);tx=Math.cos(a);tz=-Math.sin(a);}
 else if(s<4*H+Math.PI*R){x=H-(s-2*H-Math.PI*R);z=-R-lane;tx=-1;tz=0;}
 else {const a=(s-4*H-Math.PI*R)/R;x=-H-Math.sin(a)*(R+lane);z=-Math.cos(a)*(R+lane);tx=-Math.cos(a);tz=Math.sin(a);}
 return {position:{x,y:.04,z},tangent:{x:tx,y:0,z:tz},normal:{x:-tz,y:0,z:tx}};
}
