"""Build the Cybertruck's visual skin as a small, static glTF asset.

The browser keeps the procedural truck for collision, driving, cameras and
the cabin.  This file only authors the exterior people see while walking or
using the chase camera:

    blender -b -P tools/build-cybertruck.py -- models/cybertruck.glb
    blender -b -P tools/build-cybertruck.py -- models/cybertruck.glb /tmp/cybertruck.png

The optional second argument renders a studio proof.  No scratch images are
written beside the shipped model.
"""
import bpy
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
out = os.path.abspath(args[0] if args else "models/cybertruck.glb")
preview = os.path.abspath(args[1]) if len(args) > 1 else None
os.makedirs(os.path.dirname(out), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0.0, roughness=0.5, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = 2.5
    return mat


steel = material("brushed stainless", (0.42, 0.48, 0.53), 0.86, 0.27)
steel_dark = material("lower stainless", (0.18, 0.21, 0.23), 0.74, 0.36)
glass = material("smoked glass", (0.025, 0.045, 0.06), 0.25, 0.12)
rubber = material("tire", (0.018, 0.021, 0.024), 0.05, 0.72)
rim_mat = material("wheel metal", (0.17, 0.19, 0.21), 0.82, 0.24)
light = material("front light", (0.78, 0.9, 1.0), 0.0, 0.22, (0.65, 0.86, 1.0))
red = material("rear light", (0.28, 0.005, 0.003), 0.0, 0.28, (1.0, 0.02, 0.01))

model = bpy.data.collections.new("CYBERTRUCK_HERO")
bpy.context.scene.collection.children.link(model)


def link_object(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    model.objects.link(obj)
    return obj


def box(name, location, scale, mat, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("edge break", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return link_object(obj)


def panel(name, vertices, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    model.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


# Three.js is X-right/Y-up/Z-aft. Blender is X-right/Y-forward/Z-up, so
# (x, y, z)_three becomes (x, -z, y)_blender. This is converted back to
# Y-up by the glTF exporter.
profile = [(-2.60, 0.45), (-2.60, 0.92), (-0.25, 1.82), (2.60, 1.18), (2.60, 0.45)]
half = 1.0


def inset(height):
    return ((height - 0.45) / (1.82 - 0.45)) * 0.42


vertices = []
for side in (-1, 1):
    for z, height in profile:
        vertices.append((side * (half - inset(height)), -z, height))
n = len(profile)
faces = []
for i in range(1, n - 1):
    faces.append((0, i + 1, i))
    faces.append((n, n + i, n + i + 1))
for i in range(n):
    j = (i + 1) % n
    faces.append((i, j, n + j, n + i))

mesh = bpy.data.meshes.new("faceted monocoque")
mesh.from_pydata(vertices, [], faces)
mesh.update()
body = bpy.data.objects.new("stainless monocoque", mesh)
model.objects.link(body)
body.data.materials.append(steel)
bevel = body.modifiers.new("manufactured edge", "BEVEL")
bevel.width = 0.028
bevel.segments = 2

# Lower rockers add visual mass without changing the collision silhouette.
box("left rocker", (-0.94, 0.0, 0.53), (0.07, 2.18, 0.14), steel_dark, 0.018)
box("right rocker", (0.94, 0.0, 0.53), (0.07, 2.18, 0.14), steel_dark, 0.018)

# Surface-matched glass. Rotated boxes were rejected because their centre
# pivots made the windscreen float above the monocoque.
panel("windshield", [
    (-0.84, 2.58, 0.94), (0.84, 2.58, 0.94),
    (0.57, 0.27, 1.80), (-0.57, 0.27, 1.80),
], glass)
panel("roof glass", [
    (-0.55, 0.20, 1.79), (0.55, 0.20, 1.79),
    (0.69, -1.46, 1.43), (-0.69, -1.46, 1.43),
], glass)
for side in (-1, 1):
    x = side * 0.806
    panel("left side glass" if side < 0 else "right side glass", [
        (x, 1.28, 1.00), (x, 0.18, 1.72),
        (x, -1.48, 1.38), (x, -1.82, 1.04),
    ], glass)

# The only curves are functional circles: four low-poly tires and hubs.
for x in (-0.96, 0.96):
    for z_three in (-1.70, 1.70):
        y = -z_three
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.43, depth=0.30,
            location=(x, y, 0.43), rotation=(0, math.pi / 2, 0))
        tire = link_object(bpy.context.object)
        tire.name = "tire"
        tire.data.materials.append(rubber)
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.255, depth=0.312,
            location=(x, y, 0.43), rotation=(0, math.pi / 2, 0))
        wheel_rim = link_object(bpy.context.object)
        wheel_rim.name = "wheel rim"
        wheel_rim.data.materials.append(rim_mat)
        bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.09, depth=0.324,
            location=(x, y, 0.43), rotation=(0, math.pi / 2, 0))
        hub = link_object(bpy.context.object)
        hub.name = "hub"
        hub.data.materials.append(steel)

box("front light bar", (0, 2.612, 0.88), (0.91, 0.018, 0.030), light, 0.008)
box("rear light bar", (0, -2.612, 0.86), (0.91, 0.018, 0.035), red, 0.008)
box("front bumper", (0, 2.56, 0.48), (0.91, 0.10, 0.075), steel_dark, 0.018)
box("rear bumper", (0, -2.56, 0.48), (0.91, 0.10, 0.075), steel_dark, 0.018)

# Export only the authored exterior. Collision, cabin, camera and lights stay
# in the browser and therefore cannot drift from the mechanics.
bpy.ops.object.select_all(action="DESELECT")
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True,
    export_apply=True, export_yup=True, export_materials="EXPORT",
    export_cameras=False, export_lights=False)


def triangle_count():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in model.objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        evaluated_mesh = evaluated.to_mesh()
        evaluated_mesh.calc_loop_triangles()
        total += len(evaluated_mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total


if preview:
    # A review render, never part of the deployed site.
    box("studio floor", (0, 0, -0.04), (7, 7, 0.04),
        material("floor", (0.035, 0.04, 0.045), 0, 0.82), 0)
    world = bpy.data.worlds.new("studio world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.024, 0.032, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.38
    bpy.context.scene.world = world

    def area(name, location, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector((0, 0, 0.75)) - obj.location).to_track_quat("-Z", "Y").to_euler()

    area("key", (4.5, 5.5, 6.0), 1300, 4.0, (0.78, 0.88, 1.0))
    area("rim", (-4.0, -4.5, 4.0), 950, 3.0, (1.0, 0.54, 0.26))
    area("fill", (-4.5, 3.0, 2.0), 600, 3.5, (0.34, 0.55, 1.0))
    camera_data = bpy.data.cameras.new("camera")
    camera = bpy.data.objects.new("camera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = (7.2, 8.6, 4.5)
    camera.rotation_euler = (Vector((0, 0, 0.75)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 55
    bpy.context.scene.camera = camera
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = preview
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)

print("MODEL", out, os.path.getsize(out), "bytes", triangle_count(), "triangles")
if preview:
    print("RENDER", preview)
