"""
Golden master: compara el comportamiento actual de app.py e index.html
contra los snapshots congelados (snapshot_backend.json / snapshot_frontend.json).

Ningún bloque del refactor (docs/ARCHITECTURE.md) se da por válido si estos
tests no pasan. Si un cambio de comportamiento es intencional (p.ej. se
decide corregir el bug de zona horaria documentado en run_frontend_harness.mjs),
se revisa el diff a mano, se regenera con generate_snapshot.py / el propio
harness Node, y se documenta por qué en el commit — nunca se regenera solo
para que un test en rojo se calle.
"""
import json
import os
import subprocess
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)

sys.path.insert(0, HERE)
from scenario import run_scenario  # noqa: E402


def _load(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return json.load(f)


def test_backend_matches_snapshot():
    expected = _load("snapshot_backend.json")
    actual = run_scenario(REPO_ROOT)
    assert actual == expected


def test_frontend_matches_snapshot():
    expected = _load("snapshot_frontend.json")
    proc = subprocess.run(
        ["node", os.path.join(HERE, "run_frontend_harness.mjs")],
        capture_output=True, text=True, cwd=HERE,
    )
    assert proc.returncode == 0, proc.stderr
    actual = json.loads(proc.stdout)
    assert actual == expected


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
