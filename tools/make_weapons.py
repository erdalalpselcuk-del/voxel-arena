#!/usr/bin/env python3
"""Silah modelleyici.

Her silah kutu ve silindir parçalarından oluşur. Birimler metre, namlu -Z yönüne bakar,
orijin tutuş noktasıdır. Bu betik iki çıktı üretir:

  public/weapon_models.js   oyunun kullandığı model verisi
  tools/blender_weapons.py  aynı modelleri Blender'da oluşturan betik (düzenleme için)

Çalıştırma: python3 tools/make_weapons.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# renk paleti
GUNMETAL = '#3a3f44'
DARK = '#1b1d1f'
BLACK = '#111214'
STEEL = '#8c949b'
WOOD = '#8b5a2b'
WOOD_D = '#6b4220'
OLIVE = '#4b5a35'
ORANGE = '#ff8a00'
RED = '#b3261e'
TAN = '#b9a37a'


def box(x, y, z, sx, sy, sz, c, rx=0.0, ry=0.0, rz=0.0):
    assert sum(1 for r in (rx, ry, rz) if r) <= 1, 'parça başına tek eksen dönüşü'
    return {'k': 'b', 'p': [x, y, z], 's': [sx, sy, sz], 'c': c, 'r': [rx, ry, rz]}


def cyl(x, y, z, d, length, c):
    """Ekseni Z boyunca silindir (namlu, tüp)."""
    return {'k': 'c', 'p': [x, y, z], 's': [d, d, length], 'c': c, 'r': [0, 0, 0]}


WEAPONS = []


def weapon(name, parts, muzzle, hands, pos=(0.22, -0.22, -0.45), tp=(0.0, 0.0, 0.0)):
    WEAPONS.append({'name': name, 'parts': parts, 'muzzle': list(muzzle), 'hands': [list(h) for h in hands],
                    'pos': list(pos), 'tp': list(tp)})


# 0 Levye: uçta kancası olan kırmızı çelik çubuk
weapon('Levye', [
    box(0, 0.07, -0.28, 0.035, 0.035, 0.60, RED, rx=0.45),
    box(0, 0.166, -0.60, 0.035, 0.035, 0.13, RED, rx=-0.6),
    box(0, -0.02, -0.07, 0.04, 0.04, 0.16, DARK, rx=0.45),
    box(0, 0.015, -0.17, 0.045, 0.045, 0.02, STEEL, rx=0.45),
], muzzle=(0, 0.2, -0.6), hands=[(0, -0.02, -0.05)], pos=(0.2, -0.3, -0.35))

# 1 Tabanca
weapon('Tabanca', [
    box(0, 0.045, -0.11, 0.040, 0.045, 0.22, GUNMETAL),
    box(0, 0.012, -0.10, 0.036, 0.030, 0.20, DARK),
    cyl(0, 0.045, -0.235, 0.022, 0.03, BLACK),
    box(0, -0.045, 0.0, 0.036, 0.11, 0.05, '#1a1a1a', rx=-0.2),
    box(0, -0.012, -0.05, 0.02, 0.012, 0.07, DARK),
    box(0, 0.073, -0.2, 0.01, 0.012, 0.012, ORANGE),
    box(0, 0.073, -0.01, 0.02, 0.012, 0.012, DARK),
], muzzle=(0, 0.045, -0.25), hands=[(0, -0.03, 0.01)], pos=(0.2, -0.2, -0.4))

# 2 SMG: alt tüpü bomba atar şeklinde
weapon('SMG', [
    box(0, 0.04, -0.15, 0.050, 0.075, 0.30, '#2a2d30'),
    box(0, 0.09, -0.14, 0.040, 0.020, 0.22, DARK),
    cyl(0, 0.05, -0.37, 0.026, 0.14, BLACK),
    cyl(0, 0.05, -0.455, 0.034, 0.04, DARK),
    box(0, -0.05, -0.12, 0.030, 0.14, 0.05, DARK, rx=0.15),
    box(0, -0.01, -0.28, 0.040, 0.07, 0.06, '#2a2d30'),
    box(0, -0.04, -0.02, 0.035, 0.10, 0.045, DARK, rx=-0.25),
    box(0, 0.03, 0.14, 0.040, 0.055, 0.16, '#2a2d30'),
    cyl(0, -0.012, -0.34, 0.04, 0.17, OLIVE),
    box(0, 0.108, -0.22, 0.012, 0.016, 0.012, ORANGE),
], muzzle=(0, 0.05, -0.475), hands=[(0, -0.05, -0.02), (0, -0.04, -0.28)])

# 3 Pompalı
weapon('Pompalı', [
    cyl(0, 0.05, -0.38, 0.03, 0.50, DARK),
    cyl(0, 0.012, -0.34, 0.028, 0.42, '#2a2d30'),
    box(0, 0.035, -0.07, 0.05, 0.07, 0.20, '#2a2d30'),
    box(0, 0.0, -0.30, 0.055, 0.05, 0.14, WOOD_D),
    box(0, 0.0, 0.18, 0.045, 0.09, 0.26, WOOD, rx=0.12),
    box(0, 0.075, -0.62, 0.01, 0.014, 0.012, ORANGE),
    box(0, -0.03, 0.0, 0.03, 0.09, 0.04, DARK, rx=-0.2),
], muzzle=(0, 0.05, -0.64), hands=[(0, -0.05, 0.04), (0, -0.04, -0.30)])

# 4 Tüfek
weapon('Tüfek', [
    box(0, 0.04, -0.12, 0.045, 0.07, 0.28, '#2a2d30'),
    box(0, 0.082, -0.12, 0.040, 0.02, 0.24, GUNMETAL),
    cyl(0, 0.055, -0.42, 0.024, 0.28, BLACK),
    cyl(0, 0.092, -0.40, 0.022, 0.22, '#2a2d30'),
    box(0, 0.04, -0.35, 0.050, 0.055, 0.20, WOOD),
    box(0, 0.085, -0.53, 0.01, 0.03, 0.01, BLACK),
    box(0, -0.045, -0.14, 0.030, 0.10, 0.05, '#2b2b2b', rx=0.1),
    box(0, -0.12, -0.12, 0.030, 0.08, 0.05, '#2b2b2b', rx=0.35),
    box(0, -0.05, 0.0, 0.035, 0.10, 0.045, WOOD_D, rx=-0.3),
    box(0, 0.02, 0.2, 0.040, 0.08, 0.22, WOOD, rx=0.1),
    box(0, 0.108, -0.01, 0.012, 0.016, 0.012, ORANGE),
], muzzle=(0, 0.055, -0.57), hands=[(0, -0.06, 0.0), (0, -0.03, -0.34)])

# 5 Nişancı tüfeği: dürbünlü
weapon('Nişancı', [
    cyl(0, 0.05, -0.42, 0.03, 0.60, DARK),
    box(0, 0.04, -0.10, 0.045, 0.075, 0.30, OLIVE),
    box(0, 0.035, -0.32, 0.05, 0.06, 0.20, '#3a4a2a'),
    cyl(0, 0.12, -0.12, 0.045, 0.26, BLACK),
    cyl(0, 0.12, -0.26, 0.06, 0.05, DARK),
    cyl(0, 0.12, 0.02, 0.06, 0.05, DARK),
    box(0, 0.085, -0.18, 0.02, 0.03, 0.02, GUNMETAL),
    box(0, 0.085, -0.04, 0.02, 0.03, 0.02, GUNMETAL),
    box(0.04, 0.05, -0.02, 0.05, 0.015, 0.015, STEEL),
    box(0, 0.0, 0.2, 0.045, 0.09, 0.28, OLIVE, rx=0.1),
], muzzle=(0, 0.05, -0.74), hands=[(0, -0.05, 0.05), (0, -0.02, -0.25)])

# 6 Arbalet
weapon('Arbalet', [
    box(0, 0.0, -0.10, 0.04, 0.07, 0.55, '#2e3338'),
    box(0, 0.05, -0.18, 0.025, 0.02, 0.40, '#555d65'),
    box(0, 0.03, -0.38, 0.50, 0.025, 0.03, '#2e3338'),
    box(0.27, 0.03, -0.42, 0.12, 0.02, 0.03, '#2e3338', ry=0.5),
    box(-0.27, 0.03, -0.42, 0.12, 0.02, 0.03, '#2e3338', ry=-0.5),
    box(0, 0.03, -0.30, 0.50, 0.005, 0.005, '#d9d9d9'),
    cyl(0, 0.058, -0.2, 0.012, 0.38, '#c8c8c8'),
    cyl(0, 0.058, -0.4, 0.018, 0.04, ORANGE),
    box(0, -0.06, 0.05, 0.035, 0.10, 0.045, DARK, rx=-0.2),
    cyl(0, 0.095, -0.1, 0.03, 0.10, BLACK),
], muzzle=(0, 0.058, -0.42), hands=[(0, -0.06, 0.06), (0, -0.01, -0.22)])

# 7 Roketatar
weapon('Roketatar', [
    cyl(0, 0.04, -0.25, 0.13, 0.70, OLIVE),
    cyl(0, 0.04, -0.62, 0.16, 0.08, '#2e3338'),
    cyl(0, 0.04, 0.12, 0.15, 0.10, '#2e3338'),
    cyl(0, 0.04, -0.69, 0.09, 0.06, '#8b2b1e'),
    cyl(0, 0.04, -0.45, 0.135, 0.04, ORANGE),
    box(0, -0.07, -0.05, 0.04, 0.11, 0.05, DARK, rx=-0.1),
    box(0, -0.07, -0.30, 0.04, 0.09, 0.05, DARK),
    box(0, 0.12, -0.2, 0.02, 0.05, 0.04, GUNMETAL),
    box(0, 0.145, -0.2, 0.008, 0.02, 0.008, ORANGE),
], muzzle=(0, 0.04, -0.72), hands=[(0, -0.08, -0.05), (0, -0.08, -0.30)], pos=(0.24, -0.26, -0.5))


def r(v):
    return round(v, 4)


def clean(w):
    out = dict(w)
    out['parts'] = [{'k': p['k'], 'p': [r(v) for v in p['p']], 's': [r(v) for v in p['s']], 'c': p['c'],
                     'r': [r(v) for v in p['r']]} for p in w['parts']]
    return out


def main():
    data = [clean(w) for w in WEAPONS]
    js = '// Otomatik üretildi: tools/make_weapons.py\nwindow.WEAPON_MODELS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(os.path.join(ROOT, 'public', 'weapon_models.js'), 'w', encoding='utf-8') as f:
        f.write(js)

    bpy = BLENDER_TEMPLATE.replace('__DATA__', json.dumps(data, ensure_ascii=False))
    with open(os.path.join(ROOT, 'tools', 'blender_weapons.py'), 'w', encoding='utf-8') as f:
        f.write(bpy)

    for w in data:
        print('%-10s %2d parça' % (w['name'], len(w['parts'])))
    print('weapon_models.js: %d bayt' % len(js.encode('utf-8')))


BLENDER_TEMPLATE = r'''# Blender 3.x / 4.x: Scripting sekmesinde bu dosyayı aç ve Run Script'e bas.
# Her silahı kendi nesnesi olarak yan yana oluşturur. Düzenleyip File > Export > glTF ile dışa aktarabilirsin.
# NOT: Bu betik Blender'ın kendisinde denenmedi. tools/make_weapons.py çıktısıyla aynı parça verisini kullanır.
import bpy
import math
import json

DATA = json.loads(r"""__DATA__""")
_mats = {}


def material(hexcolor):
    if hexcolor in _mats:
        return _mats[hexcolor]
    m = bpy.data.materials.new('W' + hexcolor.lstrip('#'))
    m.use_nodes = True
    h = hexcolor.lstrip('#')
    rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        bsdf.inputs['Roughness'].default_value = 0.6
    _mats[hexcolor] = m
    return m


def build(w, offset_x):
    # oyundaki eksenler (x, y yukarı, z geriye) -> Blender (x, -z, y)
    objs = []
    for p in w['parts']:
        x, y, z = p['p']
        sx, sy, sz = p['s']
        loc = (x + offset_x, -z, y)
        if p['k'] == 'b':
            bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
            o = bpy.context.active_object
            o.scale = (sx, sz, sy)
            rx, ry, rz = p['r']
            o.rotation_euler = (rx, -rz, ry)
        else:
            bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=sx / 2, depth=sz, location=loc,
                                                rotation=(math.pi / 2, 0, 0))
            o = bpy.context.active_object
        o.data.materials.append(material(p['c']))
        objs.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = w['name']


for i, w in enumerate(DATA):
    build(w, i * 1.2)
'''

if __name__ == '__main__':
    main()
