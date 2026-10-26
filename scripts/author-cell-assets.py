"""Offline Blender authoring, metres, Z-up. Original Hirodora cell furniture.
Subdivision cushions, solidified cloth, revolved sanitary shells, swept plumbing,
bevelled sheet steel and welded frames; exported once as a shared GLB library.
Run: blender -b --python scripts/author-cell-assets.py
"""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'src/assets/environment')
os.makedirs(out, exist_ok=True)
def mat(name, color, rough=.7, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m
steel=mat('PaintedSteel',(.16,.19,.17),.53,.65)
chrome=mat('BrushedSteel',(.38,.42,.43),.3,.9)
enamel=mat('InstitutionalPorcelain',(.68,.70,.65),.24)
windowpaint=mat('WindowEnamel',(.24,.29,.26),.64,.1)
paper=mat('BookPages',(.64,.59,.45),.96)
bookcover=mat('WornBookCover',(.13,.18,.16),.9)
cloth=mat('BlanketWool',(.17,.23,.23),.98)
cotton=mat('MattressCanvas',(.56,.54,.43),.95)
rubber=mat('Rubber',(.025,.03,.027),.78)
water=mat('BowlWater',(.045,.09,.09),.15,.25)
warm=mat('Diffuser',(.78,.71,.52),.55)
p=warm.node_tree.nodes.get('Principled BSDF'); p.inputs['Emission Color'].default_value=(1,.72,.38,1); p.inputs['Emission Strength'].default_value=1.4
def group(name):
    g=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(g); return g
def finish(o,name,m,g,smooth=False):
    o.name=name; o.data.materials.append(m); o.parent=g
    if smooth:
        for f in o.data.polygons: f.use_smooth=True
    return o
def mesh(name,verts,faces,m,g,smooth=True):
    d=bpy.data.meshes.new(name); d.from_pydata(verts,[],faces); d.update()
    o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); finish(o,name,m,g,smooth)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(island_margin=.015); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    return o
def plate(name,pos,size,m,g,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos); o=bpy.context.object; o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Rolled edges','BEVEL'); mod.width=bevel; mod.segments=3
    mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return finish(o,name,m,g)
def tube(name,points,r,m,g):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.resolution_u=8; c.bevel_depth=r; c.bevel_resolution=3
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for b,p in zip(s.bezier_points,points): b.co=p; b.handle_left_type='AUTO'; b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(m); o.parent=g
    return o
def shell(name,profile,m,g,scale=(1,1,1),pos=(0,0,0),segments=64):
    v=[]; f=[]
    for radius,z in profile:
        for i in range(segments):
            a=i*2*math.pi/segments; v.append((pos[0]+math.cos(a)*radius*scale[0],pos[1]+math.sin(a)*radius*scale[1],pos[2]+z*scale[2]))
    for j in range(len(profile)-1):
        for i in range(segments):
            a=j*segments+i; b=j*segments+(i+1)%segments; f.append((a,b,b+segments,a+segments))
    return mesh(name,v,f,m,g)
def cushion(name,center,size,m,g):
    # Rounded, pinched perimeter; the two surfaces meet at a sewn seam.
    v=[]; f=[]; n=48; rings=12
    for side in [-1,1]:
        for j in range(rings+1):
            t=j/rings; r=max(.001,math.sin(t*math.pi/2)); h=math.cos(t*math.pi/2)
            for i in range(n):
                a=2*math.pi*i/n; x=math.copysign(abs(math.cos(a))**.34,math.cos(a))*r; y=math.copysign(abs(math.sin(a))**.34,math.sin(a))*r
                crease=(math.sin(a*19+t*15)*.004+math.sin(a*31)*.003)*r**6
                v.append((center[0]+x*size[0]/2,center[1]+y*size[1]/2,center[2]+side*(h*size[2]/2+crease)))
    for k in range(2):
        base=k*(rings+1)*n
        for j in range(rings):
            for i in range(n):
                a=base+j*n+i; b=base+j*n+(i+1)%n; face=(a,b,b+n,a+n); f.append(face if k else face[::-1])
    for i in range(n):
        a=rings*n+i; b=rings*n+(i+1)%n; c=(rings+1)*n
        f.append((a,b,b+c,a+c))
    return mesh(name,v,f,m,g)
