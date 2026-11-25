"""Long-lived OCR worker.

Loading the OCR models takes many seconds, so the API keeps one worker process running and sends it requests.
Protocol (one JSON object per line):
  worker -> API   {"ready": true}                                  once the models are loaded
  API -> worker   {"id": 1, "file": "<path>", "type": "auto"}
                  or {"id": 1, "name": "scan.jpg", "data": "<base64 of the file>", "type": "auto"}   (nothing is written to disk)
  worker -> API   {"id": 1, "result": {...}} | {"id": 1, "error": "<message>"}
Anything the libraries print goes to stderr, so stdout carries the protocol only.
"""
import base64
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
    # the threads this worker was given (OCR_THREADS) are reported back, so the API can show what really runs
    send({"ready": True, "threads": int(os.environ.get("OCR_THREADS", "0") or 0)})

    for line in io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        request = json.loads(line)
        try:
            data = base64.b64decode(request["data"]) if request.get("data") is not None else None
            send({"id": request["id"], "result": process_document(request.get("file"), request.get("type", "auto"), data=data, name=request.get("name"))})
        except Exception as error:
            send({"id": request["id"], "error": str(error)})


if __name__ == "__main__":
    main()
