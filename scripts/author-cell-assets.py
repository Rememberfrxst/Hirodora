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
steel=mat('PaintedSteel',(.14,.17,.15),.62,.55)
chrome=mat('BrushedSteel',(.31,.34,.33),.38,.85)
enamel=mat('InstitutionalPorcelain',(.64,.63,.55),.26)
inner=mat('BowlGlaze',(.67,.67,.60),.17)
seal=mat('AgedSeal',(.15,.14,.10),.88)
weld=mat('WeldBead',(.20,.21,.18),.72,.65)
windowpaint=mat('WindowEnamel',(.24,.29,.26),.64,.1)
paper=mat('BookPages',(.64,.59,.45),.96)
bookcover=mat('WornBookCover',(.13,.18,.16),.9)
cloth=mat('BlanketWool',(.17,.23,.23),.98)
cotton=mat('MattressCanvas',(.56,.54,.43),.95)
rubber=mat('Rubber',(.025,.03,.027),.78)
water=mat('BowlWater',(.035,.055,.046),.18,0)
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
            t=j/rings; r=max(.001,math.sin(t*math.pi/2)); h=max(.02,math.cos(t*math.pi/2))
            for i in range(n):
                a=2*math.pi*i/n; x=math.copysign(abs(math.cos(a))**.34,math.cos(a))*r; y=math.copysign(abs(math.sin(a))**.34,math.sin(a))*r
                crease=(math.sin(a*19+t*15)*.004+math.sin(a*31)*.003)*r**6
                v.append((center[0]+x*size[0]/2,center[1]+y*size[1]/2,center[2]+side*(h*size[2]/2+crease)))
    for k in range(2):
        base=k*(rings+1)*n
        for j in range(rings):
            for i in range(n):
                a=base+j*n+i; b=base+j*n+(i+1)%n; face=(a,b,b+n,a+n); f.append(face[::-1] if k else face)
    for i in range(n):
        a=rings*n+i; b=rings*n+(i+1)%n; c=(rings+1)*n
        f.append((a,b,b+c,a+c))
    return mesh(name,v,f,m,g)
cloths=[]
bunk=group('Bunk')
# Institutional welded rectangular tube, mitred ends and loose skid feet: not
# floor-anchored, because this particular maintenance bunk must remain pushable.
for x in [-.54,.54]:
    for y in [-1.02,1.02]:
        plate('Box section upright',(x,y,1.075),(.055,.055,2.10),steel,bunk,.008)
        plate('Unanchored skid foot',(x,y,.027),(.13,.14,.045),steel,bunk,.012)
        plate('Pressed upright end cap',(x,y,2.136),(.058,.058,.013),chrome,bunk,.003)
        for z in [.42,1.55]:
            # Tight bead follows the visible joint, rather than arbitrary rivets.
            tube('Rail seam weld',[(x-.028,y-.03,z-.025),(x-.028,y-.03,z+.025),(x+.028,y-.03,z+.025)],.003,weld,bunk)
    for z in [.76,2.08]:
        plate('Welded headboard rail',(x,0,z),(.048,2.04,.065),steel,bunk,.007)
for z in [.42,1.55]:
    for x in [-.54,.54]:
        plate('Rolled angle rail',(x,0,z),(.055,2.12,.085),steel,bunk,.007)
    for y in [-.99,.99]: plate('End rail',(0,y,z),(1.08,.055,.085),steel,bunk,.007)
    for y in [-.88,-.6,-.3,0,.3,.6,.88]: plate('Mattress support',(0,y,z-.02),(1.05,.045,.035),steel,bunk,.005)
    mattress=cushion('Tufted canvas mattress',(0,0,z+.12),(1.04,2.02,.17),cotton,bunk)
    mattress.modifiers.new('Cloth collision mattress','COLLISION')
    mattress.collision.thickness_outer=.012
    # Sewn rounded rectangular perimeter, modeled independently from the cushion.
    for dz in [-.012,.012]:
        points=[]
        for i in range(49):
            a=2*math.pi*i/48
            points.append((math.copysign(abs(math.cos(a))**.34,math.cos(a))*.521,
                           math.copysign(abs(math.sin(a))**.34,math.sin(a))*1.011,z+.12+dz))
        tube('Mattress stitched piping',points,.0035,cotton,bunk)
    pillow=cushion('Compressed pillow',(.035,-.72,z+.23),(.66,.42,.13),cotton,bunk)
    # Real offline cloth solve over the collision mattress. Pin the tucked edge;
    # side hems sag under gravity. No noise-displaced surface pretending to be cloth.
    verts=[]; faces=[]; nx=30; ny=36
    for j in range(ny+1):
        y=-.40+j/ny*1.51
        for i in range(nx+1):
            x=-.64+i/nx*1.28
            # A loose hand-fold and a slightly skewed hem seed the drape.
            fold=.018*math.exp(-((y-.72)/.13)**2)*math.cos(x*8)
            verts.append((x,y,z+.245+fold))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i; faces.append((a,a+1,a+nx+2,a+nx+1))
    blanket=mesh('Draped wool blanket',verts,faces,cloth,bunk)
    pins=blanket.vertex_groups.new(name='Tucked edge')
    pins.add([i for i in range(nx+1) if abs(verts[i][0])<.45],1,'REPLACE')
    mod=blanket.modifiers.new('Gravity cloth drape','CLOTH')
    mod.settings.quality=7; mod.settings.mass=.28
    mod.settings.tension_stiffness=18; mod.settings.compression_stiffness=18
    mod.settings.shear_stiffness=8; mod.settings.bending_stiffness=.35
    mod.settings.vertex_group_mass=pins.name
    mod.collision_settings.use_collision=True; mod.collision_settings.distance_min=.009
    mod.point_cache.frame_start=1; mod.point_cache.frame_end=36
    cloths.append((blanket,nx,ny))
