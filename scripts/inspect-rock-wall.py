"""Inspect the supplied Blender asset with Blender/bpy >= 5.2; never execute file scripts.

Usage: python scripts/inspect-rock-wall.py /path/rock_wall_17_1k.blend
The uploaded file is a material preview, not modular prison architecture.
"""
import bpy
import json
import os
import sys

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(sys.argv[-1]), load_ui=False, use_scripts=False)
print(json.dumps({
    "version": list(bpy.data.version),
    "objects": [{"name": o.name, "type": o.type} for o in bpy.data.objects],
    "materials": [m.name for m in bpy.data.materials],
    "images": [{"name": i.name, "path": i.filepath, "packed": bool(i.packed_file), "size": list(i.size), "exists": os.path.isfile(bpy.path.abspath(i.filepath))} for i in bpy.data.images],
}, indent=2))
