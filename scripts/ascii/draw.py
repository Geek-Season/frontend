# Персонаж главной (свой, нарисован для Geek Season): девочка-гик в наушниках смотрит поверх
# ноутбука, рядом кружка и спящий кот. Рисунок линиями (белое на чёрном) — так он чище
# переводится в символы. Кадры: моргает, пряди колышутся, печатает, пар от кружки, кот дышит
# и «z» улетают, звёзды мерцают.
import math
def L(w=6): return f'stroke="#fff" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'
W, H = 640, 508
def svg(t, n):
    blink = t % n in (16, 17)
    ph = t / n * 2 * math.pi
    sw = math.sin(ph) * 5
    up = (t % 4) < 2
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="#000"/>']
    for i, (x, y) in enumerate([(40, 40), (130, 96), (40, 180), (600, 44), (612, 160), (520, 24), (220, 30)]):
        op = 0.25 + 0.75 * (0.5 + 0.5 * math.sin(ph * 2 + i * 1.7))
        s.append(f'<path d="M{x} {y-8} L{x} {y+8} M{x-8} {y} L{x+8} {y}" {L(4)} opacity="{op:.2f}"/>')
    cx, top = 340, 70
    # волосы до плеч
    s.append(f'<path d="M{cx} {top} Q{cx-118} {top+4} {cx-122} {top+116} Q{cx-128} {top+198} {cx-150+sw:.0f} {top+260} Q{cx-120} {top+248} {cx-104} {top+228}" fill="none" {L(6)}/>')
    s.append(f'<path d="M{cx} {top} Q{cx+118} {top+4} {cx+122} {top+116} Q{cx+128} {top+198} {cx+150+sw:.0f} {top+260} Q{cx+120} {top+248} {cx+104} {top+228}" fill="none" {L(6)}/>')
    s.append(f'<path d="M{cx-96} {top+68} Q{cx-104} {top+148} {cx-120+sw:.0f} {top+218}" fill="none" {L(4)}/>')
    s.append(f'<path d="M{cx+96} {top+68} Q{cx+104} {top+148} {cx+120+sw:.0f} {top+218}" fill="none" {L(4)}/>')
    # наушники: дуга над головой и чашки по бокам
    s.append(f'<path d="M{cx-128} {top+110} Q{cx-132} {top-40} {cx} {top-44} Q{cx+132} {top-40} {cx+128} {top+110}" fill="none" {L(9)}/>')
    for d in (-1, 1):
        ex = cx + d * 132
        s.append(f'<rect x="{ex-20}" y="{top+92}" width="40" height="64" rx="16" fill="#000" {L(6)}/>')
        s.append(f'<rect x="{ex-9}" y="{top+106}" width="18" height="36" rx="8" fill="#fff"/>')
    # чёлка
    s.append(f'<path d="M{cx-98} {top+98} Q{cx-90} {top+32} {cx-20} {top+18} Q{cx+60} {top+14} {cx+98} {top+96} L{cx+70} {top+64} L{cx+58} {top+100} L{cx+34} {top+52} L{cx+12} {top+94} L{cx-10} {top+46} L{cx-34} {top+88} L{cx-50} {top+52} L{cx-74} {top+98} Z" fill="#000" {L(6)}/>')
    # заколка-звёздочка
    s.append(f'<path d="M{cx+76} {top+44} l6 12 13 2 -10 9 3 13 -12 -7 -12 7 3 -13 -10 -9 13 -2 z" fill="#fff"/>')
    # лицо
    s.append(f'<path d="M{cx-92} {top+108} Q{cx-90} {top+186} {cx} {top+210} Q{cx+90} {top+186} {cx+92} {top+108}" fill="none" {L(6)}/>')
    for ex, d in ((cx - 46, -1), (cx + 46, 1)):
        if blink:
            s.append(f'<path d="M{ex-26} {top+134} Q{ex} {top+146} {ex+26} {top+134}" fill="none" {L(6)}/>')
        else:
            s.append(f'<path d="M{ex-28} {top+118} Q{ex} {top+100} {ex+28} {top+116}" fill="none" {L(7)}/>')
            s.append(f'<ellipse cx="{ex}" cy="{top+138}" rx="15" ry="20" fill="#fff"/>')
            s.append(f'<circle cx="{ex-5}" cy="{top+131}" r="5" fill="#000"/>')
        for k in range(3):
            bx = ex - 14 + k * 11
            s.append(f'<path d="M{bx} {top+174} L{bx+7} {top+164}" {L(4)}/>')
    s.append(f'<path d="M{cx-12} {top+186} Q{cx-6} {top+194} {cx} {top+186} Q{cx+6} {top+194} {cx+12} {top+186}" fill="none" {L(4)}/>')
    # толстовка
    y0 = top + 230
    s.append(f'<path d="M{cx-150} {H} Q{cx-140} {y0+18} {cx-60} {y0} Q{cx} {y0+18} {cx+60} {y0} Q{cx+140} {y0+18} {cx+150} {H}" fill="none" {L(6)}/>')
    s.append(f'<path d="M{cx-18} {y0+14} L{cx-22} {y0+48} M{cx+18} {y0+14} L{cx+22} {y0+48}" {L(4)}/>')
    # стол
    desk = H - 20
    s.append(f'<path d="M0 {desk} L{W} {desk}" {L(4)}/>')
    # ноутбук
    s.append(f'<path d="M{cx-112} {y0+20} L{cx+112} {y0+20} L{cx+128} {desk} L{cx-128} {desk} Z" fill="#000" {L(6)}/>')
    s.append(f'<text x="{cx}" y="{y0+100}" text-anchor="middle" font-family="monospace" font-weight="900" font-size="60" fill="#fff">&lt;/&gt;</text>')
    s.append(f'<ellipse cx="{cx-140}" cy="{desk-(8 if up else 0)}" rx="24" ry="13" fill="#000" {L(6)}/>')
    s.append(f'<ellipse cx="{cx+140}" cy="{desk-(0 if up else 8)}" rx="24" ry="13" fill="#000" {L(6)}/>')
    # кружка с паром
    mx = 530
    s.append(f'<path d="M{mx} {desk-74} L{mx} {desk-12} Q{mx} {desk} {mx+12} {desk} L{mx+34} {desk} Q{mx+46} {desk} {mx+46} {desk-12} L{mx+46} {desk-74} Z" fill="#000" {L(6)}/>')
    s.append(f'<path d="M{mx+46} {desk-60} Q{mx+68} {desk-58} {mx+66} {desk-42} Q{mx+64} {desk-28} {mx+46} {desk-30}" fill="none" {L(6)}/>')
    for k in range(2):
        p = ((t / n) + k * 0.5) % 1
        yy = desk - 88 - p * 70
        s.append(f'<path d="M{mx+14+k*18} {yy:.0f} q-10 -12 0 -24 q10 -12 0 -24" fill="none" {L(4)} opacity="{(1-p):.2f}"/>')
    # спящий кот: калачиком, уши, закрытые глаза, хвост вокруг; дышит, «z» улетают
    kx, ky = 98, desk
    br = 1 + 0.04 * math.sin(ph * 2)
    s.append(f'<g transform="translate({kx} {ky}) scale(1 {br:.3f}) translate({-kx} {-ky})">')
    s.append(f'<path d="M{kx-72} {ky} Q{kx-80} {ky-62} {kx-10} {ky-70} Q{kx+60} {ky-72} {kx+70} {ky-20} Q{kx+74} {ky} {kx+60} {ky}" fill="#000" {L(6)}/>')
    s.append(f'<path d="M{kx-56} {ky-50} L{kx-62} {ky-82} L{kx-36} {ky-64} M{kx-20} {ky-68} L{kx-10} {ky-96} L{kx+2} {ky-70}" fill="#000" {L(6)}/>')
    s.append(f'<path d="M{kx-48} {ky-40} q6 5 12 0 M{kx-22} {ky-42} q6 5 12 0" fill="none" {L(4)}/>')
    s.append(f'<path d="M{kx+60} {ky} Q{kx+40} {ky-12} {kx-30} {ky-6}" fill="none" {L(6)}/>')
    s.append('</g>')
    for k in range(3):
        p = ((t / n) + k / 3) % 1
        zx, zy, sz = kx + 20 + p * 40, ky - 100 - p * 70, 10 + p * 10
        s.append(f'<text x="{zx:.0f}" y="{zy:.0f}" font-family="monospace" font-weight="900" font-size="{sz*2:.0f}" fill="#fff" opacity="{(1-p):.2f}">z</text>')
    s.append('</svg>')
    return ''.join(s)
N = 24
for t in range(N):
    open(f'frame{t:02d}.svg', 'w').write(svg(t, N))
