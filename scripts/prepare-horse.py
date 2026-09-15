"""Convert the CC0 Lyndon Daniels / ChadM horse, repair attachments and author a gallop."""
import bpy,math
from pathlib import Path
from mathutils import Vector,Quaternion
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/riggedHorse.blend'))
for o in list(bpy.data.objects):
 if o.type not in {'MESH','ARMATURE'}:bpy.data.objects.remove(o,do_unlink=True)
arm=bpy.data.objects['Armature'];arm.name='ThoroughbredRig'
for b in arm.pose.bones:
 for c in list(b.constraints):b.constraints.remove(c)
for im in bpy.data.images:
 if im.size[0] and im.name!='Render Result':
  im.filepath_raw=str(ROOT/'assets/source/textures'/ (im.name.replace('.001','').replace('.bmp','.png').replace('.p','.png') if im.name.endswith('.p') else im.name.replace('.bmp.001','.png')))
  im.file_format='PNG';im.save()
def material(name,diff,norm=None,rough=.5):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=rough
 t=n.new('ShaderNodeTexImage');t.image=bpy.data.images[diff];l.new(t.outputs['Color'],p.inputs['Base Color'])
 if norm:
  t=n.new('ShaderNodeTexImage');t.image=bpy.data.images[norm];t.image.colorspace_settings.name='Non-Color';nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55;l.new(t.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
 return m
coat=material('HorseCoat','HorseMain4k00.png','HorseMain4k00Norm00.p',.42)
hair=material('ManeAndTail','Hair12Main2k.png','Hair12Main2kNorm.png',.6)
eye=material('Eyes','eye_texture.bmp.001',None,.18)
for o in list(bpy.data.objects):
 if o.type!='MESH':continue
 o.data.validate(verbose=False);o.data.update()
 o.data.materials.clear();o.data.materials.append(coat if o.name=='Plane' else eye if o.name.startswith('Sphere') else hair)
 for p in o.data.polygons:p.use_smooth=True
 if o.name=='Plane':
  o.name='ThoroughbredBody';sub=o.modifiers.new('Surface refinement','SUBSURF');sub.levels=1;sub.render_levels=1
 else:
  # Bind previously unweighted mane, tail, and eyes to the actual horse skeleton.
  bone='Bone.002' if o.name.startswith('Sphere') else 'Bone.001' if o.name=='BezierCurve' else 'Bone.004'
  group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
  mod=o.modifiers.new('Follow skeleton','ARMATURE');mod.object=arm
  mw=o.matrix_world.copy();o.parent=arm;o.matrix_world=mw
# Keep each cannon/shin rigid. Blend only in a narrow band around the carpus/hock.
body=bpy.data.objects['ThoroughbredBody']
transform=arm.matrix_world.inverted()@body.matrix_world
lower_names=['Bone_L.002','Bone_R.002','Bone_L.005','Bone_R.005']
for vertex in body.data.vertices:
 p=transform@vertex.co
 if p.z>-3.9:continue
 def distance_to_segment(name):
  b=arm.data.bones[name];d=b.tail_local-b.head_local;t=max(0,min(1,(p-b.head_local).dot(d)/d.length_squared));return (p-(b.head_local+d*t)).length
 name=min(lower_names,key=distance_to_segment)
 if distance_to_segment(name)>1.3:continue
 for group in body.vertex_groups:group.remove([vertex.index])
 joint=arm.data.bones[name].head_local.z
 weight=max(0,min(1,(joint+.20-p.z)/.45))
 upper=name.replace('.002','.001').replace('.005','.004')
 if weight>0:body.vertex_groups[name].add([vertex.index],weight,'REPLACE')
 if weight<1:body.vertex_groups[upper].add([vertex.index],1-weight,'REPLACE')
root=bpy.data.objects.new('HorseScale',None);bpy.context.collection.objects.link(root)
for o in list(bpy.data.objects):
 if o!=root and o.parent is None:
  mw=o.matrix_world.copy();o.parent=root;o.matrix_world=mw
root.scale=(.2,.2,.2);root.location=(0,0,1.003)
# Eight authored semantic poses. Rotations are in bone rest-space, all derived from a sagittal world X axis.
def key(bn,a,frame):
 b=arm.pose.bones[bn];axis=b.bone.matrix_local.to_3x3().inverted()@Vector((1,0,0));b.rotation_mode='QUATERNION';b.rotation_quaternion=Quaternion(axis,a);b.keyframe_insert('rotation_quaternion',frame=frame)
arm.animation_data_create()
action=bpy.data.actions.new('Gallop');arm.animation_data.action=action
# Four-beat transverse gallop: hind pair drives, then fore pair receives weight.
# Solve each two-link leg toward a hoof trajectory instead of rotating joints independently.
def solve_leg(prefix,phase,frame,hind=False):
 upper=prefix+('.004' if hind else '.001');lower=prefix+('.005' if hind else '.002')
 u=arm.data.bones[upper];l=arm.data.bones[lower]
 rest_hip=u.head_local; knee=u.tail_local; foot=l.tail_local
 q=phase%1
 sweep=-.42*math.cos(q*math.tau) if not hind else -.38*math.cos(q*math.tau)
 parent=prefix+('.003' if hind else '')
 key(parent,sweep,frame)
 pivot=arm.data.bones[parent].head_local
 hip=pivot+Quaternion(Vector((1,0,0)),sweep)@(rest_hip-pivot)
 L1=(knee-rest_hip).yz.length;L2=(foot-knee).yz.length
 # Muybridge: short support, folded recovery, reach, then contact.
 # Fore carpus folds back; hind hock stays behind while hoof recovers under belly.
 stance=.22
 if q<stance:
  y=rest_hip.y-2.3+4.8*q/stance;z=-6.65
 else:
  poses=([(stance,2.5,0),(.36,.4,2.4),(.55,-2.7,2.6),(.78,-3.1,1.4),(1,-2.3,0)] if hind else
         [(stance,2.5,0),(.36,2.9,1.9),(.52,.9,3.1),(.75,-2.6,1.8),(1,-2.3,0)])
  # Cubic Hermite interpolation keeps velocity continuous across recovery keys.
  i=next(i for i in range(len(poses)-1) if q<=poses[i+1][0])
  a,b=poses[i],poses[i+1];span=b[0]-a[0];t=(q-a[0])/span
  values=[]
  for axis in (1,2):
   before=poses[max(0,i-1)];after=poses[min(len(poses)-1,i+2)]
   ma=(b[axis]-before[axis])/(b[0]-before[0]) if i else (4.8/stance if axis==1 else 0)
   mb=(after[axis]-a[axis])/(after[0]-a[0]) if i+1<len(poses)-1 else (4.8/stance if axis==1 else 0)
   values.append((2*t**3-3*t*t+1)*a[axis]+(t**3-2*t*t+t)*span*ma+(-2*t**3+3*t*t)*b[axis]+(t**3-t*t)*span*mb)
  y=rest_hip.y+values[0];z=-6.65+max(0,values[1])
 dy=y-hip.y;dz=z-hip.z;d=min(math.hypot(dy,dz),L1+L2-.025)
 direction=math.atan2(dz,dy);bend=math.acos(max(-1,min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))))
 angle=direction+(bend if hind else -bend)
 ky=hip.y+L1*math.cos(angle);kz=hip.z+L1*math.sin(angle)
 target_y=hip.y+d*math.cos(direction);target_z=hip.z+d*math.sin(direction)
 lower_angle=math.atan2(target_z-kz,target_y-ky)
 rest1=math.atan2(knee.z-rest_hip.z,knee.y-rest_hip.y);rest2=math.atan2(foot.z-knee.z,foot.y-knee.y)
 key(upper,angle-rest1-sweep,frame);key(lower,(lower_angle-rest2)-(angle-rest1),frame)
