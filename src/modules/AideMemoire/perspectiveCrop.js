/**
 * perspectiveCrop.js — Aide-Mémoire
 * Redressement "4 coins" (comme une appli de scan) : l'utilisateur pointe les
 * 4 coins de la feuille sur la photo, on calcule l'homographie qui les
 * ramène à un rectangle droit, puis on rééchantillonne l'image pixel par
 * pixel (bilinéaire) le long de cette transformation inverse. Nécessaire
 * car une photo prise à main levée est rarement bien à plat/perpendiculaire
 * à l'objectif — la déformation n'est pas qu'une rotation, mais une vraie
 * perspective (trapèze), que `drawImage` seul ne sait pas corriger.
 */

// Résout le système 8x8 par élimination de Gauss avec pivot partiel.
function solve8x8(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    for (let c = col; c <= n; c += 1) M[col][c] /= pv;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c += 1) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map(row => row[n]);
}

/**
 * Calcule la fonction (x,y) [rectangle destination] → (x,y) [photo source]
 * à partir des 4 coins pointés par l'utilisateur (ordre : haut-gauche,
 * haut-droit, bas-droit, bas-gauche).
 */
export function computeInverseMapping(dstQuad, srcQuad) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = dstQuad[i];
    const { x: X, y: Y } = srcQuad[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const [a, bb, c, d, e, f, g, h] = solve8x8(A, b);
  return (x, y) => {
    const w = g * x + h * y + 1;
    return { x: (a * x + bb * y + c) / w, y: (d * x + e * y + f) / w };
  };
}

/**
 * Redresse `source` (image ou canvas) selon les 4 coins `srcQuad` (en
 * pixels de `source`) vers un rectangle `outWidth`×`outHeight`.
 * Retourne un canvas.
 */
export function warpPerspective(source, srcQuad, outWidth, outHeight) {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = sw; srcCanvas.height = sh;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(source, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

  const dstQuad = [{ x: 0, y: 0 }, { x: outWidth, y: 0 }, { x: outWidth, y: outHeight }, { x: 0, y: outHeight }];
  const mapToSource = computeInverseMapping(dstQuad, srcQuad);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outWidth; outCanvas.height = outHeight;
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(outWidth, outHeight);
  const outData = outImg.data;

  for (let y = 0; y < outHeight; y += 1) {
    for (let x = 0; x < outWidth; x += 1) {
      const { x: sx, y: sy } = mapToSource(x, y);
      const di = (y * outWidth + x) * 4;
      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        outData[di] = 255; outData[di + 1] = 255; outData[di + 2] = 255; outData[di + 3] = 255;
        continue;
      }
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let ch = 0; ch < 3; ch += 1) {
        const top = srcData[i00 + ch] + (srcData[i10 + ch] - srcData[i00 + ch]) * fx;
        const bot = srcData[i01 + ch] + (srcData[i11 + ch] - srcData[i01 + ch]) * fx;
        outData[di + ch] = top + (bot - top) * fy;
      }
      outData[di + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}
