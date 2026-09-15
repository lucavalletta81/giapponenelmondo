"""
Ricostruzione parametrica dello studio per la cattura 4D Gaussian Splatting (danza).

Uso (Blender GUI):   blender --python build_studio.py
Uso (headless/bpy):  python3 build_studio.py            (con `pip install bpy`)

Tutto e' parametrico: cambia le misure in STUDIO/SUBJECT e la lista CAMERAS.
Output nella cartella `out/`:
  - studio_4dgs.blend          scena completa
  - top.png / iso.png          pianta e vista 3/4 con coni di ripresa
  - cam_<nome>.png             inquadratura di ogni camera (verifica framing)
  - cameras.json / cameras.csv posizioni, altezze, tilt, focali, FOV, larghezza campo sul soggetto
"""
import bpy, math, json, csv, os
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ PARAMETRI
# Misure dello studio: NON le ho trovate nei documenti -> assunzioni da correggere.
STUDIO = dict(
    width=6.0,      # X: larghezza (m)
    depth=7.0,      # Y: profondita' (m), fondale sul lato Y = depth
    height=2.8,     # Z: altezza soffitto (m)
    backdrop_y=6.6, # posizione del fondale (m) dal muro frontale
)
# Volume d'azione della ballerina: centro e raggio in pianta, altezza max (salto/braccia)
SUBJECT = dict(cx=3.0, cy=4.6, radius=1.0, height=2.3, head_z=1.62, feet_z=0.15)

# Camere: (nome, sensore_w_mm, sensore_h_mm, focale_mm, azimut_gradi, distanza_m, altezza_m, target_z_m, colore)
# Azimut 0 = davanti alla ballerina (lato pubblico, verso -Y), positivo = verso destra della ballerina (X+).
# target_z e' il punto del corpo che la camera guarda (piedi 0.4, bacino 1.0, volto 1.55).
GOPRO = (6.17, 4.63)      # HERO13 Black, 1/1.9" ~ 6.17x4.63 (approssimato), Linear ~ eq 24mm -> f≈3.3 mm
APSC  = (23.5, 15.6)      # Fujifilm X / Sony A6500
FF    = (36.0, 24.0)      # Sony A7S / Nikon FF
LUNA  = (9.8, 7.4)        # Insta360 Luna Ultra tele 1/1.3" (approssimato), 70mm eq -> f≈19 mm
CAMERAS = [
    # --- ANELLO VICINO: grandangolari (ancore geometriche, tracking). Arco frontale 180°, passo 36°.
    ("GP1_wide_L72",  *GOPRO, 3.3, -72, 2.6, 1.15, 1.0, (0.2,0.6,1.0)),
    ("GP2_wide_L36",  *GOPRO, 3.3, -36, 2.6, 2.35, 0.9, (0.2,0.6,1.0)),
    ("GP3_wide_C",    *GOPRO, 3.3,   0, 2.6, 1.15, 1.0, (0.2,0.6,1.0)),
    ("GP4_wide_R36",  *GOPRO, 3.3,  36, 2.6, 2.35, 0.9, (0.2,0.6,1.0)),
    ("GP5_wide_R72",  *GOPRO, 3.3,  72, 2.6, 1.15, 1.0, (0.2,0.6,1.0)),
    ("GP6_wide_top",  *GOPRO, 3.3,   0, 1.4, 2.65, 0.9, (0.2,0.6,1.0)),   # alta, quasi zenitale: testa/spalle + pavimento
    # --- ANELLO LONTANO: dettaglio. Volto (2) e piedi (2), a ridosso di una grandangolare (baseline corta = match sicuro).
    ("A7S_face_L",    *FF,   50.0, -35, 4.4, 1.60, 1.45, (1.0,0.5,0.1)),
    ("NIKON_face_R",  *FF,   50.0,  35, 4.4, 1.60, 1.45, (1.0,0.5,0.1)),
    ("FUJI_feet_L",   *APSC, 35.0, -18, 4.3, 0.55, 0.35, (0.9,0.2,0.3)),
    ("A6500_feet_R",  *APSC, 35.0,  18, 4.3, 0.55, 0.35, (0.9,0.2,0.3)),
    # --- OPZIONALE: Luna Ultra tele 70mm eq come terza camera volto centrale.
    ("LUNA_face_C",   *LUNA, 19.0,   0, 4.4, 1.70, 1.45, (0.6,0.3,0.9)),
]
FLOOR_MARKERS = True   # tappeto ChArUco/AprilTag + pattern casuale sul pavimento

# ------------------------------------------------------------------ SCENA
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.unit_settings.system = 'METRIC'

def mat(name, rgb, alpha=1.0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*rgb, alpha)
    if alpha < 1: m.blend_method = 'BLEND'
    return m

