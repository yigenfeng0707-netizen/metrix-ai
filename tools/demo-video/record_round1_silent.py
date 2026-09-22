from __future__ import annotations

import runpy
from pathlib import Path

IMPL = Path(__file__).resolve().parent / "record_round1_silent_impl.py"


def main() -> None:
    runpy.run_path(str(IMPL), run_name="__main__")


if __name__ == "__main__":
    main()
