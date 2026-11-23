#!/usr/bin/env python3
"""Rebuild the spinning-disc model into a lean binary GLB without changing its look.

Usage:
  python3 scripts/optimize_disc.py [IN.gltf] [OUT.glb] [--max-texture N]

Defaults: public/spinning-disc.gltf -> public/spinning-disc.glb

Transformations (each one is verified against the actual pixel data and
skipped if the precondition does not hold, so the rendered result is unchanged):
  * metallicRoughnessTexture whose G and B channels are constant -> folded into
    roughnessFactor / metallicFactor, texture dropped.
  * KHR_materials_specular whose specularTexture alpha is constant (three.js only
    reads .a) and that has no specularColorTexture -> folded into specularFactor;
    the extension is dropped entirely when it ends up at its defaults.
  * --opaque (optional): alphaMode BLEND whose baseColor alpha is 1 everywhere
    -> OPAQUE. Saves one draw call but is NOT pixel-identical: the transparent
    two-pass (back faces, then front faces, no depth write) ordering differs
    from depth-tested opaque on a handful of pixels inside the disc.
  * Unused textures / images / samplers pruned.
  * Base64 data URIs replaced by a single binary chunk (GLB).
  * --max-texture N (optional, NOT identity-preserving by construction):
    halves textures with a 2x2 box filter until <= N, matching what WebGL's
    generateMipmap produces for the levels that remain.

Requires Pillow.
"""
import argparse
import base64
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def decode_uri(uri):
    if not uri.startswith("data:"):
        raise SystemExit(f"external URI not supported: {uri[:60]}")
    return base64.b64decode(uri.split(",", 1)[1])


