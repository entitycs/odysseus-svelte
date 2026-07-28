import re
from pathlib import Path
import re

def test_stream_render_helpers_are_visible_to_catch_block():
    source = Path("web/lib/legacy/chat.js").read_text(encoding="utf-8")

    # Find the try block that contains the auto-scroll comment
    try_pat = re.compile(
        r"try\s*\{\s*\/\/\s*Re-enable auto-scroll",
        re.MULTILINE
    )
    try_match = try_pat.search(source)
    assert try_match, "Could not locate try block containing auto-scroll comment"

    try_start = try_match.start()

    # Find the corresponding catch block *after* that try
    catch_pat = re.compile(r"\}\s*catch\s*\(\s*err\s*\)\s*\{", re.MULTILINE)
    catch_match = catch_pat.search(source, try_start)
    assert catch_match, "Could not locate catch block following try"

    catch_start = catch_match.start()

    outer_scope = source[:try_start]
    try_body = source[try_start:catch_start]

    # These helpers must be declared in outer scope
    assert re.search(r"let\s+_renderStream\s*=\s*\(\)\s*=>\s*\{\s*\}", outer_scope), ("render stream")
    assert re.search(r"let\s+_cancelThinkingTimer\s*=\s*\(\)\s*=>\s*\{\s*\}", outer_scope), ("cancel think timer")
    assert re.search(r"let\s+_removeThinkingSpinner\s*=\s*\(\)\s*=>\s*\{\s*\}", outer_scope), ("remove think spinner")

    # And reassigned inside the try block
    assert re.search(r"_renderStream\s*=\s*\(\)\s*=>\s*\{", try_body)
    assert re.search(r"_cancelThinkingTimer\s*=\s*\(\)\s*=>\s*\{", try_body)
    assert re.search(r"_removeThinkingSpinner\s*=\s*\(\)\s*=>\s*\{", try_body)

    # And not redefined as a function
    assert not re.search(r"function\s+_renderStream\s*\(", try_body)
