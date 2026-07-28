from pathlib import Path
import re

APP_JS = Path("web/lib/legacy/app.js")
SESSIONS_JS = Path("web/lib/legacy/sessions.js")


def test_rail_delete_uses_hard_delete_endpoint():
    source = APP_JS.read_text()
    rail_block = source[source.index("const railDelete = el('rail-delete-session');"):]
    rail_block = rail_block[:rail_block.index("// Textarea auto-resize")]

    pattern = re.compile(
        r"fetch\(`\$\{API_BASE\}\/api\/session\/\$\{currentId\}`,\s*\{\s*method:\s*'DELETE'[,]?\s*\}\s*\);",
        re.DOTALL,
    )
    assert pattern.search(rail_block), (
        "Rail delete uses hard delete endpoint"
    )
    assert "api/session/${currentId}/archive" not in rail_block


def test_deleted_sessions_are_pruned_from_local_sidebar_state():
    source = SESSIONS_JS.read_text()

    assert "function _removeSessionFromLocalState(sid)" in source
    pattern = re.compile(
        r"sessions = sessions\.filter\(\s*[(]?s[)]?\s*=>\s*String\(s.id\) !== id\)",
        re.MULTILINE
    )
    assert pattern.search(source)
    pattern = re.compile(
        r"Storage\.set\(\s*'session-order',\s*JSON.stringify\(\s*orderIds.filter\(\s*\(x\)\s*=>\s*String\(x\) !== id\s*\)\s*\)[,]?\s*\)",
        re.MULTILINE
    )
    assert pattern.search(source)
    assert "_removeSessionFromLocalState(s.id);" in source


def test_session_fetch_normalizes_duplicate_ids_before_render():
    source = SESSIONS_JS.read_text()

    assert "function _normalizeSessionsList(fetched)" in source
    assert "if (seen.has(id)) continue;" in source
    assert "sessions = _normalizeSessionsList(fetched);" in source