for x in [.16,.49]: plate('Ladder box stile',(x,1.10,.9),(.035,.045,1.68),steel,bunk,.006)
for z in [.3,.58,.86,1.14,1.42]:
    tube('Flattened ladder rung',[(.16,1.10,z),(.49,1.10,z)],.017,chrome,bunk)
tube('Continuous upper safety rail',[(.54,-.88,1.62),(.54,-.88,1.98),(.54,.60,1.98),(.54,.60,1.62)],.02,steel,bunk)
# A bound prison paperback, compressed page block and embossed spine.
plate('Paperback page block',(-.24,-.36,.69),(.17,.25,.032),paper,bunk,.006)
for dz in [-.019,.019]: plate('Paperback cover',(-.24,-.36,.69+dz),(.18,.26,.004),bookcover,bunk,.004)
tube('Book binding',[(-.33,-.49,.67),(-.33,-.49,.71),(-.33,-.23,.71),(-.33,-.23,.67)],.004,bookcover,bunk)

toilet=group('Toilet')
shell('Integral porcelain floor pedestal',[(.01,.015),(.20,.015),(.215,.035),(.21,.065),(.16,.095),(.115,.21),(.13,.30),(.18,.34)],enamel,toilet,scale=(1,1.20,1))
plate('Integral four bolt mounting flange',(0,0,.033),(.57,.54,.066),enamel,toilet,.036)
# Exterior and interior are separate continuous shells, with a real trap opening.
shell('Elongated vitreous bowl exterior',[(.155,.29),(.22,.32),(.266,.40),(.285,.48),(.287,.52),(.277,.548),(.253,.551)],enamel,toilet,scale=(1,1.28,1))
shell('Rolled porcelain rim',[(.253,.551),(.277,.548),(.282,.56),(.272,.573),(.245,.572),(.228,.56),(.231,.548),(.253,.551)],inner,toilet,scale=(1,1.28,1))
shell('Glazed descending inner bowl',[(.231,.559),(.224,.528),(.21,.487),(.185,.435),(.15,.388),(.105,.350),(.065,.326),(.055,.295)],inner,toilet,scale=(1,1.28,1))
shell('Dark visible waste trap',[(.055,.295),(.05,.26),(.001,.25)],seal,toilet,scale=(1,1.28,1))
shell('Recessed bowl water',[(.001,.326),(.061,.326),(.064,.327)],water,toilet,scale=(1,1.25,1))
plate('Cast rear flush apron',(0,-.29,.47),(.31,.16,.18),enamel,toilet,.045)
tube('Flushometer riser',[(0,-.325,.52),(0,-.37,.59),(0,-.37,.91)],.019,chrome,toilet)
shell('Serviceable flush valve',[(.028,.83),(.043,.848),(.043,.91),(.037,.938),(.027,.95)],chrome,toilet,pos=(0,-.37,0),segments=40)
for z in [.844,.92]:shell('Valve compression nut',[(.044,z),(.044,z+.016)],chrome,toilet,pos=(0,-.37,0),segments=6)
tube('Metal flush lever',[(.04,-.37,.89),(.15,-.37,.89),(.17,-.37,.88)],.009,chrome,toilet)
# This decommissioned fixture is disconnected: a capped union, not a supply pipe
# stretching through the wall when the player slides the toilet clear.
shell('Capped disconnected supply union',[(.027,.95),(.027,.969),(.001,.97)],chrome,toilet,pos=(0,-.37,0),segments=24)

sink=group('Sink')
shell('Deep pressed basin',[(.01,0),(.08,.015),(.22,.10),(.31,.17),(.32,.185),(.3,.2),(.27,.17),(.2,.07),(.06,.03),(.01,.03)],enamel,sink,scale=(1,.78,1),pos=(0,0,.68))
plate('Wall mounting apron',(0,-.17,.83),(.65,.14,.08),enamel,sink,.035)
tube('Curved faucet',[(0,-.17,.88),(0,-.17,1.09),(0,-.08,1.12),(0,.01,1.08),(0,.01,1.025)],.018,chrome,sink)
for x in [-.14,.14]: shell('Push tap',[(.025,.86),(.025,.92),(.035,.93)],chrome,sink,pos=(x,-.16,0),segments=20)
tube('Waste trap',[(0,0,.71),(0,0,.52),(0,.04,.42),(.0,-.13,.40),(0,-.22,.48)],.025,chrome,sink)
shell('Drain strainer',[(0,.712),(.032,.713)],chrome,sink)
for i in range(8):
    a=i*math.pi/4
    shell('Drain perforation',[(0,.714),(.0035,.714),(.0035,.715)],seal,sink,pos=(math.sin(a)*.019,math.cos(a)*.019,0),segments=8)
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

# Bake the actual cloth solve once. The game only loads the static GLB result.
for frame in range(1,37):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
for blanket,nx,ny in cloths:
    bpy.context.view_layer.objects.active=blanket
    bpy.ops.object.modifier_apply(modifier='Gravity cloth drape')
    points=[tuple(blanket.data.vertices[j*(nx+1)].co) for j in range(0,ny+1,2)]
    tube('Sewn bound blanket hem',points,.004,cotton,bunk)
    sol=blanket.modifiers.new('Woven cloth thickness','SOLIDIFY');sol.thickness=.004
    sub=blanket.modifiers.new('Soft cloth normals','SUBSURF');sub.levels=1;sub.render_levels=1
    dec=blanket.modifiers.new('Static drape topology budget','DECIMATE');dec.ratio=.55;dec.use_collapse_triangulate=True
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
