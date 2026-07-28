"""Regression guards for agent-tool screenshot DOM sinks."""

from pathlib import Path
import re
from tests.helpers.valid_imports import assert_valid_imports


_REPO = Path(__file__).resolve().parent.parent


def test_live_tool_screenshot_does_not_template_raw_sse_value():
    chat = (_REPO / "web" / "lib" / "legacy" / "chat.js").read_text(encoding="utf-8")

    pattern = re.compile(
        r"safeToolScreenshotSrc\s*\(\s*json.screenshot\s*[,]?\s*\)",
        re.DOTALL,
    )
    assert pattern.search(chat), (
        "Chat must use safeToolScreenshotSrc"
    )
    pattern = re.compile(
        r"img.src\s*=\s*screenshotSrc",
        re.DOTALL,
    )
    assert pattern.search(chat), (
        "img.src must use safeToolScreenshotSrc result"
    )
    pattern = re.compile(
        r"details.innerHTML\s*=\s*['`\"]\s*<summary>\s*Screenshot\s*<\/summary>\s*<img\s*src=['\"]\$\{\s*json.screenshot\s*\}['\"]"
    )
    assert not pattern.search(chat), (
        "img.src does not skip usage of safeToolScreenshotSrc result"
    )


def test_restored_tool_screenshot_uses_raster_data_url_whitelist():
    renderer = (_REPO / "web" / "lib" / "legacy" / "chatRenderer.js").read_text(encoding="utf-8")
    safe = (_REPO / "web" / "lib" / "legacy" / "util" / "safeString.js").read_text(encoding="utf-8")

    assert_valid_imports(
        renderer,
        import_names=["safeToolScreenshotSrc"],
        module_path="$lib/legacy/util/safeString"
    )
    assert "(?:png|jpe?g|gif|webp)" in safe
    assert "safeToolScreenshotSrc(ev.screenshot)" in renderer
    assert 'src="${esc(ev.screenshot)}"' not in renderer


def test_streaming_tool_labels_are_escaped_before_inner_html():
    chat = (_REPO / "web" / "lib" / "legacy" / "chat.js").read_text(encoding="utf-8")
    compare = (_REPO / "web" / "lib" / "legacy" / "compare" / "stream.js").read_text(encoding="utf-8")

    assert '<span class="agent-thread-tool">${esc(toolLabel)}</span>' in chat
    assert '<span class="agent-thread-tool">${toolLabel}</span>' not in chat
    assert '<span class="agent-thread-tool">${escapeHtml(toolLabel)}</span>' in compare
    assert '<span class="agent-thread-tool">${toolLabel}</span>' not in compare


def test_generated_image_urls_are_vetted_before_assignment_or_open():
    renderer = (_REPO / "web" / "lib" / "legacy" / "chatRenderer.js").read_text(encoding="utf-8")
    compare = (_REPO / "web" / "lib" / "legacy" / "compare" / "stream.js").read_text(encoding="utf-8")
    group = (_REPO / "web" / "lib" / "legacy" / "group.js").read_text(encoding="utf-8")

    assert_valid_imports(
        renderer,
        import_names=["safeDisplayImageSrc"],
        module_path="$lib/legacy/util/safeString"
    )
    assert "safeDisplayImageSrc(imageUrl)" in renderer
    assert "img.src = safeImageUrl" in renderer
    assert "window.open(safeImageUrl, '_blank', 'noopener,noreferrer')" in renderer
    assert "safeDisplayImageSrc(json.image_url)" in compare
    assert "img.src = json.image_url" not in compare
    assert "safeDisplayImageSrc(json.url)" in group
    assert "img.src = json.url" not in group


def test_group_chat_role_labels_are_escaped_before_inner_html():
    group = (_REPO / "web" / "lib" / "legacy" / "group.js").read_text(encoding="utf-8")

    assert '<div class="role">${uiModule.esc(roleLabel)}' in group
    assert '<div class="role">${roleLabel}' not in group


def test_main_chat_role_labels_are_escaped_before_inner_html():
    chat = (_REPO / "web" / "lib" / "legacy" / "chat.js").read_text(encoding="utf-8")

    pattern = re.compile(
        r"<div\s*class=['\"]role['\"]>\s*\$\{uiModule\.esc\s*\(\s*roleLabel\s*\)\s*\}",
        re.MULTILINE,
    )
    assert pattern.search(chat), (
        "Chat must use safeToolScreenshotSrc"
    )

    assert '<div class="role">${roleLabel}' not in chat
    assert "'<div class=\"role\">' + roleLabel" not in chat
    assert '<div class="role">${agentModelLabel}' not in chat


def test_compare_search_result_links_are_http_only():
    compare = (_REPO / "web" / "lib" / "legacy" / "compare" / "stream.js").read_text(encoding="utf-8")

    assert "function _safeHttpHref(raw)" in compare
    assert "const safeUrl = _safeHttpHref(r.url);" in compare
    assert "titleLink.href = safeUrl;" in compare
    assert "titleLink.href = r.url || '#';" not in compare


def test_compare_probe_provider_labels_are_escaped():
    selector = (_REPO / "web" / "lib" / "legacy" / "compare" / "selector.js").read_text(encoding="utf-8")

    assert "${escapeHtml(p.label || p.id)}" in selector
    assert "${p.label || p.id}" not in selector