def box(name, size, loc, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size; o.data.materials.append(m); return o

W, D, H = STUDIO["width"], STUDIO["depth"], STUDIO["height"]
m_floor = mat("floor", (0.55,0.55,0.55)); m_wall = mat("wall", (0.85,0.85,0.82), 0.35)
m_back = mat("backdrop", (0.95,0.95,0.95)); m_sub = mat("subject", (0.9,0.6,0.5))
m_zone = mat("zone", (0.9,0.8,0.2), 0.35); m_mark = mat("markers", (0.1,0.1,0.1))
box("Floor", (W, D, 0.02), (W/2, D/2, -0.01), m_floor)
box("Wall_back", (W, 0.05, H), (W/2, D, H/2), m_wall)
box("Wall_left", (0.05, D, H), (0, D/2, H/2), m_wall)
box("Wall_right", (0.05, D, H), (W, D/2, H/2), m_wall)
box("Backdrop", (W-0.4, 0.03, H-0.1), (W/2, STUDIO["backdrop_y"], (H-0.1)/2), m_back)

# Volume d'azione (cilindro) e ballerina schematica
S = SUBJECT
bpy.ops.mesh.primitive_cylinder_add(radius=S["radius"], depth=S["height"], location=(S["cx"], S["cy"], S["height"]/2))
zone = bpy.context.object; zone.name = "ActionVolume"; zone.data.materials.append(m_zone); zone.display_type = 'WIRE'
bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=1.35, location=(S["cx"], S["cy"], 0.15+0.675))
body = bpy.context.object; body.name = "Dancer_body"; body.data.materials.append(m_sub)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, location=(S["cx"], S["cy"], S["head_z"]))
head = bpy.context.object; head.name = "Dancer_head"; head.data.materials.append(m_sub)
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=1.6, rotation=(0, math.radians(90), 0), location=(S["cx"], S["cy"], 1.35))
arms = bpy.context.object; arms.name = "Dancer_arms"; arms.data.materials.append(m_sub)

if FLOOR_MARKERS:
    # tappeto markers 3x3 m centrato sul volume d'azione + 4 AprilTag agli angoli
    mk = box("MarkerMat", (3.0, 3.0, 0.005), (S["cx"], S["cy"], 0.003), mat("mat", (0.75,0.75,0.75)))
    for i, (dx, dy) in enumerate([(-1.4,-1.4),(1.4,-1.4),(-1.4,1.4),(1.4,1.4)]):
        box(f"AprilTag_{i+1}", (0.25, 0.25, 0.006), (S["cx"]+dx, S["cy"]+dy, 0.006), m_mark)
    # strisce casuali di nastro (pattern NON ripetitivo per il feature matching)
    import random; random.seed(7)
    for i in range(22):
        L = random.uniform(0.15, 0.6); ang = random.uniform(0, math.pi)
        x = S["cx"] + random.uniform(-1.4, 1.4); y = S["cy"] + random.uniform(-1.4, 1.4)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.007), rotation=(0,0,ang))
        t = bpy.context.object; t.scale = (L, 0.05, 0.004); t.name = f"Tape_{i}"; t.data.materials.append(m_mark)

# ------------------------------------------------------------------ CAMERE
def add_camera(name, sw, sh, f, az, dist, hz, tz, rgb):
    a = math.radians(az)
    # azimut 0 = davanti (verso -Y dal soggetto); positivo verso X+
    x = S["cx"] + dist*math.sin(a); y = S["cy"] - dist*math.cos(a)
    cam = bpy.data.cameras.new(name); cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = sw; cam.sensor_height = sh; cam.lens = f
    cam.display_size = 0.35; cam.show_limits = False; cam.clip_end = 30
    o = bpy.data.objects.new(name, cam); scn.collection.objects.link(o); o.location = (x, y, hz); o.color = (*rgb, 1)
    tgt = bpy.data.objects.new(name+"_target", None); scn.collection.objects.link(tgt)
    tgt.location = (S["cx"], S["cy"], tz); tgt.empty_display_size = 0.05
    c = o.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    hfov = 2*math.degrees(math.atan(sw/(2*f))); vfov = 2*math.degrees(math.atan(sh/(2*f)))
    d = math.sqrt((x-S["cx"])**2 + (y-S["cy"])**2 + (hz-tz)**2)
    tilt = math.degrees(math.atan2(tz-hz, math.hypot(x-S["cx"], y-S["cy"])))
    # cono di ripresa (piramide) per la pianta
    ratio = sw/sh; bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0, radius2=1, depth=1, location=(0,0,0))
    cone = bpy.context.object; cone.name = name+"_frustum"; L = d
    cone.scale = (L*math.tan(math.radians(hfov/2))*math.sqrt(2), L*math.tan(math.radians(vfov/2))*math.sqrt(2), L)
    cone.rotation_euler = (0, 0, math.radians(45)); cone.parent = o; cone.matrix_parent_inverse.identity()
    cone.location = (0, 0, -L/2); cone.rotation_euler = (0, 0, math.radians(45))
    cone.display_type = 'WIRE'; cone.data.materials.append(mat(name+"_m", rgb, 0.12)); cone.hide_render = False
    return dict(name=name, x=round(x,2), y=round(y,2), z=hz, azimut=az, distanza=dist, focale=f,
                sensore=f"{sw}x{sh}", focale_eq=round(f*36/sw), hfov=round(hfov,1), vfov=round(vfov,1), tilt=round(tilt,1), target_z=tz,
                campo_largh_m=round(2*d*math.tan(math.radians(hfov/2)),2), campo_alt_m=round(2*d*math.tan(math.radians(vfov/2)),2),
                dist_target_m=round(d,2))

