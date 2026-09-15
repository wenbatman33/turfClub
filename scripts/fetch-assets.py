from pathlib import Path
import urllib.request,json,concurrent.futures
root=Path(__file__).resolve().parents[1]
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'TurfClubDemo/1.0'})
 return urllib.request.urlopen(req,timeout=60).read()
def save(url,path):
 p=root/path;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():p.write_bytes(get(url))
 return str(path)
j=json.loads(get('https://api.polyhaven.com/files/pine_tree_01'))['gltf']['1k']['gltf']
jobs=[(j['url'],Path('assets/source/tree/pine_tree_01.gltf'))]+[(v['url'],Path('assets/source/tree')/k) for k,v in j['include'].items()]
for key,name in [('brown_leather','leather'),('denim_fabric','fabric')]:
 data=json.loads(get('https://api.polyhaven.com/files/'+key))
 for mapkey,suffix in [('Diffuse','color'),('nor_gl','normal')]:
  if mapkey in data:jobs.append((data[mapkey]['1k']['jpg']['url'],Path('public/assets/textures')/(name+'-'+suffix+'.jpg')))
jobs.append(('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_puresky_1k.hdr',Path('public/assets/textures/sky.hdr')))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
 for r in ex.map(lambda p: save(*p),jobs):print(r,flush=True)
