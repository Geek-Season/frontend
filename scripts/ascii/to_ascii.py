# Картинка → символы. В каждой ячейке: сколько «белого» и куда идёт линия (по разбросу белых точек).
# Почти пусто — пробел/точка; линия — символ по её направлению (- / | \); заливка — плотные #@.
from PIL import Image
import json, math
COLS, ROWS = 88, 42
def cell_char(pts, area):
    cov = len(pts) / area
    if cov < 0.04: return ' '
    if cov < 0.1: return '.'
    n = len(pts); mx = sum(p[0] for p in pts) / n; my = sum(p[1] for p in pts) / n
    cxx = sum((p[0]-mx)**2 for p in pts) / n; cyy = sum((p[1]-my)**2 for p in pts) / n
    cxy = sum((p[0]-mx)*(p[1]-my) for p in pts) / n
    ang = math.degrees(0.5 * math.atan2(2 * cxy, cxx - cyy))  # направление главной оси, y вниз
    elong = math.sqrt(max(cxx, cyy) / (min(cxx, cyy) + 1e-6))
    if cov > 0.7: return '@' if cov > 0.85 else '#'
    if elong < 1.5: return '*' if cov > 0.35 else 'o' if cov > 0.2 else ':'
    a = ang % 180
    if a < 22.5 or a >= 157.5: return '_' if my > 0.65 else '-'
    if a < 67.5: return '\\'
    if a < 112.5: return '|'
    return '/'
def convert(path):
    im = Image.open(path).convert('L'); W, H = im.size; px = im.load()
    cw, ch = W / COLS, H / ROWS
    out = []
    for r in range(ROWS):
        line = ''
        for c in range(COLS):
            x0, y0, x1, y1 = int(c*cw), int(r*ch), int((c+1)*cw), int((r+1)*ch)
            pts = [((x-x0)/(x1-x0), (y-y0)/(y1-y0)) for y in range(y0, y1) for x in range(x0, x1) if px[x, y] > 110]
            line += cell_char(pts, (x1-x0)*(y1-y0))
        out.append(line.rstrip())
    return '\n'.join(out)
frames = [convert(f'frame{t:02d}.png') for t in range(24)]
json.dump(frames, open('frames.json', 'w'), ensure_ascii=False)