def constant_channels(img, bands):
    """Return {band: value} if every listed band is constant over the full image, else None."""
    out = {}
    for b in bands:
        if b not in img.getbands():
            if b == "A":
                out[b] = 255
                continue
            return None
        lo, hi = img.getchannel(b).getextrema()
        if lo != hi:
            return None
        out[b] = lo
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", nargs="?", default=str(ROOT / "public/spinning-disc.gltf"))
    ap.add_argument("dst", nargs="?", default=str(ROOT / "public/spinning-disc.glb"))
    ap.add_argument("--max-texture", type=int, default=None)
    ap.add_argument("--opaque", action="store_true")
    args = ap.parse_args()

    gltf = json.loads(Path(args.src).read_text())
    if len(gltf.get("buffers", [])) != 1:
        sys.exit("expected exactly one buffer")
    bin_data = bytearray(decode_uri(gltf["buffers"][0]["uri"]))

    images_bytes = [decode_uri(im["uri"]) for im in gltf["images"]]
    pil_cache = {}

    def tex_image(tex_index):
        src = gltf["textures"][tex_index]["source"]
        if src not in pil_cache:
            pil_cache[src] = Image.open(io.BytesIO(images_bytes[src]))
            pil_cache[src].load()
        return pil_cache[src]

    log = []
    for mat in gltf.get("materials", []):
        name = mat.get("name", "?")
        pbr = mat.get("pbrMetallicRoughness", {})

        # 1. constant metallic/roughness texture -> factors
        mr = pbr.get("metallicRoughnessTexture")
        if mr:
            c = constant_channels(tex_image(mr["index"]), ["G", "B"])
            if c:
                pbr["roughnessFactor"] = pbr.get("roughnessFactor", 1.0) * c["G"] / 255
                pbr["metallicFactor"] = pbr.get("metallicFactor", 1.0) * c["B"] / 255
                del pbr["metallicRoughnessTexture"]
                log.append(f"{name}: folded constant metallicRoughness (G={c['G']}, B={c['B']}) -> "
                           f"roughness={pbr['roughnessFactor']:.6f} metallic={pbr['metallicFactor']:.6f}")
            else:
                log.append(f"{name}: metallicRoughness not constant, kept")

        # 2. no-op KHR_materials_specular
        spec = mat.get("extensions", {}).get("KHR_materials_specular")
        if spec and "specularColorTexture" not in spec:
            st = spec.get("specularTexture")
            c = constant_channels(tex_image(st["index"]), ["A"]) if st else {"A": 255}
            if c:
                spec["specularFactor"] = spec.get("specularFactor", 1.0) * c["A"] / 255
                spec.pop("specularTexture", None)
                if spec["specularFactor"] == 1.0 and spec.get("specularColorFactor", [1, 1, 1]) == [1, 1, 1]:
                    del mat["extensions"]["KHR_materials_specular"]
                    if not mat["extensions"]:
                        del mat["extensions"]
                    log.append(f"{name}: dropped KHR_materials_specular (specular texture alpha={c['A']} == default)")
                else:
                    log.append(f"{name}: folded specular texture into specularFactor={spec['specularFactor']}")

        # 3. BLEND with opaque alpha everywhere -> OPAQUE (opt-in, see docstring)
        if args.opaque and mat.get("alphaMode") == "BLEND":
            factor_a = pbr.get("baseColorFactor", [1, 1, 1, 1])[3]
            bc = pbr.get("baseColorTexture")
            c = constant_channels(tex_image(bc["index"]), ["A"]) if bc else {"A": 255}
            if factor_a == 1 and c and c["A"] == 255:
                del mat["alphaMode"]
                log.append(f"{name}: alphaMode BLEND -> OPAQUE (alpha is 1 everywhere)")
            else:
                log.append(f"{name}: BLEND kept (alpha varies)")

    # Drop extensions no longer used anywhere.
    used_ext = set()
    for mat in gltf.get("materials", []):
        used_ext.update(mat.get("extensions", {}).keys())
    if "extensions" in gltf:
        used_ext.update(gltf["extensions"].keys())
    for node in gltf.get("nodes", []):
        used_ext.update(node.get("extensions", {}).keys())
    gltf["extensionsUsed"] = [e for e in gltf.get("extensionsUsed", []) if e in used_ext]
    if not gltf["extensionsUsed"]:
        del gltf["extensionsUsed"]

    # Prune unused textures / images / samplers and remap indices.
    tex_refs = []

    def collect(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k.endswith("Texture") and isinstance(v, dict) and "index" in v:
                    tex_refs.append(v)
                collect(v)
        elif isinstance(obj, list):
            for v in obj:
                collect(v)

    collect(gltf.get("materials", []))
    used_tex = sorted({r["index"] for r in tex_refs})
    tex_map = {old: new for new, old in enumerate(used_tex)}
    for r in tex_refs:
        r["index"] = tex_map[r["index"]]
    textures = [gltf["textures"][i] for i in used_tex]

    used_img = sorted({t["source"] for t in textures})
    img_map = {old: new for new, old in enumerate(used_img)}
    used_smp = sorted({t["sampler"] for t in textures if "sampler" in t})
    smp_map = {old: new for new, old in enumerate(used_smp)}
    for t in textures:
        t["source"] = img_map[t["source"]]
        if "sampler" in t:
            t["sampler"] = smp_map[t["sampler"]]
    gltf["textures"] = textures
    gltf["samplers"] = [gltf["samplers"][i] for i in used_smp]
    dropped = len(images_bytes) - len(used_img)
    if dropped:
        log.append(f"pruned {dropped} unused image(s)")

    # Images -> bufferViews in the binary chunk.
    new_images = []
    for old_i in used_img:
        im = gltf["images"][old_i]
        data = images_bytes[old_i]
        if args.max_texture:
            img = Image.open(io.BytesIO(data))
            orig = img.size
            while max(img.size) > args.max_texture:
                img = img.reduce(2)
            if img.size != orig:
                buf = io.BytesIO()
                img.save(buf, "PNG", optimize=True)
                data = buf.getvalue()
                log.append(f"image {old_i}: {orig[0]}x{orig[1]} -> {img.size[0]}x{img.size[1]}")
        while len(bin_data) % 4:
            bin_data.append(0)
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(bin_data), "byteLength": len(data)})
        bin_data.extend(data)
        entry = {"bufferView": len(gltf["bufferViews"]) - 1, "mimeType": im.get("mimeType", "image/png")}
        if "name" in im:
            entry["name"] = im["name"]
        new_images.append(entry)
    gltf["images"] = new_images

    while len(bin_data) % 4:
        bin_data.append(0)
    gltf["buffers"] = [{"byteLength": len(bin_data)}]

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode()
    json_bytes += b" " * (-len(json_bytes) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    with open(args.dst, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        f.write(json_bytes)
        f.write(struct.pack("<II", len(bin_data), 0x004E4942))
        f.write(bin_data)

    for line in log:
        print(" -", line)
    print(f"{args.src} ({Path(args.src).stat().st_size / 2**20:.1f} MB) -> "
          f"{args.dst} ({total / 2**20:.1f} MB)")


if __name__ == "__main__":
    main()
