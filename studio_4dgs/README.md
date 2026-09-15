# studio_4dgs — modello Blender dello studio per la cattura 4DGS

- `PIANO_SETUP_4DGS.md` — il piano: diagnosi, cosa manca/serve, geometria, impostazioni, checklist, letteratura.
- `build_studio.py` — script Blender parametrico (misure studio, volume d'azione, lista camere). Funziona in Blender (`blender --python build_studio.py`) o headless con `pip install "numpy<2" bpy`.
- `out/` — `studio_4dgs.blend`, `pianta.svg` (pianta 2D), `top.png`, `iso.png`, `cam_<camera>.png` (inquadratura di ogni camera), `cameras.csv/json`.
