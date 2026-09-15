import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISTANCE, rng } from './race.js';
import { fitGaitHeight } from './gait-height.js';
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
 return {position:new THREE.Vector3(x,.04,z),tangent:new THREE.Vector3(tx,0,tz),normal:new THREE.Vector3(-tz,0,tx)};
}
function box(sx,sy,sz,mat,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}
function beam(a,b,width,mat){const dir=b.clone().sub(a);const o=new THREE.Mesh(new THREE.CylinderGeometry(width,width,dir.length(),6),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());o.castShadow=true;return o;}
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
function mergeStatic(source){
 source.updateMatrixWorld(true);const batches=new Map(),result=new THREE.Group();
 source.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;const key=o.material.uuid;let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});batches.get(key).geometries.push(g);});
 for(const {material,geometries} of batches.values()){const o=new THREE.Mesh(mergeGeometries(geometries),material);o.name=material.name;o.castShadow=true;o.receiveShadow=true;result.add(o);}return result;
}
function muteGrass(mat){mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, 0.60);');};return mat;}

export class RacingScene {
 constructor(container,roster,onProgress){
  this.container=container;this.roster=roster;this.horses=[];this.cameraMode='auto';this.paddock=false;this.selected=1;this.ready=false;this.cameraInitialized=false;this.lastAuto='';
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#bdd4d9');this.scene.fog=new THREE.Fog('#c9d8cb',330,1050);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,window.innerWidth<700?1.5:1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;container.append(this.renderer.domElement);
  this.camera=new THREE.PerspectiveCamera(35,16/9,.1,1700);this.camera.position.set(70,10,125);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enabled=false;this.controls.minDistance=3.5;this.controls.maxDistance=35;this.controls.maxPolarAngle=Math.PI*.49;this.controls.enablePan=false;
  this.scene.add(new THREE.HemisphereLight('#dcecf6','#647446',1.25));
  this.sun=new THREE.DirectionalLight('#fff3d9',2.65);this.sun.position.set(-80,140,70);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-55,right:55,top:45,bottom:-45,near:1,far:430});this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.035;this.scene.add(this.sun,this.sun.target);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  this.loadPromise=this.load(onProgress);
 }
 resize(){const rect=this.container.getBoundingClientRect();if(rect.width<2||rect.height<2)return;this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix();this.renderer.setSize(rect.width,rect.height,false);}
 async load(onProgress){
  const manager=new THREE.LoadingManager();manager.onProgress=(url,n,total)=>onProgress?.(Math.round(n/total*85));
  const gltf=new GLTFLoader(manager);const textureLoader=new THREE.TextureLoader(manager);
  const [horse,rider,tree,grass,sky,font,crowd,leaf,ceremony]=await Promise.all([
   gltf.loadAsync(new URL("../public/assets/models/racehorse.glb",import.meta.url).href),gltf.loadAsync(new URL("../public/assets/models/jockey.glb",import.meta.url).href),gltf.loadAsync(new URL("../public/assets/models/pine-web.glb",import.meta.url).href),textureLoader.loadAsync(new URL("../public/assets/textures/turf.png",import.meta.url).href),new RGBELoader(manager).loadAsync(new URL("../public/assets/textures/sky.hdr",import.meta.url).href),new FontLoader(manager).loadAsync(new URL("../public/assets/fonts/helvetiker_regular.typeface.json",import.meta.url).href),gltf.loadAsync(new URL("../public/assets/models/spectator.glb",import.meta.url).href),textureLoader.loadAsync(new URL("../public/assets/textures/zelkova.png",import.meta.url).href),gltf.loadAsync(new URL("../public/assets/models/ceremony.glb",import.meta.url).href)
  ]);
  this.ceremonyAsset=ceremony;this.font=font;this.assetStats={horseAnimations:horse.animations.map(a=>a.name),horseMeshes:0};horse.scene.traverse(o=>{if(o.isMesh)this.assetStats.horseMeshes++;});
  sky.mapping=THREE.EquirectangularReflectionMapping;this.scene.environment=sky;this.scene.background=sky;this.scene.backgroundBlurriness=.075;this.scene.environmentIntensity=.42;this.scene.backgroundIntensity=.85;
  grass.colorSpace=THREE.SRGBColorSpace;grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
  this.buildCourse(grass);this.buildGrandstand(crowd.scene);this.buildTrees(tree.scene);this.buildLeafTrees(leaf);this.buildStartGate();this.buildSigns();
  const palette={bay:'#b99b84',black:'#4d4a49',chestnut:'#cba38b',darkbay:'#827365',grey:'#ece6db'};
  const riderTemplate=mergeStatic(rider.scene);
  for(const h of this.roster){
   const group=new THREE.Group();const body=clone(horse.scene);body.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;o.material=o.material.clone();if(o.material.name==='ManeAndTail')o.material.color.set(h.coat==='grey'?'#aaa79c':'#3e352d');if(o.material.name==='HorseCoat'){o.material.color.set(palette[h.coat]);o.material.roughness=.42;if(h.coat==='grey'){o.material.color.set('#ddd9ce');o.material.roughness=.6;o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722))) * 2.0;');};}}}});
   const jockey=clone(riderTemplate);jockey.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();if(o.material.name==='RacingSilk')o.material.color.set(h.color);}});
   group.add(body,jockey);
   const clothMat=new THREE.MeshStandardMaterial({color:'#f4ebd3',roughness:.8});
   for(const side of [-1,1]){
    const n=new THREE.Mesh(new TextGeometry(String(h.id),{font,size:.20,depth:.002,curveSegments:2}),clothMat);
    n.geometry.computeBoundingBox();const w=n.geometry.boundingBox.max.x;n.position.set(side*.374,1.38,side===1?.1-w/2:.1+w/2);n.rotation.y=side*Math.PI/2;group.add(n);
   }
   this.scene.add(group);const mixer=new THREE.AnimationMixer(body);const action=mixer.clipAction(horse.animations.find(a=>a.name==='Gallop'));const idleAction=mixer.clipAction(horse.animations.find(a=>a.name==='Idle'));idleAction.play();mixer.update(0);
   group.updateMatrixWorld(true);const probes=[];
   body.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;if(!indices)return;const byBone=new Map();
    for(let i=0;i<indices.count;i++)for(let k=0;k<4;k++){const bone=mesh.skeleton.bones[indices.getComponent(i,k)];if(weights.getComponent(i,k)<.65||!/^Bone_[LR]\.?00[25]$/.test(bone?.name??''))continue;const point=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);if(!byBone.has(bone.name))byBone.set(bone.name,[]);byBone.get(bone.name).push({i,y:point.y});}
    for(const values of byBone.values())for(const item of values.sort((a,b)=>a.y-b.y).slice(0,12))probes.push({mesh,index:item.i});
   });
   this.horses.push({id:h.id,group,body,jockey,mixer,action,idleAction,probes,standing:true,phase:h.id*.81});
  }
  // Calibrate once using the rendered hoof surface; all clones share the same rig.
  const h=this.horses[0],root=h.body.getObjectByName('HorseScale'),point=new THREE.Vector3(),heights=[];
  h.idleAction.stop();h.action.reset().play();
  for(let i=0;i<256;i++){
   const phase=i/256;h.action.time=phase*h.action.getClip().duration;h.mixer.update(0);h.group.updateMatrixWorld(true);
   for(const mesh of new Set(h.probes.map(p=>p.mesh)))mesh.skeleton.update();
   let floor=Infinity;for(const probe of h.probes){probe.mesh.getVertexPosition(probe.index,point).applyMatrix4(probe.mesh.matrixWorld);floor=Math.min(floor,point.y);}
   const air=phase>.72?.07*Math.sin(Math.PI*(phase-.72)/.28)**2:0;
   heights.push(root.position.y+.035+air-floor);
  }
  this.gaitHeight=fitGaitHeight(heights);
  h.action.stop();h.idleAction.reset().play();h.mixer.update(0);
  this.ready=true;onProgress?.(100);this.update(this.roster.map((h,i)=>({id:h.id,distance:0,lane:1.3+i*1.27,velocity:0})),0,0,false);this.render();
 }
 buildCourse(grass){
  const groundTex=grass.clone();groundTex.needsUpdate=true;groundTex.repeat.set(280,220);
  const groundMat=muteGrass(new THREE.MeshStandardMaterial({map:groundTex,color:'#aaa28a',roughness:1}));const ground=new THREE.Mesh(new THREE.PlaneGeometry(1800,1500),groundMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.07;this.scene.add(ground);
  const positions=[],uvs=[],colors=[],indices=[];const steps=600;
  for(let i=0;i<=steps;i++){
   for(const lane of [0,TRACK.width]){const p=coursePoint(i/steps*DISTANCE,lane).position;positions.push(p.x,0,p.z);uvs.push(p.x/2,p.z/2);const stripe=Math.floor(i/steps*TRACK_LENGTH/17)%2;const col=new THREE.Color(stripe?'#c7c9a1':'#b8c08e');colors.push(col.r,col.g,col.b);}
   if(i<steps){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const turf=new THREE.Mesh(geo,muteGrass(new THREE.MeshStandardMaterial({map:grass,vertexColors:true,roughness:.95,side:THREE.DoubleSide})));turf.receiveShadow=true;this.scene.add(turf);
  const railMat=new THREE.MeshStandardMaterial({color:'#eeeede',roughness:.45});const postMat=new THREE.MeshStandardMaterial({color:'#d2dfc5',roughness:.55});
  const dummy=new THREE.Object3D();const postCount=Math.floor(TRACK_LENGTH/4.0);const posts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.065,1.25,6),postMat,postCount*2);
  let k=0;
  for(const lane of [-.7,TRACK.width+.7]){
   const pts=[];for(let i=0;i<=steps;i++){const p=coursePoint(i/steps*DISTANCE,lane).position;p.y=1.25;pts.push(p);}
   const rail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),steps,.075,6,true),railMat);rail.castShadow=true;rail.receiveShadow=true;this.scene.add(rail);
   const lower=rail.clone();lower.position.y=-.48;this.scene.add(lower);
   for(let i=0;i<postCount;i++){const p=coursePoint(i/postCount*DISTANCE,lane).position;dummy.position.set(p.x,.60,p.z);dummy.rotation.set(0,0,0);dummy.updateMatrix();posts.setMatrixAt(k++,dummy.matrix);}
  }posts.castShadow=true;this.scene.add(posts);
  // Secondary dirt exercise course inside the turf rail.
  const sand=new THREE.MeshStandardMaterial({color:'#b7a17b',roughness:1});const sp=[],si=[];
  for(let i=0;i<=steps;i++){for(const lane of [-12,-5]){const p=coursePoint(i/steps*DISTANCE,lane).position;sp.push(p.x,-.025,p.z);}if(i<steps){let a=i*2;si.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));sg.setIndex(si);sg.computeVertexNormals();this.scene.add(new THREE.Mesh(sg,sand));
 }
 buildGrandstand(rider){
  const architecture=new THREE.Group();this.scene.add(architecture);
  const concrete=new THREE.MeshStandardMaterial({color:'#d5d5c8',roughness:.85});const roof=new THREE.MeshStandardMaterial({color:'#e7e7df',roughness:.5,metalness:.2});const steel=new THREE.MeshStandardMaterial({color:'#afb9b4',roughness:.4,metalness:.55});const glass=new THREE.MeshStandardMaterial({color:'#547975',metalness:.35,roughness:.16});
  const start=-125,z=TRACK.radius+43,length=255;
  architecture.add(box(length,7,24,concrete,2.5,3.5,z+23));architecture.add(box(length-3,6.2,.3,glass,2.5,10.3,z+11.4));
  for(let i=0;i<30;i++){
   architecture.add(box(length,.42,.96,concrete,2.5,.25+i*.43,z+i*.87));
  }
  const seatGeometry=new THREE.BoxGeometry(.48,.38,.48);const seats=new THREE.InstancedMesh(seatGeometry,new THREE.MeshStandardMaterial({color:'#548783',roughness:.75}),30*330);
  const d=new THREE.Object3D();let n=0;
  for(let row=0;row<30;row++)for(let col=0;col<330;col++){const x=start+col*.77;if(col%44<3){d.scale.set(0,0,0);}else{d.scale.set(1,1,1);}d.position.set(x,.55+row*.43,z+row*.87);d.updateMatrix();seats.setMatrixAt(n++,d.matrix);}
  seats.receiveShadow=true;architecture.add(seats);
  // Cantilever roof panels, steel trusses, glazing mullions and stair aisles.
  for(let i=0;i<=17;i++){
   const x=start+i*15;architecture.add(box(.4,23,.5,concrete,x,11.5,z+30));architecture.add(beam(v(x,23,z+30),v(x,19,z-5),.17,steel));architecture.add(beam(v(x,19,z+30),v(x,19,z-5),.10,steel));architecture.add(beam(v(x,21,z+11),v(x,19,z+2),.07,steel));architecture.add(box(.16,6.2,.3,steel,x,10.3,z+11.25));
   if(i<17){const panel=box(14.8,.25,37,roof,x+7.5,21,z+12.5);panel.rotation.x=-.09;architecture.add(panel);}
  }
  for(let i=0;i<70;i++)architecture.add(box(.07,6.2,.34,steel,start+i*3.65,10.3,z+11.1));
  const textMat=new THREE.MeshStandardMaterial({color:'#244938',roughness:.6});const text=new THREE.Mesh(new TextGeometry('T U R F   C L U B',{font:this.font,size:3.4,depth:.09,curveSegments:3}),textMat);text.position.set(-38,16,z+9.5);text.rotation.y=Math.PI; // Face racecourse (negative Z).
  text.geometry.translate(-85,0,0);architecture.add(text);
  // Real mesh fragments from the original rider form seated spectators at broadcast distance.
  rider.updateMatrixWorld(true);const parts=[];
  rider.traverse(o=>{if(o.isMesh){let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(!['position','normal'].includes(key))g.deleteAttribute(key);if(g.index)g=g.toNonIndexed();parts.push(g);}});
  const crowdGeo=mergeGeometries(parts);crowdGeo.translate(0,-1.1,0);
  const count=1300,crowd=new THREE.InstancedMesh(crowdGeo,new THREE.MeshStandardMaterial({color:'#e1d9c1',roughness:1}),count);const random=rng(812);const c=new THREE.Color();
  for(let i=0;i<count;i++){const row=Math.floor(random()*29),col=Math.floor(random()*327);d.position.set(start+col*.77,.48+row*.43,z+row*.87);d.rotation.set(0,Math.PI,0);const scale=.78+random()*.2;d.scale.setScalar(scale);d.updateMatrix();crowd.setMatrixAt(i,d.matrix);c.setHSL(.08+random()*.55,.1+random()*.3,.22+random()*.55);crowd.setColorAt(i,c);}crowd.receiveShadow=false;architecture.add(crowd);
  // Distant back-straight hospitality building.
  architecture.add(box(145,6,17,concrete,-50,3,-TRACK.radius-45));architecture.add(box(145,2.5,.15,glass,-50,6,-TRACK.radius-36.4));architecture.add(box(155,.25,24,roof,-50,7.4,-TRACK.radius-43));
  const merged=mergeStatic(architecture);for(const child of [...architecture.children])if(child.isMesh&&!child.isInstancedMesh)architecture.remove(child);architecture.add(merged);
 }
 buildTrees(source){
  source.updateMatrixWorld(true);const random=rng(734);const placements=[];
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;placements.push({x:Math.cos(a)*370,z:Math.sin(a)*245,s:.6+random()*.65,rotation:random()*6.28});}
  for(let i=0;i<12;i++)placements.push({x:-230+i*40,z:-157-random()*16,s:.55+random()*.4,rotation:random()*6.28});
  const d=new THREE.Object3D();source.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.computeBoundingBox();const center=g.boundingBox.getCenter(new THREE.Vector3());g.translate(-center.x,-g.boundingBox.min.y,-center.z);const material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();const mesh=new THREE.InstancedMesh(g,material,placements.length);for(let i=0;i<placements.length;i++){const p=placements[i];d.position.set(p.x,-.07,p.z);d.rotation.set(0,p.rotation,0);d.scale.setScalar(p.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);}mesh.castShadow=false;mesh.receiveShadow=false;this.scene.add(mesh);});
 }
 buildLeafTrees(texture){
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;const random=rng(491);this.leafPlacements=[];
  for(let i=0;i<130;i++){const a=i/130*Math.PI*2;this.leafPlacements.push({x:Math.cos(a)*(305+random()*30),z:Math.sin(a)*(182+random()*30),height:13+random()*11});}
  for(let i=0;i<36;i++)this.leafPlacements.push({x:-225+i*13,z:-123-random()*17,height:9+random()*8});
  this.leafMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,alphaTest:.45,side:THREE.DoubleSide,color:'#d3debf'}),this.leafPlacements.length);this.leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(this.leafMesh);this.leafDummy=new THREE.Object3D();
 }
 orientFoliage(){
  if(!this.leafMesh)return;
  for(let i=0;i<this.leafPlacements.length;i++){const p=this.leafPlacements[i],d=this.leafDummy;d.position.set(p.x,p.height*.48,p.z);d.scale.set(p.height*1.06,p.height,1);d.rotation.set(0,Math.atan2(this.camera.position.x-p.x,this.camera.position.z-p.z),0);d.updateMatrix();this.leafMesh.setMatrixAt(i,d.matrix);}this.leafMesh.instanceMatrix.needsUpdate=true;
 }
 buildStartGate(){
  const gate=new THREE.Group();const pos=coursePoint(0,0);gate.position.copy(pos.position);gate.rotation.y=Math.atan2(pos.tangent.x,pos.tangent.z);this.scene.add(gate);this.gate=gate;this.doors=[];
  const steel=new THREE.MeshStandardMaterial({color:'#a9c0b1',metalness:.65,roughness:.4}),dark=new THREE.MeshStandardMaterial({color:'#234d3e',roughness:.5}),roof=new THREE.MeshStandardMaterial({color:'#c7d5c2',roughness:.6});
  for(let i=0;i<13;i++){const x=-.6-i*1.27;gate.add(box(.07,3.05,3.6,steel,x,1.52,0));for(let k=0;k<5;k++)gate.add(box(.045,.035,3.6,steel,x,.65+k*.4,0));}
  gate.add(box(16.4,.16,4.0,roof,-8.2,3.1,0));gate.add(box(16.4,.65,.12,dark,-8.2,2.77,1.87));
  for(let i=0;i<12;i++){const x=-1.23-i*1.27;const plate=new THREE.Mesh(new TextGeometry(String(i+1),{font:this.font,size:.39,depth:.004,curveSegments:2}),new THREE.MeshStandardMaterial({color:'#f4ead2'}));plate.position.set(x-.13,2.6,1.95);gate.add(plate);
   const door=new THREE.Group();door.position.set(x-.57,0,1.8);for(let k=0;k<6;k++)door.add(box(.035,1.8,.035,steel,.09+k*.18,1.20,0));door.add(box(1.14,.065,.08,dark,.57,.42,0));door.add(box(1.14,.065,.08,dark,.57,2.1,0));gate.add(door);this.doors.push(door);
  }
 }
 text(text,size,color){return new THREE.Mesh(new TextGeometry(text,{font:this.font,size,depth:.015,curveSegments:2}),new THREE.MeshStandardMaterial({color,roughness:.6}));}
 buildSigns(){
  const white=new THREE.MeshStandardMaterial({color:'#edeedc',roughness:.6}),green=new THREE.MeshStandardMaterial({color:'#244b39',roughness:.6}),gold=new THREE.MeshStandardMaterial({color:'#b6a16c',metalness:.4,roughness:.4});
  const finish=coursePoint(0,-1.7).position;this.scene.add(box(.5,5,.5,white,finish.x,2.5,finish.z));this.scene.add(box(.12,4,.12,gold,finish.x+.3,2,finish.z));const sign=this.text('FINISH',.55,'#214d3a');sign.position.set(finish.x+.33,4.3,finish.z);sign.rotation.y=Math.PI/2;this.scene.add(sign);
  // Finish plane is a physical painted strip across the turf.
  this.scene.add(box(.09,.012,TRACK.width,white,finish.x,.035,TRACK.radius+TRACK.width/2));
  for(let distance=200;distance<DISTANCE;distance+=200){const p=coursePoint(DISTANCE-distance,-2).position;this.scene.add(box(.25,2.6,.25,white,p.x,1.3,p.z));const plate=box(2.7,.92,.11,distance===200?gold:green,p.x,2.65,p.z);const label=this.text(String(distance),.60,'#ffffff');label.position.set(p.x-1.1,2.45,p.z+.08);this.scene.add(plate,label);}
  const p=v(35,0,-24);this.scene.add(box(23,13,.8,green,p.x,10,p.z));this.scene.add(box(24,.7,1.2,gold,p.x,16.6,p.z));for(const x of [-8,8])this.scene.add(box(.9,6,1.1,green,p.x+x,3,p.z));
  for(const [text,size,y] of [['TURF CLUB',1.4,13.7],['AUTUMN MEETING',.8,11.2],['11R    2200M   TURF',.72,8.8]]){const label=this.text(text,size,'#e4e9cb');label.position.set(p.x-10,y,p.z+.43);this.scene.add(label);}
  const flowerMat=new THREE.MeshStandardMaterial({color:'#f4f0df'}); // Trackside ornamental edging uses full 3D planter geometry.
  this.scene.add(box(30,.5,1.5,white,78,.25,TRACK.radius-4));
  const hedge=new THREE.MeshStandardMaterial({color:'#4b7439',roughness:1});for(let i=0;i<30;i++)this.scene.add(box(.92,.65,1.2,hedge,63+i,.7,TRACK.radius-4));
 }
 setCamera(mode){this.cameraMode=mode;this.cameraInitialized=false;}
 setPaddock(enabled,id=1){this.paddock=enabled;this.selected=id;this.controls.enabled=enabled;this.cameraInitialized=false;if(enabled){const p=coursePoint(0,7).position;this.camera.position.copy(p).add(v(3.8,2.0,-5.2));this.controls.target.copy(p).add(v(0,1.1,0));this.controls.update();}}
 update(runners,time,dt,moving=true){
  if(!this.ready)return;
  this.currentRunners=runners;this.time=time;
  for(const h of this.horses){let r=runners.find(x=>x.id===h.id);if(!r)continue;if(this.paddock&&this.gaitPreview)r={...r,velocity:17,gaitPhase:time*.45};h.group.visible=!this.paddock||h.id===this.selected;const p=coursePoint(this.paddock?0:r.distance,this.paddock?7:r.lane);h.group.position.copy(p.position);if(!this.paddock)h.group.position.addScaledVector(p.tangent,-1.62);const heading=p.tangent.clone().multiplyScalar(Math.max(.1,r.velocity??0)*TRACK_LENGTH/DISTANCE).addScaledVector(p.normal,r.laneVelocity??0);h.group.rotation.y=Math.atan2(heading.x,heading.z);
   if(this.paddock&&!this.gaitPreview){if(!h.standing){h.mixer.stopAllAction();h.idleAction.reset().play();h.mixer.update(0);h.standing=true;}h.group.position.y+=Math.sin(time*.6)*.004;}
   else if((moving||this.paddock&&this.gaitPreview)&&r.velocity>.1){if(h.standing){h.idleAction.stop();h.action.reset().play();h.action.time=h.id*.081;h.standing=false;}h.action.paused=false;h.action.time=((r.gaitPhase??(time*1.7+h.id*.137))%1)*h.action.getClip().duration;h.mixer.update(0);const phase=(h.action.time/h.action.getClip().duration)*Math.PI*2;h.jockey.position.y=(h.body.getObjectByName('HorseScale')?.position.y??1.003)-1.003+.008*Math.sin(phase);h.jockey.rotation.x=.018*Math.sin(phase);}
   else {if(!h.standing){h.mixer.stopAllAction();h.idleAction.reset().play();h.mixer.update(0);h.standing=true;}h.jockey.position.y=0;h.jockey.rotation.x=0;}
  }
  // Move body, jockey and saddle numbers together on one smooth phase-based path.
  // No history-dependent damping: photo finish and backwards replay remain deterministic.
  for(const h of this.horses){if(h.standing){for(const child of h.group.children)if(child!==h.body&&child!==h.jockey)child.position.y=1.38;continue;}const root=h.body.getObjectByName('HorseScale');const phase=h.action.time/h.action.getClip().duration;const height=this.gaitHeight(phase);root.position.y=height;h.group.position.y=0;h.jockey.position.y=height-1.003+.008*Math.sin(phase*Math.PI*2);for(const child of h.group.children)if(child!==h.body&&child!==h.jockey)child.position.y=1.38+height-1.003;}
  this.gate.visible=!this.paddock&&time<13;for(const d of this.doors)d.rotation.y=-Math.min(1,time*2.3)*Math.PI*.83;
  const ranking=[...runners].sort((a,b)=>b.distance-a.distance);const lead=ranking[0];if(!lead)return;
  const target=coursePoint(lead.distance,lead.lane).position;this.sun.position.copy(target).add(v(-70,120,55));this.sun.target.position.copy(target);
  if(this.paddock){this.controls.update();this.activeCamera='PADDOCK · 360°';return;}
  let shot=this.cameraMode;
  if(shot==='auto')shot= time<8?'start':lead.distance>DISTANCE-150?'finish':lead.distance>DISTANCE-500?'side':Math.floor(time/13)%3===1?'aerial':Math.floor(time/13)%3===2?'close':'side';
  if(shot!==this.lastAuto){this.cameraInitialized=false;this.lastAuto=shot;}
  let aim,position,fov=32;const p=coursePoint(lead.distance,lead.lane);const T=p.tangent,N=p.normal;
  if(shot==='start') {aim=coursePoint(lead.distance,8).position.add(v(0,1,0));position=aim.clone().addScaledVector(T,21).addScaledVector(N,24).add(v(0,12,0));fov=39;}
  else if(shot==='aerial'){const average=ranking.slice(0,8).reduce((s,h)=>s+h.distance,0)/Math.min(8,ranking.length);aim=coursePoint(average,6).position;position=aim.clone().addScaledVector(N,22).addScaledVector(T,-18).add(v(0,55,0));fov=45;}
  else if(shot==='follow'){const h=runners.find(h=>h.id===this.selected)||lead;const q=coursePoint(h.distance,h.lane);aim=q.position.clone().addScaledVector(q.tangent,18).add(v(0,1.8,0));position=q.position.clone().addScaledVector(q.tangent,-3.5).add(v(0,2.9,0));fov=56;}
  else if(shot==='finish'){
   // Remain useful if the viewer chooses the finish camera early: a long-lens trackside shot until the final straight.
   if(lead.distance<DISTANCE-250){aim=p.position.clone().add(v(0,1.1,0));position=aim.clone().addScaledVector(N,42).addScaledVector(T,25).add(v(0,5.5,0));fov=23;}
   else{const fp=coursePoint(0,9);aim=p.position.clone().add(v(0,1.05,0));position=fp.position.clone().addScaledVector(fp.normal,27).add(v(0,5.3,0));const dist=position.distanceTo(aim);fov=THREE.MathUtils.clamp(2*Math.atan(8/dist)*180/Math.PI,15,35);}
  }
  else {const spread=Math.min(30,(ranking[0].distance-ranking[Math.min(5,ranking.length-1)].distance)*TRACK_LENGTH/DISTANCE);const center=lead.distance-(shot==='close'?4:spread*.4);const q=coursePoint(center,6);aim=q.position.clone().add(v(0,1.2,0));position=aim.clone().addScaledVector(q.normal,shot==='close'?17:28).addScaledVector(q.tangent,shot==='close'?9:4).add(v(0,shot==='close'?2.7:4.8,0));fov=shot==='close'?28:33;}
  const smoothing=this.cameraInitialized?1-Math.exp(-dt*4):1;this.camera.position.lerp(position,smoothing);this.lookAt??=aim.clone();this.lookAt.lerp(aim,smoothing);this.camera.lookAt(this.lookAt);this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,smoothing);this.camera.updateProjectionMatrix();this.cameraInitialized=true;
  this.activeCamera={start:'CAM 01 · STARTING GATE',side:'CAM 02 · TRACKSIDE',aerial:'CAM 03 · AERIAL',close:'CAM 04 · TELEPHOTO',follow:'CAM 05 · JOCKEY VIEW',finish:'CAM 06 · FINISH LINE'}[shot];
 }
 finishPhoto(race,time){
  const oldRunners=this.currentRunners,oldTime=this.time;this.update(race.sample(time),time,0,true);
  const width=1200,height=600,original=this.renderer.getSize(new THREE.Vector2()),ratio=this.renderer.getPixelRatio();
  const fp=coursePoint(0,11).position;const camera=new THREE.OrthographicCamera(-13,13,6.5,-6.5,.1,300);
  camera.position.set(fp.x,5.8,TRACK.radius+TRACK.width+8);camera.lookAt(fp.x,1,fp.z);camera.updateMatrixWorld();
  // Fixed optical axis exactly on the finish plane; a projected vertical line marks it.
  this.renderer.setPixelRatio(1);this.renderer.setSize(width,height,false);this.renderer.render(this.scene,camera);const image=this.renderer.domElement.toDataURL('image/png');this.renderer.setPixelRatio(ratio);this.renderer.setSize(original.x,original.y,false);this.update(oldRunners,oldTime,0,true);this.cameraInitialized=false;return image;
 }
 mountCeremony(container,winner){
  if(!this.awardRenderer){this.awardRenderer=new THREE.WebGLRenderer({antialias:true});this.awardRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.awardRenderer.outputColorSpace=THREE.SRGBColorSpace;this.awardRenderer.toneMapping=THREE.ACESFilmicToneMapping;this.awardRenderer.toneMappingExposure=1.15;}
  container.prepend(this.awardRenderer.domElement);this.awardContainer=container;
  this.awardScene=new THREE.Scene();this.awardScene.background=new THREE.Color('#17382e');this.awardScene.environment=this.scene.environment;this.awardScene.environmentIntensity=.65;
  this.awardScene.add(new THREE.HemisphereLight('#fff5dd','#36553e',2));const light=new THREE.DirectionalLight('#ffe9b0',3);light.position.set(-3,6,4);this.awardScene.add(light);const fill=new THREE.DirectionalLight('#d7eaff',2);fill.position.set(4,3,-3);this.awardScene.add(fill);
  const stage=clone(this.ceremonyAsset.scene);stage.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name==='RacingSilk')o.material.color.set(winner.color);}});this.awardScene.add(stage);const title=this.text('CHAMPION',.34,'#d9bb71');title.position.set(-1.4,2.9,-1.57);this.awardScene.add(title);
  this.awardMixer=new THREE.AnimationMixer(stage);for(const clip of this.ceremonyAsset.animations){const a=this.awardMixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();}this.awardMixer.setTime(0);
  const horse=clone(this.horses.find(h=>h.id===winner.id).body);horse.position.set(-2.1,.02,.6);horse.rotation.y=.85;this.awardScene.add(horse);const hm=new THREE.AnimationMixer(horse);hm.clipAction(this.horses[0].idleAction.getClip()).play();hm.update(0);
  for(const [rank,x,y] of [['2',-1.6,.25],['1',0,.48],['3',1.6,.14]]){const t=this.text(rank,.23,'#e7cd83');t.position.set(x-.075,y,.765);this.awardScene.add(t);}
  this.awardCamera=new THREE.PerspectiveCamera(35,1,.1,100);this.awardCamera.position.set(2.7,2.8,7.2);this.awardCamera.lookAt(-.5,1.35,0);
 }
 drawCeremony(time){if(!this.awardContainer?.isConnected)return;const {width,height}=this.awardContainer.getBoundingClientRect();this.awardRenderer.setSize(width,height,false);this.awardCamera.aspect=width/height;this.awardCamera.position.set(width<600?1.8:2.7,2.8,width<600?10:7.2);this.awardCamera.lookAt(-.5,1.4,0);this.awardCamera.updateProjectionMatrix();this.awardMixer.setTime(Math.min(time,2.66));this.awardRenderer.render(this.awardScene,this.awardCamera);}
 ceremonyPhoto(){this.drawCeremony(2.66);return this.awardRenderer.domElement.toDataURL('image/png');}
 projectHorse(id){const h=this.horses.find(h=>h.id===id);if(!h||!h.group.visible)return null;const p=h.group.position.clone().add(v(0,2.8,0));const view=p.clone().applyMatrix4(this.camera.matrixWorldInverse);if(view.z>0)return null;p.project(this.camera);if(p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1)return null;return {x:(p.x*.5+.5)*100,y:(-.5*p.y+.5)*100};}
 render(){this.orientFoliage();this.renderer.render(this.scene,this.camera);}
}
