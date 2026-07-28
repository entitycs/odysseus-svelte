"""Regression guards for Notes DOM rendering helpers."""

from pathlib import Path
import re

_REPO = Path(__file__).resolve().parent.parent


def test_notes_image_src_guard_rejects_script_capable_data_images():
    src = (_REPO / "web" / "lib" / "legacy" / "util" / "safeString.js").read_text(encoding="utf-8")

    assert "function safeDisplayImageSrc(raw)" in src
    assert r"^data:image\/(?:png|jpe?g|gif|webp);base64," in src
    assert r"^data:image\/i.test(v)" not in src


def test_notes_linkify_escapes_href_attribute():
    src = (_REPO / "web" / "lib" / "legacy" / "notes.js").read_text(encoding="utf-8")

    assert "function _attrEsc(s)" in src
    assert 'href="${_attrEsc(href)}"' in src
    assert 'href="${href}"' not in src


def test_notes_edit_form_uses_safe_image_src_guard():
    src = (_REPO / "web" / "lib" / "legacy" / "notes.js").read_text(encoding="utf-8")

    assert "let currentImageUrl = safeDisplayImageSrc(note?.image_url || '');" in src
    pattern = re.compile(
        r"let _stashedDrawUrl =\s*\(type === 'draw'\) \? \(safeDisplayImageSrc\(note\?\.image_url\) || null\) : null;",
        re.MULTILINE
    )
    assert pattern.search(src), "stashed draw url must use safe image source"

    pattern = re.compile(
        r"_wireCanvas\(\s*bodyEl, _stashedDrawUrl\s*||\s*currentImageUrl\s*||\s*safeDisplayImageSrc\(note\?\.image_url\)\s*||\s*null\)",
        re.MULTILINE
    )
    assert pattern.search(src), "wire canvas body uses safe image source"

    pattern = re.compile(
        r"_wireCanvas(form.querySelector('.note-form-body'), safeDisplayImageSrc(note?.image_url) || null)",
        re.MULTILINE
    )
    assert pattern.search(src), "form query selector uses safe image source"

    assert "const safeInitialImageUrl = safeDisplayImageSrc(initialImageUrl);" in src
    assert "img.src = safeInitialImageUrl;" in src
    assert "img.src = initialImageUrl;" not in src
