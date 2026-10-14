"""
Build the dark-background edition of the chakra figure.

The source is line art on white with the seven centres painted in colour. Two problems
for a dark UI: the paper is white, and two of the centres are drawn in the wrong hue
(crown and brow are both violet, though the crown should be violet and the brow indigo —
and inverting the image for a dark background would rotate every hue anyway, turning the
red root cyan).

So this script does three things and nothing else:

1. makes the paper transparent;
2. inverts *luminance* rather than the image, so the dark line work becomes light and
   reads on a dark surface while every hue survives untouched;
3. normalises the hue of each centre to its canonical chakra colour, keeping the
   drawing's own shading inside each disc.
"""
import colorsys, zlib, struct, sys, os, urllib.request

SOURCE_URL = 'https://jothishi.com/wp-content/uploads/2019/05/The-seven-chakras.png'
HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, 'source-seven-chakras.png')
TARGET = os.path.join(HERE, '..', 'static', 'seven-chakras-dark.png')

sys.path.insert(0, HERE)
from png import decode   # the decoder in this directory; no third-party dependency

# canonical hue per centre, and the band of rows it occupies (measured from the image)
CENTRES = [
    ('root',    0.0,   665, 750),
    ('sacral', 30.0,   560, 660),
    ('solar',  55.0,   465, 560),
    ('heart', 130.0,   355, 455),
    ('throat',215.0,   245, 355),
    ('brow',  265.0,   150, 245),
    ('crown', 288.0,    35, 150),
]

def centre_at(y):
    for name, hue, y0, y1 in CENTRES:
        if y0 <= y < y1:
            return name, hue
    return None, None

if not os.path.exists(SOURCE):
    print('downloading', SOURCE_URL)
    urllib.request.urlretrieve(SOURCE_URL, SOURCE)

W, H, ch, px = decode(SOURCE)
assert ch == 3, f'expected RGB, got {ch} channels'

scanlines = bytearray()
for y in range(H):
    scanlines.append(0)  # filter: none
    for x in range(W):
        o = (y * W + x) * 3
        r, g, b = px[o], px[o + 1], px[o + 2]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s < 0.12:
            # paper. Antialiasing along the strokes keeps a soft edge.
            alpha = 0 if v > 0.85 else int(255 * min(1.0, (0.85 - v) * 3.0))
            scanlines += bytes((255, 255, 255, alpha))
            continue
        name, hue = centre_at(y)
        if name is not None:
            # a chakra disc: canonical hue at full strength, shading preserved
            rr, gg, bb = colorsys.hsv_to_rgb(hue / 360, min(1.0, 0.55 + s * 0.45), 0.62 + v * 0.34)
        else:
            # line work: invert luminance, leave hue and saturation alone
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            rr, gg, bb = colorsys.hsv_to_rgb(h, max(s, 0.25), 0.35 + (1 - lum / 255) * 0.6)
        scanlines += bytes((int(rr * 255), int(gg * 255), int(bb * 255), 255))

def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

out = b'\x89PNG\r\n\x1a\n'
out += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
out += chunk(b'IDAT', zlib.compress(bytes(scanlines), 9))
out += chunk(b'IEND', b'')
open(TARGET, 'wb').write(out)
print('wrote', TARGET, len(out), 'bytes')

# verify: the seven centres must come out on their canonical hues
W2, H2, ch2, px2 = decode(TARGET)
print('verify centres (hue in degrees):')
expected = {'crown': 288, 'brow': 265, 'throat': 215, 'heart': 130, 'solar': 55, 'sacral': 30, 'root': 0}
for name, hue, y0, y1 in CENTRES:
    hues, n = [], 0
    for y in range(y0, y1):
        for x in range(230, 370):
            o = (y * W2 + x) * ch2
            a = px2[o + 3]
            if a < 200:
                continue
            h, s, v = colorsys.rgb_to_hsv(px2[o] / 255, px2[o + 1] / 255, px2[o + 2] / 255)
            if s > 0.45 and v > 0.4:
                # circular mean, so 0 and 350 average to 355 rather than 175
                hues.append(h * 360)
                n += 1
    if n:
        import math
        mx = sum(math.cos(math.radians(t)) for t in hues) / n
        my = sum(math.sin(math.radians(t)) for t in hues) / n
        mean = math.degrees(math.atan2(my, mx)) % 360
        flag = 'ok' if abs((mean - expected[name] + 180) % 360 - 180) < 12 else 'CHECK'
        print(f'  {name:7} measured={mean:6.1f}  canonical={expected[name]:3}  n={n:5}  {flag}')
