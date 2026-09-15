"""After fetch-assets.py: turn one CC0 source pine into a web distance LOD."""
import bpy
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/tree/pine_tree_01.gltf'))
meshes=[o for o in bpy.data.objects if o.type=='MESH'];o=meshes[0]
for x in meshes[1:]:bpy.data.objects.remove(x,do_unlink=True)
o.location=(0,0,0)
d=o.modifiers.new('Distant foliage LOD','DECIMATE');d.ratio=min(1,32000/len(o.data.polygons))
for i in bpy.data.images:
 if i.size[0]>512:i.scale(512,512)
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/models/pine-web.glb'),export_format='GLB',export_apply=True,export_image_format='AUTO')
