import {coursePoint} from './scene.js';
// Match the CSS stadium's centre line in pixels, including its circular end caps.
export function mapPosition(distance,lane,width,height){
 const radius=(height-52)/2-7,straight=(width-30)/2-7-radius;
 const p=coursePoint(distance,0).position,center=Math.min(145,Math.abs(p.x))*Math.sign(p.x),offset=(lane-11)/22*10;
 return {x:width/2+center/145*straight+(p.x-center)/78*(radius+offset),y:height/2+p.z/78*(radius+offset)};
}
