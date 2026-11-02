/**
 * Lay a baked shade over a patch of ground.
 *
 * The image is black with the shade in its alpha channel, baked offline in
 * Blender (tools/bake-ground.py) from the geometry the browser itself
 * builds (tools/export-building.mjs). It maps planar over `rect`, in the
 * building group's own coordinates, so it needs no UV set and the geometry
 * never changes. The plane stays hidden until the image has arrived: a
 * failed or slow fetch leaves the room exactly as it was, never a white
 * sheet.
 */
export function layShade(THREE, group, rect, url) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, depthWrite: false, visible: false,
  });
  const w = rect.x1 - rect.x0, d = rect.z1 - rect.z0;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set((rect.x0 + rect.x1) / 2, rect.y + 0.004, (rect.z0 + rect.z1) / 2);
  plane.renderOrder = 1;
  group.add(plane);
  new THREE.TextureLoader().load(url, (tex) => {
    mat.map = tex;
    mat.visible = true;
    mat.needsUpdate = true;
  }, undefined, () => {});
  return plane;
}