bunk=group('Bunk')
for x in [-.56,.56]:
    # Swept continuous end frames with rounded bends.
    tube('Welded end frame',[(x,-1.03,.035),(x,-1.03,2.1),(x,-.98,2.17),(x,.98,2.17),(x,1.03,2.1),(x,1.03,.035)],.027,steel,bunk)
    for y in [-1.03,1.03]:
        plate('Floor fixing',(x,y,.022),(.13,.13,.028),steel,bunk,.008)
        for dx in [-.038,.038]:
            shell('Anchor bolt',[(.009,0),(.009,.012),(.005,.014)],chrome,bunk,pos=(x+dx,y,.038),segments=6)
for z in [.42,1.55]:
    for x in [-.54,.54]:
        plate('Rolled angle rail',(x,0,z),(.055,2.12,.085),steel,bunk,.007)
    for y in [-.99,.99]: plate('End rail',(0,y,z),(1.08,.055,.085),steel,bunk,.007)
    for y in [-.88,-.6,-.3,0,.3,.6,.88]: plate('Mattress support',(0,y,z-.02),(1.05,.045,.035),steel,bunk,.005)
    cushion('Stitched mattress',(0,0,z+.12),(1.04,2.02,.17),cotton,bunk)
    # Sewn rounded rectangular perimeter, modeled independently from the cushion.
    for dz in [-.012,.012]:
        points=[]
        for i in range(49):
            a=2*math.pi*i/48
            points.append((math.copysign(abs(math.cos(a))**.34,math.cos(a))*.521,
                           math.copysign(abs(math.sin(a))**.34,math.sin(a))*1.011,z+.12+dz))
        tube('Mattress stitched piping',points,.0035,cotton,bunk)
    cushion('Soft pillow',(.035,-.72,z+.25),(.68,.43,.17),cotton,bunk)
    # Folded cloth surface with sagging hem and solid thickness, no double-sided plane.
    verts=[]; faces=[]; nx=40; ny=48
    for j in range(ny+1):
        y=-.41+j/ny*1.52
        for i in range(nx+1):
            x=-.67+i/nx*1.3; drop=max(0,abs(x)-.48)*2.2
            fold=.014*math.sin(y*20+x*11)+.008*math.sin(y*39-x*14)
            fold+=.035*math.exp(-((y-.83)/.1)**2)
            verts.append((x,y,z+.25+fold-drop))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i; faces.append((a,a+1,a+nx+2,a+nx+1))
    blanket=mesh('Draped wool blanket',verts,faces,cloth,bunk)
    sol=blanket.modifiers.new('Woven cloth thickness','SOLIDIFY'); sol.thickness=.006
    tube('Blanket bound hem',[verts[j*(nx+1)] for j in range(0,ny+1,4)],.006,cotton,bunk)
for x in [.16,.49]: tube('Ladder stile',[(x,1.11,.08),(x,1.11,1.74)],.019,steel,bunk)
for z in [.3,.58,.86,1.14,1.42]: tube('Ladder tread',[(.16,1.11,z),(.49,1.11,z)],.018,chrome,bunk)
tube('Upper safety rail',[(.56,-.88,1.62),(.56,-.88,1.95),(.56,.6,1.95),(.56,.6,1.62)],.021,steel,bunk)
# A bound prison paperback, compressed page block and embossed spine.
plate('Paperback page block',(-.24,-.55,.80),(.17,.25,.032),paper,bunk,.006)
for dz in [-.019,.019]: plate('Paperback cover',(-.24,-.55,.80+dz),(.18,.26,.004),bookcover,bunk,.004)
tube('Book binding',[(-.33,-.68,.78),(-.33,-.68,.82),(-.33,-.42,.82),(-.33,-.42,.78)],.004,bookcover,bunk)

