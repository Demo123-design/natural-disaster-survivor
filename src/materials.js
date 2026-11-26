// Shared cel-shading helpers, so characters and props look like one style.
//
// Art direction (PRD section 8): three flat colour bands plus a dark outline
// drawn as an inverted hull.

import * as THREE from 'three';

export const OUTLINE_COLOR = 0x1b1420;

/** Three flat bands, which is what gives the cel-shaded look. */
export const GRADIENT_MAP = (() => {
  const shades = new Uint8Array([155, 210, 255]);
  const tex = new THREE.DataTexture(shades, shades.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

export function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: GRADIENT_MAP, ...extra });
}

/** Inverted hull outline: the same shape, slightly fattened, drawn inside-out. */
export function addOutline(mesh, scale = 1.06) {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide }),
  );
  outline.scale.multiplyScalar(scale);
  mesh.add(outline);
  return mesh;
}

/** Creates a mesh, positions it, and optionally gives it an outline. */
export function part(
  geometry,
  material,
  x,
  y,
  z,
  parent,
  { outline = true, outlineScale = 1.06, receive = false } = {},
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = receive;
  if (outline) addOutline(mesh, outlineScale);
  parent.add(mesh);
  return mesh;
}

/** Draws into a canvas and returns it as a texture. */
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A vertical two-stop gradient, bottom colour first. */
export function gradientTexture(from, to) {
  return canvasTexture(4, 64, (ctx) => {
    const grad = ctx.createLinearGradient(0, 64, 0, 0);
    grad.addColorStop(0, '#' + from.toString(16).padStart(6, '0'));
    grad.addColorStop(1, '#' + to.toString(16).padStart(6, '0'));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 64);
  });
}
