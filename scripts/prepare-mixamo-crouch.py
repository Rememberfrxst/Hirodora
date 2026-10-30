"""Extract the user-supplied Mixamo crouching take as a motion-only GLB.

Usage:
  blender -b --python scripts/prepare-mixamo-crouch.py -- input.fbx output.glb

The game retargets this source skeleton once onto the existing officer rig. No
duplicate character mesh, material, camera or light is shipped.
"""

import bpy
import os
import sys


args = sys.argv[sys.argv.index("--") + 1 :]
if len(args) != 2:
    raise SystemExit("Expected: input.fbx output.glb")
source_path, output_path = args

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source_path, use_anim=True)
armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
action = armature.animation_data.action
if action is None:
    raise RuntimeError("The supplied FBX has no active animation")
action.name = "CrouchInspectSource"
source_start = int(round(action.frame_range[0]))
source_end = int(round(action.frame_range[1]))
for curve in action.fcurves:
    for point in curve.keyframe_points:
        point.co.x -= source_start
        point.handle_left.x -= source_start
        point.handle_right.x -= source_start

for obj in list(bpy.context.scene.objects):
    if obj is not armature:
        bpy.data.objects.remove(obj, do_unlink=True)
for other in list(bpy.data.actions):
    if other is not action:
        bpy.data.actions.remove(other)

scene = bpy.context.scene
scene.render.fps = 30
scene.render.fps_base = 1
scene.frame_start = 0
scene.frame_end = source_end - source_start
for obj in scene.objects:
    obj.select_set(False)
armature.select_set(True)
bpy.context.view_layer.objects.active = armature
os.makedirs(os.path.dirname(output_path), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="ACTIVE_ACTIONS",
    export_frame_range=True,
    export_force_sampling=True,
    export_def_bones=True,
    export_optimize_animation_size=True,
)
print(
    f"Extracted {len(armature.data.bones)} Mixamo bones, "
    f"{scene.frame_end-scene.frame_start+1} frames at 30 FPS to {output_path}"
)