toilet=group('Toilet')
shell('Ceramic pedestal',[(.01,0),(.16,0),(.18,.025),(.17,.08),(.115,.23),(.15,.32)],enamel,toilet,scale=(1,1.15,1))
# Revolved outer wall, rolled lip, then inner basin descending to the water trap.
shell('Hollow vitreous china bowl',[(.15,.28),(.24,.33),(.28,.43),(.275,.49),(.255,.515),(.23,.505),(.225,.47),(.2,.39),(.12,.32),(.065,.3),(.001,.3)],enamel,toilet,scale=(1,1.3,1))
shell('Seat ring',[(.238,.515),(.25,.53),(.244,.55),(.217,.55),(.21,.53),(.218,.515),(.238,.515)],rubber,toilet,scale=(1,1.3,1))
shell('Water trap',[(.001,.335),(.115,.335),(.12,.3355)],water,toilet,scale=(1,1.15,1))
tube('Flushometer supply',[(0,-.26,.43),(0,-.35,.53),(0,-.35,.98)],.025,chrome,toilet)
shell('Flush valve body',[(.035,.81),(.06,.83),(.055,.95),(.035,.99)],chrome,toilet,pos=(0,-.35,0))
tube('Flush handle',[(.04,-.35,.9),(.15,-.35,.9),(.17,-.35,.88)],.012,chrome,toilet)
for x in [-.16,.16]: shell('Seat hinge',[(.016,.5),(.016,.54)],chrome,toilet,pos=(x,-.19,0),segments=16)

sink=group('Sink')
shell('Deep pressed basin',[(.01,0),(.08,.015),(.22,.10),(.31,.17),(.32,.185),(.3,.2),(.27,.17),(.2,.07),(.06,.03),(.01,.03)],enamel,sink,scale=(1,.78,1),pos=(0,0,.68))
plate('Wall mounting apron',(0,-.17,.83),(.65,.14,.08),enamel,sink,.035)
tube('Curved faucet',[(0,-.17,.88),(0,-.17,1.09),(0,-.08,1.12),(0,.01,1.08),(0,.01,1.025)],.018,chrome,sink)
for x in [-.14,.14]: shell('Push tap',[(.025,.86),(.025,.92),(.035,.93)],chrome,sink,pos=(x,-.16,0),segments=20)
tube('Waste trap',[(0,0,.71),(0,0,.52),(0,.04,.42),(.0,-.13,.40),(0,-.22,.48)],.025,chrome,sink)
shell('Drain strainer',[(0,.712),(.032,.713)],chrome,sink)
plate('Polished steel mirror',(0,-.29,1.38),(.55,.022,.55),chrome,sink,.018)

window=group('Window')
for x in [-.85,.85]: plate('Deep reveal',(x,0,0),(.18,.3,1.45),windowpaint,window,.015)
for z in [-.65,.65]: plate('Window lintel',(0,0,z),(1.88,.3,.16),windowpaint,window,.015)
for x in [-.7,-.42,-.14,.14,.42,.7]: tube('Embedded security bar',[(x,-.04,-.58),(x,-.04,.58)],.021,steel,window)
plate('Cross brace',(0,-.04,0),(1.6,.06,.035),steel,window,.005)
plate('Interior sill',(0,.13,-.72),(1.96,.5,.1),enamel,window,.025)
for x in [-.77,.77]:
    for z in [-.56,.56]: shell('Window frame rivet',[(.011,0),(.011,.008),(.006,.011)],chrome,window,pos=(x,-.16,z),segments=12)

lamp=group('Luminaire')
plate('Pressed protective housing',(0,0,0),(1.05,.28,.1),steel,lamp,.035)
plate('Ribbed polycarbonate diffuser',(0,0,-.075),(.92,.22,.075),warm,lamp,.03)
for x in [-.44,-.22,0,.22,.44]: tube('Safety cage',[(x,-.14,-.04),(x,-.14,-.14),(x,.14,-.14),(x,.14,-.04)],.006,chrome,lamp)
for x in [-.49,.49]: shell('Captive screw',[(.012,0),(.012,.01)],chrome,lamp,pos=(x,0,.055),segments=6)
for x in [-.4,.4]: tube('Ceiling suspension',[(x,0,.06),(x,0,.7)],.009,steel,lamp)

# Convert curves and apply modifiers, retaining clean UVs and named model roots.
for o in list(bpy.context.scene.objects):
    if o.type not in {'MESH','CURVE'}: continue
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
for g in [bunk,toilet,sink,window,lamp]:
    bpy.ops.object.select_all(action='DESELECT')
    children=[o for o in g.children if o.type=='MESH']
    for o in children: o.select_set(True)
    bpy.context.view_layer.objects.active=children[0]
    bpy.ops.object.join(); bpy.context.object.name=g.name+'Mesh'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'cell-props.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'cell-props.glb'),export_format='GLB',export_yup=True,export_apply=True)
