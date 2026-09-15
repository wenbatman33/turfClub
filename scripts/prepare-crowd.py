import bpy
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(R/'public/assets/models/jockey.glb'))
keep=[]
for o in list(bpy.data.objects):
 if o.type=='MESH' and any(s in o.name for s in ['JockeyJersey','JockeyHead','Helmet','Sleeve','Breeches']):keep.append(o)
 else:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in keep:o.select_set(True)
bpy.context.view_layer.objects.active=keep[0];bpy.ops.object.join();o=bpy.context.object;o.name='SpectatorLOD'
o.data.materials.clear();m=bpy.data.materials.new('CrowdNeutral');m.diffuse_color=(.7,.7,.65,1);o.data.materials.append(m)
d=o.modifiers.new('Crowd distance detail','DECIMATE');d.ratio=540/len(o.data.polygons)
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/models/spectator.glb'),export_format='GLB',export_apply=True)
