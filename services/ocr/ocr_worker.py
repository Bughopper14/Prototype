"""Long-lived OCR worker.

Loading the OCR models takes many seconds, so the API keeps one worker process running and sends it requests.
Protocol (one JSON object per line):
  worker -> API   {"ready": true}                                  once the models are loaded
  API -> worker   {"id": 1, "file": "<path>", "type": "auto"}
  worker -> API   {"id": 1, "result": {...}} | {"id": 1, "error": "<message>"}
Anything the libraries print goes to stderr, so stdout carries the protocol only.
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PROTOCOL = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
sys.stdout = sys.stderr


def send(message: dict) -> None:
    PROTOCOL.write(json.dumps(message, ensure_ascii=False) + "\n")
    PROTOCOL.flush()


def main() -> None:
    from app.services.ocr_engine import OCREngine
    from ocr_service import process_document

    OCREngine.get_engine()  # load the models now, not on the first request
    send({"ready": True})

    for line in io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        request = json.loads(line)
        try:
            send({"id": request["id"], "result": process_document(request["file"], request.get("type", "auto"))})
        except Exception as error:
            send({"id": request["id"], "error": str(error)})


if __name__ == "__main__":
    main()
