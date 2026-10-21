#!/usr/bin/env python3
"""Offline, no-Gemini-credit Crew UI localization using Argos Translate.

Install: python -m pip install argostranslate
Run: python scripts/generate-ui-locales-offline.py
Tests: node scripts/generate-ui-locales.mjs --check

All source keys, placeholders and earlier hand-written preview translations
are preserved. Model-generated translations remain beta until human QA.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import argostranslate.package
import argostranslate.translate

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "web-spa" / "src" / "i18n"
LOCALES = BASE / "locales"
LANGUAGES = {
    "ja": "ja", "es": "es", "pt-BR": "pb", "id": "id",
    "ko": "ko", "fr": "fr", "de": "de", "vi": "vi", "th": "th",
}
NAMESPACES = ("common", "home", "settings", "teacher", "friends", "story", "fortune")
PROTECTED = re.compile(
    r"(\{\{[^{}]+\}\}|Crew Teacher|Crew Story|Crew Fortune|Crew Play|"
    r"Crew|Gemini Live|Gemini|Google AI Studio|AI Studio|API Key|Android|"
    r"BaZi|UTC|A1|A2|B1|B2|\n)",
    re.IGNORECASE,
)
VARIABLE = re.compile(r"\{\{[^{}]+\}\}")


def flatten(data: dict, prefix: str = "") -> dict[str, str]:
    result = {}
    for name, value in data.items():
        key = f"{prefix}.{name}" if prefix else name
        if isinstance(value, str):
            result[key] = value
        elif isinstance(value, dict):
            result.update(flatten(value, key))
        else:
            raise ValueError(f"Invalid locale value: {key}")
    return result


def unflatten(items: dict[str, str]) -> dict:
    root: dict = {}
    for key, value in items.items():
        place = root
        parts = key.split(".")
        for part in parts[:-1]:
            place = place.setdefault(part, {})
        place[parts[-1]] = value
    return root


def placeholders(value: str) -> list[str]:
    return sorted(VARIABLE.findall(value))


def read(filename: Path) -> dict:
    return json.loads(filename.read_text(encoding="utf-8"))


def validate(source: dict[str, str], result: dict[str, str], locale: str, ns: str) -> None:
    if source.keys() != result.keys():
        raise ValueError(f"{locale}/{ns}: translation keys differ from English source")
    for key, original in source.items():
        translation = result[key]
        if not isinstance(translation, str) or (original.strip() and not translation.strip()):
            raise ValueError(f"{locale}/{ns}.{key}: blank or invalid translation")
        if placeholders(original) != placeholders(translation):
            raise ValueError(f"{locale}/{ns}.{key}: placeholder mismatch")


def curated_previews() -> dict:
    """Existing priority translations use a JSON object inside a TypeScript constant."""
    data = (BASE / "previewTranslations.ts").read_text(encoding="utf-8").strip()
    data = data.split("=", 1)[1].strip()
    if not data.endswith("as const;"):
        raise ValueError("Unexpected previewTranslations.ts format")
    return json.loads(data[: -len("as const;")].strip())


def translate_segment(segment: str, translation, cache: dict[str, str]) -> str:
    if not segment.strip():
        return segment
    if segment in cache:
        return cache[segment]
    leading = len(segment) - len(segment.lstrip())
    trailing = len(segment) - len(segment.rstrip())
    original = segment.strip()
    try:
        converted = translation.translate(original).strip()
    except Exception as error:
        raise RuntimeError(f"Offline Argos model error on segment: {original[:60]!r}") from error
    if not converted:
        raise RuntimeError(f"Offline Argos model returned empty text for {original[:60]!r}")
    output = segment[:leading] + converted + (segment[-trailing:] if trailing else "")
    cache[segment] = output
    return output


def localize(value: str, translation, cache: dict[str, str]) -> str:
    if not value.strip():
        return value
    return "".join(
        part if PROTECTED.fullmatch(part)
        else translate_segment(part, translation, cache)
        for part in PROTECTED.split(value)
    )


def main() -> None:
    previews = curated_previews()
    print("Updating Argos package index", flush=True)
    argostranslate.package.update_package_index()
    packages = argostranslate.package.get_available_packages()

    for locale, target in LANGUAGES.items():
        existing = [item for item in packages if item.from_code == "en" and item.to_code == target]
        if not existing:
            raise RuntimeError(f"No offline Argos model for en -> {locale}/{target}")
        print(f"Downloading English -> {locale} translation model", flush=True)
        download_path = existing[0].download()
        argostranslate.package.install_from_path(download_path)
        source_lang = next(item for item in argostranslate.translate.get_installed_languages()
                           if item.code == "en")
        target_lang = next(item for item in argostranslate.translate.get_installed_languages()
                           if item.code == target)
        translator = source_lang.get_translation(target_lang)
        cache: dict[str, str] = {}

        for ns in NAMESPACES:
            english = flatten(read(LOCALES / "en" / f"{ns}.json"))
            filename = LOCALES / locale / f"{ns}.json"
            if filename.exists():
                try:
                    existing_file = flatten(read(filename))
                    validate(english, existing_file, locale, ns)
                    print(f"Using existing validated {locale}/{ns}", flush=True)
                    continue
                except ValueError:
                    print(f"Regenerating outdated {locale}/{ns}", flush=True)

            original_preview = flatten(previews.get(locale, {}).get(ns, {}))
            result = {}
            for index, (key, value) in enumerate(english.items(), start=1):
                result[key] = original_preview.get(key) or localize(value, translator, cache)
                if index % 70 == 0:
                    print(f"{locale}/{ns} {index}/{len(english)} keys", flush=True)
            validate(english, result, locale, ns)
            filename.parent.mkdir(parents=True, exist_ok=True)
            filename.write_text(
                json.dumps(unflatten(result), indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            changed = sum(1 for key, value in english.items()
                          if value.strip() and result[key] != value)
            print(f"Saved {locale}/{ns}: {len(result)} keys, {changed} translated", flush=True)

        print(f"Completed {locale}, {len(cache)} translated segments", flush=True)

    print("All nine UI locales translated with offline Argos models", flush=True)


if __name__ == "__main__":
    main()
