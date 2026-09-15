"""Original volumetric jockey and tack, built as editable Blender mesh assets."""
import bpy, math
from mathutils import Vector
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
def mat(name,color,rough=.5,normal=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 if normal:
  t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(R/'assets/source/textures'/normal));t.image.colorspace_settings.name='Non-Color';nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.2;m.node_tree.links.new(t.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
 return m
silk=mat('RacingSilk',(.035,.31,.19),.35,'fabric-normal.jpg');white=mat('IvorySilk',(.87,.86,.78),.52,'fabric-normal.jpg');leather=mat('RidingLeather',(.024,.018,.012),.32,'leather-normal.jpg');skin=mat('Skin',(.59,.35,.22),.65);metal=mat('StirrupMetal',(.3,.34,.33),.25);metal.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.85;glass=mat('Goggles',(.015,.025,.03),.08)
def mesh(name,verts,faces,m):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for p in me.polygons:p.use_smooth=True
 return o
def tube(name,rings,m,N=16):
 verts=[]
 for i,(point,rx,ry) in enumerate(rings):
  p=Vector(point);prev=Vector(rings[max(0,i-1)][0]);nxt=Vector(rings[min(len(rings)-1,i+1)][0]);axis=(nxt-prev).normalized();u=Vector((1,0,0));u=(u-axis*u.dot(axis)).normalized();v=axis.cross(u).normalized()
  for j in range(N):
   a=j*math.tau/N;verts.append(p+u*(rx*math.cos(a))+v*(ry*math.sin(a)))
 faces=[]
 for i in range(len(rings)-1):
  for j in range(N):a=i*N+j;b=i*N+(j+1)%N;faces.append((a,b,b+N,a+N))
 faces.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+j for j in range(N))]);o=mesh(name,verts,faces,m)
 sub=o.modifiers.new('Tailored surface','SUBSURF');sub.levels=1;return o
def ellipsoid(name,p,s,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=p);o=bpy.context.object;o.name=name;o.scale=s;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def strap(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3;p=c.splines.new('BEZIER');p.bezier_points.add(len(points)-1)
 for b,co in zip(p.bezier_points,points):b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
# Continuous tailored torso; forward crouch, rounded shoulders and narrower waist.
torso=tube('JockeyJersey', [((0,.13,1.83),.14,.11),((0,.06,1.89),.16,.13),((0,-.10,1.99),.185,.135),((0,-.29,2.075),.21,.13),((0,-.39,2.1),.17,.10)],silk,24)
torso.data.materials.append(white)
for poly in torso.data.polygons:
 if 24 <= poly.index <48:poly.material_index=1
tube('Collar',[((0,-.40,2.09),.075,.07),((0,-.44,2.15),.07,.062)],white)
head=ellipsoid('JockeyHead',(0,-.51,2.215),(.10,.105,.133),skin)
ellipsoid('Nose',(0,-.607,2.20),(.031,.031,.034),skin)
ellipsoid('Helmet',(0,-.505,2.29),(.126,.13,.10),silk)
ellipsoid('HelmetVisor',(0,-.60,2.275),(.131,.103,.015),leather)
for side in [-1,1]:
 ellipsoid('Ear',(.095*side,-.50,2.20),(.018,.032,.043),skin)
 ellipsoid('GoggleLens',(.052*side,-.604,2.245),(.048,.018,.026),glass)
 strap('GoggleStrap',[(side*.102,-.595,2.25),(side*.113,-.5,2.25),(side*.10,-.43,2.25)],.012,leather)
 strap('ChinStrap',[(side*.10,-.49,2.28),(side*.085,-.525,2.14),(0,-.56,2.105)],.008,leather)
 tube('Sleeve', [((side*.18,-.32,2.065),.082,.073),((side*.235,-.30,1.98),.073,.065),((side*.275,-.28,1.87),.064,.061),((side*.252,-.43,1.83),.055,.049),((side*.17,-.67,1.80),.04,.04)],silk)
 tube('Cuff',[((side*.175,-.645,1.805),.043,.042),((side*.158,-.70,1.795),.04,.04)],white)
 ellipsoid('Glove',(side*.15,-.728,1.788),(.05,.065,.04),leather)
 tube('Breeches',[((side*.115,.11,1.82),.112,.105),((side*.25,-.12,1.66),.106,.096),((side*.335,-.34,1.465),.077,.072),((side*.36,-.32,1.39),.067,.058)],white)
 tube('Boot',[((side*.359,-.32,1.41),.069,.06),((side*.367,-.25,1.30),.061,.06),((side*.367,-.06,1.115),.046,.055)],leather)
 tube('BootToe',[((side*.367,-.025,1.09),.053,.04),((side*.367,-.13,1.065),.063,.04),((side*.367,-.25,1.055),.047,.027)],leather)
 strap('Stirrup',[(side*.41,-.15,1.17),(side*.44,-.15,1.01),(side*.31,-.15,1.005),(side*.31,-.15,1.16)],.009,metal)
 strap('StirrupLeather',[(side*.12,-.18,1.62),(side*.35,-.15,1.45),(side*.38,-.15,1.16)],.017,leather)
 strap('Rein',[(side*.15,-.73,1.79),(side*.28,-.96,1.64),(side*.24,-1.36,1.62)],.007,leather)
# Saddle and cloth fit across the actual source horse's barrel.
verts=[]
for y in [.34,.25,.05,-.18,-.36]:
 for k in range(13):
  a=-math.pi*.46+k/12*math.pi*.92
  verts.append((math.sin(a)*.37,y,1.29+math.cos(a)*.40))
faces=[]
for i in range(4):
 for j in range(12):a=i*13+j;faces.append((a,a+1,a+14,a+13))
cloth=mesh('Saddlecloth',verts,faces,silk);sol=cloth.modifiers.new('Quilt thickness','SOLIDIFY');sol.thickness=.012
verts2=[(x*.83,y*.8,z+.02) for x,y,z in verts];saddle=mesh('RaceSaddle',verts2,faces,leather);sol=saddle.modifiers.new('Leather thickness','SOLIDIFY');sol.thickness=.02
strap('Girth',[(-.08,-.15,1.66),(-.35,-.15,1.35),(-.30,-.15,.99),(0,-.15,.92),(.30,-.15,.99),(.35,-.15,1.35),(.08,-.15,1.66)],.02,leather)
for side in [-1,1]:
 strap('Bridle',[(side*.12,-1.27,1.8),(side*.22,-1.43,1.5),(side*.20,-1.52,1.38)],.012,leather)
strap('Noseband',[(-.20,-1.48,1.42),(0,-1.60,1.42),(.20,-1.48,1.42)],.014,leather)
# UV unwrap the original clothing mesh so the real fabric normal maps can be sampled.
for o in bpy.data.objects:
 if o.type=='MESH':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.01);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'assets/source/jockey.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/models/jockey.glb'),export_format='GLB',export_apply=True,export_image_format='JPEG',export_jpeg_quality=80)
print('RIDER EXPORTED')
