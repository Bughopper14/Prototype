"""One-shot OCR: `python ocr_cli.py <file> [doc_type]` prints a single JSON document to stdout."""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def _use_utf8_streams() -> None:
    for name in ("stdout", "stderr"):
        stream = getattr(sys, name)
        if hasattr(stream, "buffer"):
            setattr(sys, name, io.TextIOWrapper(stream.buffer, encoding="utf-8", errors="replace"))


def main() -> int:
    _use_utf8_streams()
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        return 1

    from ocr_service import process_document

    try:
        result = process_document(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "auto")
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