rows = [add_camera(*c) for c in CAMERAS]
with open(os.path.join(OUT, "cameras.json"), "w") as fh: json.dump(dict(studio=STUDIO, subject=SUBJECT, cameras=rows), fh, indent=2, ensure_ascii=False)
with open(os.path.join(OUT, "cameras.csv"), "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)


# ------------------------------------------------------------------ PIANTA 2D (SVG, leggibile)
def svg_plan(path):
    sc = 110; pad = 60; Wp = W*sc + 2*pad; Hp = D*sc + 2*pad
    X = lambda x: pad + x*sc; Y = lambda y: pad + (D - y)*sc
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{Wp}" height="{Hp}" font-family="Helvetica,Arial" font-size="13">',
           f'<rect width="{Wp}" height="{Hp}" fill="white"/>',
           f'<rect x="{X(0)}" y="{Y(D)}" width="{W*sc}" height="{D*sc}" fill="#f4f4f2" stroke="#333" stroke-width="3"/>',
           f'<line x1="{X(0.2)}" y1="{Y(STUDIO["backdrop_y"])}" x2="{X(W-0.2)}" y2="{Y(STUDIO["backdrop_y"])}" stroke="#222" stroke-width="6"/>',
           f'<text x="{X(W/2)}" y="{Y(STUDIO["backdrop_y"])-8}" text-anchor="middle">FONDALE (nessun marker)</text>']
    # tappeto markers, volume d'azione
    if FLOOR_MARKERS:
        out.append(f'<rect x="{X(S["cx"]-1.5)}" y="{Y(S["cy"]+1.5)}" width="{3*sc}" height="{3*sc}" fill="#e6e0c8" stroke="#a09060" stroke-dasharray="6 4"/>')
        out.append(f'<text x="{X(S["cx"]-1.45)}" y="{Y(S["cy"]-1.5)-6}" fill="#7a6a30">tappeto ChArUco/AprilTag + nastro casuale 3x3 m</text>')
        for dx,dy in [(-1.4,-1.4),(1.4,-1.4),(-1.4,1.4),(1.4,1.4)]:
            out.append(f'<rect x="{X(S["cx"]+dx-0.125)}" y="{Y(S["cy"]+dy+0.125)}" width="{0.25*sc}" height="{0.25*sc}" fill="#222"/>')
    out.append(f'<circle cx="{X(S["cx"])}" cy="{Y(S["cy"])}" r="{S["radius"]*sc}" fill="#ffe680" fill-opacity="0.5" stroke="#b09000" stroke-width="2"/>')
    out.append(f'<text x="{X(S["cx"])}" y="{Y(S["cy"])+4}" text-anchor="middle" font-weight="bold">BALLERINA · Ø{2*S["radius"]:.0f} m</text>')
    # coni di ripresa e camere
    for r in rows:
        col = {"wide":"#2b7fd6","face":"#e07b1a","feet":"#c8304c"}[("wide" if "wide" in r["name"] else "face" if "face" in r["name"] else "feet")]
        a = math.radians(r["azimut"]); dirx, diry = -math.sin(a), math.cos(a)   # verso il soggetto
        h = math.radians(r["hfov"]/2); L = r["dist_target_m"] + S["radius"]*1.2
        def rot(vx, vy, t): return (vx*math.cos(t)-vy*math.sin(t), vx*math.sin(t)+vy*math.cos(t))
        p1 = rot(dirx, diry, h); p2 = rot(dirx, diry, -h)
        pts = f'{X(r["x"])},{Y(r["y"])} {X(r["x"]+p1[0]*L)},{Y(r["y"]+p1[1]*L)} {X(r["x"]+p2[0]*L)},{Y(r["y"]+p2[1]*L)}'
        out.append(f'<polygon points="{pts}" fill="{col}" fill-opacity="0.10" stroke="{col}" stroke-opacity="0.5" stroke-width="1"/>')
    for r in rows:
        col = {"wide":"#2b7fd6","face":"#e07b1a","feet":"#c8304c"}[("wide" if "wide" in r["name"] else "face" if "face" in r["name"] else "feet")]
        out.append(f'<circle cx="{X(r["x"])}" cy="{Y(r["y"])}" r="9" fill="{col}" stroke="black" stroke-width="1.5"/>')
        lab = f'{r["name"]}  {r["focale"]:.0f}mm ({r["focale_eq"]} eq) · h {r["z"]:.2f} m · tilt {r["tilt"]:+.0f}°'
        ty = Y(r["y"]) - 14 if r["y"] > 1.0 else Y(r["y"]) + 24
        out.append(f'<text x="{X(r["x"])}" y="{ty}" text-anchor="middle" font-size="11" font-weight="bold" fill="{col}">{lab}</text>')
    # quote
    out.append(f'<text x="{X(W/2)}" y="{Y(0)+30}" text-anchor="middle" fill="#555">larghezza studio {W:.1f} m · profondita {D:.1f} m · soffitto {H:.1f} m (ASSUNZIONI, da misurare)</text>')
    out.append(f'<text x="{X(0)+4}" y="{Y(D)-10}" fill="#555" font-size="12">Blu = grandangolari vicine (ancore) · Arancio = volto (tele) · Rosso = piedi (tele)</text>')
    out.append('</svg>'); open(path, "w").write("\n".join(out))
