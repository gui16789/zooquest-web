import argparse
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List, Optional


W_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

PINYIN_RE = re.compile(r"^[a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹ]+$")


def cell_text(cell: ET.Element) -> str:
    texts = []
    for t in cell.findall(".//w:t", W_NS):
        if t.text:
            texts.append(t.text)
    return "".join(texts).strip()


def normalize_words(raw: str) -> List[str]:
    s = raw.strip()
    s = s.replace("（", "(").replace("）", ")")
    # Remove surrounding parentheses
    s = re.sub(r"^\((.*)\)$", r"\1", s)
    # Split by whitespace and punctuation
    parts = re.split(r"[\s、,，;；]+", s)
    return [p for p in (p.strip() for p in parts) if p]


@dataclass
class CharItem:
    hanzi: str
    pinyin: str
    words: List[str]


def try_parse_triplet(hanzi: str, pinyin: str, words: str) -> Optional[CharItem]:
    h = hanzi.strip()
    p = pinyin.strip()
    if len(h) != 1:
        return None
    if not p or not PINYIN_RE.match(p):
        return None
    return CharItem(hanzi=h, pinyin=p, words=normalize_words(words) if words else [])


def extract_items_from_table(tbl: ET.Element) -> List[CharItem]:
    items: List[CharItem] = []
    for row in tbl.findall("./w:tr", W_NS):
        cells = row.findall("./w:tc", W_NS)
        texts = [cell_text(c) for c in cells]
        texts = [t for t in texts if t != ""]

        # Heuristic: rows often contain repeated (hanzi, pinyin, words) triples.
        i = 0
        while i + 1 < len(texts):
            hanzi = texts[i]
            pinyin = texts[i + 1] if i + 1 < len(texts) else ""
            words = texts[i + 2] if i + 2 < len(texts) else ""

            item = try_parse_triplet(hanzi, pinyin, words)
            if item:
                items.append(item)
                i += 3
                continue

            # Fallback: sometimes words are missing
            item2 = try_parse_triplet(hanzi, pinyin, "")
            if item2:
                items.append(item2)
                i += 2
                continue

            i += 1

    # Deduplicate by (hanzi, pinyin)
    seen = set()
    uniq: List[CharItem] = []
    for it in items:
        key = (it.hanzi, it.pinyin)
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)
    return uniq


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract a char+pinyin table from a DOCX.")
    ap.add_argument("--docx", required=True, help="Path to .docx file")
    ap.add_argument("--unit", default="u1", help="Unit id (default: u1)")
    ap.add_argument("--out", default="src/content/content.v1.json", help="Output json path")
    args = ap.parse_args()

    with zipfile.ZipFile(args.docx) as z:
        xml_bytes = z.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    tables = root.findall(".//w:tbl", W_NS)

    if not tables:
        raise SystemExit("No tables found")

    best_items: List[CharItem] = []
    best_index = -1

    for idx, tbl in enumerate(tables):
        items = extract_items_from_table(tbl)
        if len(items) > len(best_items):
            best_items = items
            best_index = idx

    if len(best_items) == 0:
        raise SystemExit("Failed to extract any char items")

    # Build content JSON
    out = {
        "schemaVersion": 1,
        "subject": "chinese",
        "grade": 2,
        "term": "up",
        "units": [
            {
                "unitId": args.unit,
                "title": f"{args.unit}",
                "sections": [
                    {
                        "sectionId": f"{args.unit}.s1",
                        "type": "char_table",
                        "title": "识字表（自动抽取）",
                        "items": [
                            {
                                "itemId": f"{args.unit}.s1.{i+1:04d}",
                                "hanzi": it.hanzi,
                                "pinyin": it.pinyin,
                                "words": it.words,
                                "source": {
                                    "doc": args.docx,
                                    "hint": f"tableIndex={best_index}",
                                },
                            }
                            for i, it in enumerate(best_items)
                        ],
                    }
                ],
            }
        ],
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Extracted {len(best_items)} items from table {best_index} -> {args.out}")


if __name__ == "__main__":
    main()