for k in range(33):
 f=1+k;t=k/32*math.tau
 key('Bone.001',.025*math.sin(t),f);key('Bone.002',-.035*math.sin(t),f)
 key('Bone.003',-.10+.06*math.sin(t),f);key('Bone.004',-.06+.06*math.sin(t+.5),f)
 for side,phase in [('L',0),('R',-.12)]:
  key('Bone_'+side,0,f);key('Bone_'+side+'.003',0,f)
  solve_leg('Bone_'+side,k/32+phase-.38,f)
  solve_leg('Bone_'+side,k/32+phase,f,True)
# Ground the supporting hoof from the evaluated skinned mesh, including mesh thickness.
# A separate root track shares the Gallop name so glTF combines it with the leg clip.
root.animation_data_create();root_action=bpy.data.actions.new('HoofSupport');root.animation_data.action=root_action
for f in range(1,34):
 bpy.context.scene.frame_set(f);root.location.z=1.003;bpy.context.view_layer.update()
 obj=bpy.data.objects['ThoroughbredBody'];evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=evaluated.to_mesh()
 floor=min((evaluated.matrix_world@vert.co).z for vert in me.vertices);evaluated.to_mesh_clear()
 phase=(f-1)/32;air=.15*math.sin(math.pi*(phase-.72)/.28)**2 if phase>.72 else 0
 root.location.z=1.003-floor+.018+air;root.keyframe_insert('location',frame=f)
root.animation_data.action=None;rt=root.animation_data.nla_tracks.new();rt.name='Gallop';rt.strips.new('Gallop',1,root_action);rt.mute=True;root.location.z=1.003
# Separate NLA tracks keep the natural standing pose and the authored gallop independently selectable.
action.use_fake_user=True
track=arm.animation_data.nla_tracks.new();track.name='Gallop';track.strips.new('Gallop',1,action)
arm.animation_data.action=None
idle=bpy.data.actions.new('Idle');arm.animation_data.action=idle
for f in [1,33]:
 for b in arm.pose.bones:
  b.rotation_mode='QUATERNION';b.rotation_quaternion=(1,0,0,0);b.keyframe_insert('rotation_quaternion',frame=f)
idle.use_fake_user=True
track=arm.animation_data.nla_tracks.new();track.name='Idle';track.strips.new('Idle',1,idle)
arm.animation_data.action=None
for track in arm.animation_data.nla_tracks:track.mute=True
bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=33;bpy.context.scene.render.fps=48
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/racehorse.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/models/racehorse.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=True,export_force_sampling=True,export_apply=True,export_image_format='JPEG',export_jpeg_quality=88)
print('HORSE EXPORTED')
