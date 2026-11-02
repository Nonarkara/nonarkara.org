"""
Bake a building's light onto the ground it shades, headless.

    blender -b -P tools/bake-ground.py -- out/<name>.obj out/<name>.json bake/<name>-ground.png

The geometry is whatever tools/export-building.mjs wrote: the browser's own
buildX(), not a second model. This script only LIGHTS it. It renders a
top-down orthographic view of the ground rectangle in the JSON, with a soft
sky (and a morning sun when the JSON says so), and writes the shade as the
ALPHA of a black image, so the browser lays it over the ground as a single
translucent plane. No UVs are needed: the mapping is planar. Rectangles in
`mask` get no shade (water keeps its colour).
"""
import bpy, sys, json, math

obj, meta, out = sys.argv[sys.argv.index("--") + 1:][:3]
J = json.load(open(meta))
M = J["ground"]
W, D = M["x1"] - M["x0"], M["z1"] - M["z0"]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=obj, forward_axis="NEGATIVE_Z", up_axis="Y")
# Blender is Z-up; the importer maps three's Y-up onto it. Everything that
# is not the podium top casts; the podium top itself receives.
scene = bpy.context.scene

# The camera must see the ground, not the roof above it: the imported
# solids stay in the scene to cast shadow but are invisible to the camera.
for o in list(bpy.context.scene.objects):
    o.visible_camera = False

# Ground receiver: the podium top, a hair above y=0.
bpy.ops.mesh.primitive_plane_add(size=1, location=((M["x0"]+M["x1"])/2, -(M["z0"]+M["z1"])/2, M["y"] + 0.001))
ground = bpy.context.object
ground.scale = (W, D, 1)
mat = bpy.data.materials.new("receiver"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1, 1, 1, 1)
mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1
ground.data.materials.append(mat)
ground.visible_camera = True

# Light: a morning sun and an overcast-ish sky.
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 3.0 if J.get("sun") else 0.0; sun.angle = math.radians(2.5)
so = bpy.data.objects.new("sun", sun); scene.collection.objects.link(so)
so.rotation_euler = (math.radians(55), 0, math.radians(110))   # ~35° up, from the east-south-east
world = bpy.data.worlds.new("w"); world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.75, 0.82, 1.0, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
scene.world = world

# Top-down orthographic camera exactly over the podium top.
cam = bpy.data.cameras.new("c"); cam.type = "ORTHO"; cam.ortho_scale = max(W, D)
co = bpy.data.objects.new("c", cam); scene.collection.objects.link(co)
co.location = ((M["x0"]+M["x1"])/2, -(M["z0"]+M["z1"])/2, 60)
co.rotation_euler = (0, 0, 0)
scene.camera = co

px = 1024   # on the longer axis
scene.render.resolution_x = int(round(px * min(1, W / D) / 8) * 8) or 8
scene.render.resolution_y = int(round(px * min(1, D / W) / 8) * 8) or 8
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.device = "CPU"
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.filepath = "/tmp/bake-ground-lit.png"   # scratch render; only the alpha PNG ships
bpy.ops.render.render(write_still=True)

# Shade -> alpha. Fully lit open ground (the brightest 2%) is alpha 0; the
# darkest shade is alpha SHADE_MAX. The colour is black, so the browser
# multiplies nothing and simply darkens what is under it.
import numpy as np
SHADE_MAX = 0.55
img = bpy.data.images.load(scene.render.filepath)
w, h = img.size
a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
lum = a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
top = np.percentile(lum, 98)
shade = np.clip((top - lum) / max(top, 1e-6), 0, 1) * SHADE_MAX
# Water keeps its own colour: the pools are not paving, so they get no shade.
for pool in J.get("mask", []):
    c0 = int((pool["x0"] - M["x0"]) / W * w); c1 = int((pool["x1"] - M["x0"]) / W * w)
    r0 = int((M["z1"] - pool["z1"]) / D * h);  r1 = int((M["z1"] - pool["z0"]) / D * h)   # pixel rows run bottom-up: row 0 is the +z edge
    shade[min(r0, r1):max(r0, r1), c0:c1] = 0
res = np.zeros((h, w, 4), dtype=np.float32)
res[..., 3] = shade
o = bpy.data.images.new("shade", w, h, alpha=True)
o.pixels = res.ravel().tolist()
o.filepath_raw = out
o.file_format = "PNG"
o.save()
print("baked", w, "x", h, "max shade", float(shade.max()), "mean", float(shade.mean()))
