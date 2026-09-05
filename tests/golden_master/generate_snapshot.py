"""
Regenera snapshot_backend.json a partir del comportamiento actual de app.py.

Solo se ejecuta a mano cuando un cambio de comportamiento es intencional y
ya se ha revisado — nunca para "arreglar" un test en rojo sin mirar por qué
cambió. Ver README.md de este directorio.
"""
import json
import os

from scenario import run_scenario

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    result = run_scenario(REPO_ROOT)
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshot_backend.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")
    print(f"Escrito {out_path}")
