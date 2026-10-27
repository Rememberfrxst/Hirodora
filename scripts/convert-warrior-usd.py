"""Offline USDZ -> glTF conversion. Requires usd-core and numpy, not Blender USD support.
Preserves the supplied mesh, normals, UVs, texture and embedded attribution.
"""
import json, struct, sys, zipfile
import numpy as np
from pxr import Usd, UsdGeom

source, target = sys.argv[1:3]
stage = Usd.Stage.Open(source)
cache = UsdGeom.XformCache()
meshes = [UsdGeom.Mesh(p) for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)]
data = bytearray()
views, accessors, out_meshes = [], [], []
all_points = []
for mesh in meshes:
    points = np.asarray(mesh.GetPointsAttr().Get(), dtype=np.float64)
    matrix = np.asarray(cache.GetLocalToWorldTransform(mesh.GetPrim()))
    points = (np.c_[points, np.ones(len(points))] @ matrix)[:, :3]
    all_points.append(points)
bounds = np.concatenate(all_points)
minimum, maximum = bounds.min(axis=0), bounds.max(axis=0)
scale = 1.85 / (maximum[1] - minimum[1])
origin = np.array([(minimum[0]+maximum[0])/2, minimum[1], (minimum[2]+maximum[2])/2])

def append(raw):
    while len(data) % 4: data.append(0)
    offset = len(data); data.extend(raw)
    views.append(dict(buffer=0, byteOffset=offset, byteLength=len(raw)))
    return len(views)-1

def attribute(values, kind, component=5126):
    values = np.asarray(values, dtype='<f4' if component==5126 else '<u4')
    item = dict(bufferView=append(values.tobytes()), componentType=component, count=len(values), type=kind)
    if kind=='VEC3': item.update(min=values.min(axis=0).tolist(), max=values.max(axis=0).tolist())
    accessors.append(item)
    return len(accessors)-1

for mesh, points in zip(meshes, all_points):
    matrix=np.asarray(cache.GetLocalToWorldTransform(mesh.GetPrim()))[:3,:3]
    normals=np.asarray(mesh.GetNormalsAttr().Get(),dtype=np.float64) @ np.linalg.inv(matrix).T
    normals/=np.maximum(1e-12,np.linalg.norm(normals,axis=1)[:,None])
    uv=np.array(UsdGeom.PrimvarsAPI(mesh).GetPrimvar('st0').ComputeFlattened(),dtype=np.float32)
    uv[:,1]=1-uv[:,1]
    indices=np.asarray(mesh.GetFaceVertexIndicesAttr().Get(),dtype=np.uint32)
    counts=np.asarray(mesh.GetFaceVertexCountsAttr().Get())
    if not np.all(counts==3): raise ValueError('Expected triangulated Sketchfab source')
    primitive=dict(attributes=dict(POSITION=attribute((points-origin)*scale,'VEC3'), NORMAL=attribute(normals,'VEC3'), TEXCOORD_0=attribute(uv,'VEC2')), indices=attribute(indices,'SCALAR',5125), material=0)
    out_meshes.append(dict(name=mesh.GetPrim().GetName(),primitives=[primitive]))
with zipfile.ZipFile(source) as archive:
    texture=archive.read('0/Material_0_baseColor.jpg')
image=append(texture)
doc=dict(asset=dict(version='2.0',generator='Hirodora USD converter',copyright=str(stage.GetRootLayer().customLayerData.get('copyright','')),extras=dict(stage.GetRootLayer().customLayerData)), buffers=[dict(byteLength=len(data))], bufferViews=views, accessors=accessors, meshes=out_meshes, nodes=[dict(name='WarriorPart'+str(i),mesh=i) for i in range(len(meshes))], scenes=[dict(nodes=list(range(len(meshes))))], scene=0, images=[dict(bufferView=image,mimeType='image/jpeg')], textures=[dict(source=0)], materials=[dict(name='WarriorClothingAndSkin',pbrMetallicRoughness=dict(baseColorTexture=dict(index=0),metallicFactor=0,roughnessFactor=.86))])
js=json.dumps(doc,separators=(',',':')).encode()
js+=b' '*((-len(js))%4); data+=b'\0'*((-len(data))%4)
with open(target,'wb') as output:
    output.write(struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(data)))
    output.write(struct.pack('<II',len(js),0x4e4f534a)); output.write(js)
    output.write(struct.pack('<II',len(data),0x004e4942)); output.write(data)
print('Converted',sum(len(m.GetFaceVertexCountsAttr().Get()) for m in meshes),'triangles; attribution:',dict(stage.GetRootLayer().customLayerData))
