from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
def run_pnpm_unit():
    result = subprocess.run(
        ["pnpm", "unit"],
        cwd=ROOT,
        check=False,  # don't crash on test failures
        capture_output=True,
        text=True,
    )
    return {
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }

def test_frontend_unit_suite():
    result = run_pnpm_unit()

    print(result["stdout"])  # optional: show Vitest output in pytest logs

    assert result["returncode"] == 0, "Vitest suite failed"
