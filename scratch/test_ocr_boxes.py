import sys
import os
sys.path.insert(0, r"C:\Users\reage\Documents\ChatGPT\OCR")
import pymupdf as fitz
import cv2
import numpy as np
from app.services.ocr_engine import OCREngine

doc = fitz.open("documents/testdocfap.pdf")
page = doc[0]
mat = fitz.Matrix(300/72, 300/72)
pix = page.get_pixmap(matrix=mat, alpha=False)
img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
boxes = OCREngine.process_image(bgr)

print(f"Total boxes page 1: {len(boxes)}")
print(f"Image width: {pix.w}, height: {pix.h}")
mid_x = pix.w / 2
print(f"Mid X: {mid_x}")

left_boxes = []
right_boxes = []
for b in boxes:
    # box is [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] or [x0, y0, x1, y1]
    raw_b = b["box"]
    if isinstance(raw_b[0], (list, tuple)):
        bx = min(pt[0] for pt in raw_b)
        by = min(pt[1] for pt in raw_b)
    else:
        bx = raw_b[0]
        by = raw_b[1]
    
    if bx < mid_x:
        left_boxes.append((by, bx, b["text"]))
    else:
        right_boxes.append((by, bx, b["text"]))

left_boxes.sort(key=lambda item: item[0])
right_boxes.sort(key=lambda item: item[0])

print("\n=== LEFT COLUMN (COMPANY & DOMICILE) ===")
for by, bx, txt in left_boxes[:35]:
    print(f"[{int(by)}, {int(bx)}] {txt}")

print("\n=== RIGHT COLUMN (PIC & SHAREHOLDERS) ===")
for by, bx, txt in right_boxes[:35]:
    print(f"[{int(by)}, {int(bx)}] {txt}")