svg_plan(os.path.join(OUT, "pianta.svg"))

# Verifica geometrica: angolo tra camere adiacenti dell'anello grandangolare
wides = sorted([r for r in rows if "wide" in r["name"] and "top" not in r["name"]], key=lambda r: r["azimut"])
gaps = [wides[i+1]["azimut"]-wides[i]["azimut"] for i in range(len(wides)-1)]
print("Passo angolare anello grandangolare:", gaps)

# ------------------------------------------------------------------ LUCI (indicative)
for i, (x, y) in enumerate([(0.6, 2.2), (W-0.6, 2.2), (0.6, 5.8), (W-0.6, 5.8)]):
    l = bpy.data.lights.new(f"Soft_{i+1}", 'AREA'); l.energy = 400; l.size = 1.2; l.shape = 'SQUARE'
    o = bpy.data.objects.new(f"Soft_{i+1}", l); scn.collection.objects.link(o); o.location = (x, y, H-0.2)
    t = o.constraints.new('TRACK_TO'); t.target = body; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'

# ------------------------------------------------------------------ RENDER (Workbench, senza GPU)
scn.render.engine = 'BLENDER_WORKBENCH'
scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'MATERIAL'
scn.display.shading.show_object_outline = True; scn.display.shading.show_xray = False
scn.render.film_transparent = False; scn.render.resolution_percentage = 100
scn.view_settings.view_transform = 'Standard'
for o in bpy.data.objects:
    if o.type == 'CAMERA': o.show_name = True

def overview(name, loc, tgt, ortho=None, res=(1600, 1400)):
    cam = bpy.data.cameras.new(name); o = bpy.data.objects.new(name, cam); scn.collection.objects.link(o)
    o.location = loc; e = bpy.data.objects.new(name+"_t", None); scn.collection.objects.link(e); e.location = tgt
    c = o.constraints.new('TRACK_TO'); c.target = e; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    if ortho: cam.type = 'ORTHO'; cam.ortho_scale = ortho
    cam.clip_end = 50; scn.camera = o; scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)

overview("top", (W/2, D/2, 25), (W/2, D/2+0.001, 0), ortho=8.0)
overview("iso", (W/2+9, -7, 7.5), (W/2, D/2+0.5, 0.9))

# inquadratura di ciascuna camera (senza i coni, altrimenti coprono tutto)
for o in bpy.data.objects:
    if o.name.endswith("_frustum"): o.hide_render = True
for r in rows:
    o = bpy.data.objects[r["name"]]; scn.camera = o
    sw, sh = map(float, r["sensore"].split("x")); scn.render.resolution_x = 960; scn.render.resolution_y = int(960*sh/sw)
    scn.render.filepath = os.path.join(OUT, "cam_" + r["name"] + ".png"); bpy.ops.render.render(write_still=True)
for o in bpy.data.objects:
    if o.name.endswith("_frustum"): o.hide_render = False

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "studio_4dgs.blend"))
print("OK ->", OUT)
