"""Original trophy presentation GLB with a keyframed, two-hand cup lift."""
from pathlib import Path
src=Path(__file__).with_name('prepare-rider.py').read_text();exec(src[:src.index('# Continuous tailored torso')])
gold=mat('ChampionshipGold',(.83,.56,.17),.22);gold.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.85
podium=mat('PodiumGreen',(.025,.12,.085),.52)
for x,z in [(-1.6,.42),(0,.72),(1.6,.27)]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,0,z/2));o=bpy.context.object;o.name='Podium';o.scale=(1.5,1.5,z);o.data.materials.append(podium);be=o.modifiers.new('Soft edges','BEVEL');be.width=.035;be.segments=3
# A raised presentation floor and framed backdrop make a complete award stage.
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=4.1,depth=.12,location=(0,0,-.065));o=bpy.context.object;o.name='PresentationFloor';o.data.materials.append(podium)
for x in [-3.6,3.6]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,1.6,1.65));o=bpy.context.object;o.name='GoldStageTrim';o.scale=(.045,.04,3.3);o.data.materials.append(gold)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,1.65,1.65));o=bpy.context.object;o.name='AwardBackdrop';o.scale=(7.6,.08,3.4);o.data.materials.append(podium)
base=.72
ellipsoid('Pelvis',(0,0,base+.79),(.19,.13,.13),white)
ellipsoid('Neck',(0,0,base+1.39),(.067,.065,.11),skin)
# Upright champion, tailored jersey, riding boots and helmet.
tube('ChampionJersey',[((0,0,base+.70),.17,.12),((0,0,base+1.02),.20,.13),((0,0,base+1.28),.235,.12),((0,0,base+1.34),.16,.10)],silk,24)
tube('Collar',[((0,0,base+1.31),.08,.07),((0,0,base+1.40),.07,.065)],white)
ellipsoid('Head',(0,-.01,base+1.53),(.105,.10,.135),skin);ellipsoid('Nose',(0,-.11,base+1.52),(.027,.03,.026),skin)
ellipsoid('Helmet',(0,0,base+1.62),(.13,.125,.09),silk);ellipsoid('Visor',(0,-.11,base+1.61),(.13,.09,.012),leather)
for side in [-1,1]:
 ellipsoid('Knee',(side*.13,0,base+.40),(.073,.067,.095),white)
 tube('Breeches',[((side*.10,0,base+.87),.112,.115),((side*.12,0,base+.60),.086,.09),((side*.13,0,base+.33),.075,.07)],white)
 tube('Boot',[((side*.13,0,base+.49),.078,.07),((side*.13,0,base+.07),.06,.06)],leather)
 ellipsoid('BootToe',(side*.13,-.065,base+.055),(.069,.145,.055),leather)
def segment(name,r,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=12);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def move_segment(o,a,b,r,f):
 a,b=Vector(a),Vector(b);o.location=(a+b)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');o.scale=(r,r,(b-a).length/2+r*.5)
 for prop in ['location','rotation_quaternion','scale']:o.keyframe_insert(prop,frame=f)
arms=[(side,segment('UpperSleeve',.072,silk),segment('ForeSleeve',.055,silk),ellipsoid('Glove',(0,0,0),(.055,.055,.055),leather)) for side in [-1,1]]
cup=bpy.data.objects.new('TrophyLift',None);bpy.context.collection.objects.link(cup)
profile=[(.15,0),(.16,.04),(.09,.08),(.045,.11),(.045,.30),(.12,.34),(.19,.42),(.23,.56),(.23,.60),(.21,.60),(.20,.55),(.16,.43),(.07,.37)]
verts=[(r*math.cos(j*math.tau/48),r*math.sin(j*math.tau/48),z) for r,z in profile for j in range(48)]
faces=[(i*48+j,i*48+(j+1)%48,(i+1)*48+(j+1)%48,(i+1)*48+j) for i in range(len(profile)-1) for j in range(48)]
bowl=mesh('GoldCup',verts,faces,gold);bowl.parent=cup
for side in [-1,1]:
 o=strap('CupHandle',[(side*.18,0,.53),(side*.34,0,.57),(side*.35,0,.38),(side*.12,0,.31)],.025,gold);o.parent=cup
for f in range(1,82,4):
 t=min(1,(f-1)/72);e=t*t*(3-2*t);z=base+.82+e*1.06;y=-.34+e*.22
 cup.location=(0,y,z);cup.keyframe_insert('location',frame=f)
 for side,upper,fore,hand in arms:
  shoulder=(side*.19,0,base+1.29);wrist=(side*.31,y,z+.36);elbow=(side*(.38+.02*e),-.12,base+1.02+e*.76)
  move_segment(upper,shoulder,elbow,.073,f);move_segment(fore,elbow,wrist,.054,f);hand.location=wrist;hand.keyframe_insert('location',frame=f)
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=81;bpy.context.scene.render.fps=30;bpy.context.scene.frame_set(1)
for o in bpy.data.objects:
 if o.animation_data and o.animation_data.action:o.animation_data.action.name=o.name+'Raise'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/source/ceremony.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/models/ceremony.glb'),export_format='GLB',export_apply=True,export_animations=True,export_animation_mode='SCENE',export_image_format='JPEG',export_jpeg_quality=80)
