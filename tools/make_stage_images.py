"""웅장한 축제 무대 그림 만들기 (샘플 아티스트 사진 + COMING SOON 포스터 배경)

실행: python tools/make_stage_images.py
결과: images/sample/stage1~4.jpg, images/stage-epic.jpg
모두 이 프로그램이 직접 그린 그림이라 저작권 걱정 없이 쓸 수 있어요.
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 720, 960
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def mask():
    m = Image.new('L', (W, H), 0)
    return m, ImageDraw.Draw(m)


def add(canvas, m, color, strength=1.0, blur=0):
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(m, dtype=np.float32)[..., None] / 255
    canvas += a * hexrgb(color) * strength


def cover(canvas, m, blur=0, color='#000000', alpha=1.0):
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(m, dtype=np.float32)[..., None] / 255 * alpha
    canvas[:] = canvas * (1 - a) + hexrgb(color) * a


def scene(seed, pal, pose, performer=True, fireworks=False):
    rnd = random.Random(seed)
    c = np.zeros((H, W, 3), dtype=np.float32)

    # 1) 밤하늘 그라데이션
    y = np.linspace(0, 1, H)[:, None, None]
    c += hexrgb(pal['sky']) * (1 - y) * 0.9 + hexrgb('#05070d') * y

    # 2) 불꽃놀이 (하늘)
    if fireworks:
        for _ in range(3):
            cx, cy, r = rnd.randint(80, W - 80), rnd.randint(60, 260), rnd.randint(60, 110)
            m, d = mask()
            for k in range(46):
                ang = k / 46 * 2 * math.pi
                d.line([(cx + math.cos(ang) * r * .25, cy + math.sin(ang) * r * .25),
                        (cx + math.cos(ang) * r, cy + math.sin(ang) * r)], fill=255, width=2)
            col = rnd.choice([pal['a'], pal['b'], '#ffd27a'])
            add(c, m, col, 1.2, 1.5)
            add(c, m, col, 0.8, 12)

    # 3) 무대 뒤 거대한 LED 스크린 빛
    m, d = mask()
    d.rectangle([90, 250, W - 90, 640], fill=255)
    add(c, m, pal['a'], 0.55, 60)
    m, d = mask()
    d.ellipse([W / 2 - 170, 300, W / 2 + 170, 640], fill=255)
    add(c, m, '#fff4e0', 0.9, 70)

    # 4) 트러스(무대 철골)와 그 위 조명에서 쏟아지는 빔
    beams, d = mask()
    beams2, d2 = mask()
    for i in range(9):
        x0 = 70 + i * (W - 140) / 8
        tx = W / 2 + (x0 - W / 2) * rnd.uniform(1.6, 3.2) + rnd.uniform(-80, 80)
        spread = rnd.uniform(40, 90)
        (d if i % 2 else d2).polygon([(x0 - 3, 170), (x0 + 3, 170), (tx + spread, H), (tx - spread, H)], fill=110)
    add(c, beams, pal['a'], 1.1, 6)
    add(c, beams2, pal['b'], 1.1, 6)
    # 하늘로 쏘아 올리는 서치라이트
    m, d = mask()
    for i in range(6):
        x0 = 110 + i * (W - 220) / 5
        tx = x0 + rnd.uniform(-260, 260)
        d.polygon([(x0 - 4, 660), (x0 + 4, 660), (tx + 26, -10), (tx - 26, -10)], fill=90)
    add(c, m, '#dfe9ff', 0.9, 5)
    m, d = mask()
    d.rectangle([40, 150, W - 40, 185], fill=255)
    for x in range(40, W - 40, 34):
        d.line([(x, 150), (x + 17, 185)], fill=0, width=3)
    cover(c, m, 0, '#0b0d14')
    m, d = mask()
    for x in range(70, W - 60, 81):
        d.ellipse([x - 9, 178, x + 9, 196], fill=255)
    add(c, m, '#ffffff', 1.5, 2)
    add(c, m, pal['b'], 1.0, 14)

    # 5) 연기(스모그)
    n = np.random.RandomState(seed).rand(24, 18).astype(np.float32)
    smoke = Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
    s = np.asarray(smoke, dtype=np.float32)[..., None] / 255
    band = np.clip(1 - np.abs(np.linspace(0, 1, H) - .62) * 2.4, 0, 1)[:, None, None]
    c += s * band * (hexrgb(pal['a']) * .35 + .12)

    # 6) 양옆 불기둥(파이로) + 불티
    for px in (70, W - 70):
        m, d = mask()
        d.polygon([(px - 18, 700), (px + 18, 700), (px + 8, 400), (px, 330), (px - 8, 400)], fill=255)
        add(c, m, '#ffb347', 1.6, 8)
        add(c, m, '#ff5a1f', 1.2, 30)
        m, d = mask()
        d.polygon([(px - 7, 690), (px + 7, 690), (px, 420)], fill=255)
        add(c, m, '#fff6d8', 1.5, 3)
    m, d = mask()
    for _ in range(260):
        x, yy = rnd.gauss(W / 2, 220), rnd.uniform(120, 720)
        r = rnd.uniform(.8, 2.2)
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=255)
    add(c, m, '#ffd9a0', 1.3, 0.6)

    # 7) 무대 바닥
    m, d = mask()
    d.rectangle([0, 660, W, 700], fill=255)
    cover(c, m, 2, '#07080c')
    m, d = mask()
    d.rectangle([0, 656, W, 662], fill=255)
    add(c, m, pal['a'], 1.2, 3)

    # 8) 역광 받는 공연자 실루엣 + 뒤쪽 강한 빛 번짐
    cx = W / 2 + rnd.uniform(-40, 40)
    if performer:
        m, d = mask()
        d.ellipse([cx - 90, 230, cx + 90, 420], fill=255)
        add(c, m, '#ffffff', 2.2, 50)
        body, d = mask()
        d.ellipse([cx - 28, 392, cx + 28, 456], fill=255)                      # 머리
        d.polygon([(cx - 24, 452), (cx + 24, 452), (cx + 58, 510), (cx + 46, 610),
                   (cx + 30, 662), (cx - 30, 662), (cx - 46, 610), (cx - 58, 510)], fill=255)  # 몸
        if pose == 'arms':      # 두 팔을 번쩍
            d.line([(cx - 44, 505), (cx - 110, 400), (cx - 130, 330)], fill=255, width=20)
            d.line([(cx + 44, 505), (cx + 110, 400), (cx + 130, 330)], fill=255, width=20)
        elif pose == 'guitar':  # 기타를 든 모습
            d.line([(cx - 44, 510), (cx - 10, 575)], fill=255, width=18)
            d.polygon([(cx - 150, 520), (cx + 40, 575), (cx + 36, 592), (cx - 156, 536)], fill=255)
            d.ellipse([cx + 10, 545, cx + 95, 625], fill=255)
        elif pose == 'mic':     # 마이크를 높이 든 모습
            d.line([(cx + 44, 505), (cx + 70, 440), (cx + 40, 405)], fill=255, width=18)
            d.line([(cx - 44, 505), (cx - 120, 450)], fill=255, width=18)
            d.line([(cx - 110, 662), (cx - 110, 470)], fill=255, width=5)
        else:                   # 드럼 세트 뒤
            d.ellipse([cx - 110, 560, cx + 110, 662], fill=255)
            d.ellipse([cx - 170, 520, cx - 90, 545], fill=255)
            d.ellipse([cx + 90, 510, cx + 170, 535], fill=255)
            d.line([(cx - 44, 505), (cx - 90, 470)], fill=255, width=16)
            d.line([(cx + 44, 505), (cx + 90, 460)], fill=255, width=16)
        S = 1.5  # 공연자를 1.5배 크게 (발끝 기준)
        body = body.transform((W, H), Image.AFFINE, (1 / S, 0, cx - cx / S, 0, 1 / S, 662 - 662 / S), Image.BICUBIC)
        cover(c, body, 1, '#030306')
        rim = body.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(2))
        add(c, rim, '#ffe7c4', 1.4)

    # 9) 앞쪽 관객: 머리와 번쩍 든 손, 휴대폰 불빛
    crowd, d = mask()
    phones, dp = mask()
    for row, (ybase, size) in enumerate([(820, 1.0), (880, 1.35), (940, 1.8)]):
        x = -40
        while x < W + 40:
            s = size * rnd.uniform(.85, 1.15)
            hy = ybase + rnd.uniform(-18, 18)
            d.ellipse([x - 26 * s, hy - 34 * s, x + 26 * s, hy + 30 * s], fill=255)
            d.rectangle([x - 45 * s, min(hy + 20 * s, H - 1), x + 45 * s, H], fill=255)
            if rnd.random() < .45:  # 손을 번쩍
                side = rnd.choice([-1, 1])
                hx, top = x + side * 30 * s, hy - rnd.uniform(90, 170) * s
                d.line([(x + side * 30 * s, hy + 20 * s), (hx + side * 10 * s, top)], fill=255, width=int(14 * s))
                d.ellipse([hx + side * 10 * s - 11 * s, top - 14 * s, hx + side * 10 * s + 11 * s, top + 8 * s], fill=255)
                if rnd.random() < .25:
                    px, py = hx + side * 10 * s, top - 10 * s
                    dp.rectangle([px - 5 * s, py - 9 * s, px + 5 * s, py + 9 * s], fill=255)
            x += rnd.uniform(46, 70) * s
    cover(c, crowd, 1, '#020204')
    add(c, phones, '#ffffff', 1.4, 1)
    add(c, phones, pal['b'], .6, 8)

    # 10) 마무리: 톤, 비네트, 필름 입자
    c = 1 - np.exp(-c * 1.35)  # 부드럽게 밝기 압축(하이라이트 날아가지 않게)
    yy, xx = np.mgrid[0:H, 0:W]
    v = 1 - .55 * (((xx - W / 2) / (W * .75)) ** 2 + ((yy - H * .45) / (H * .8)) ** 2)
    c *= np.clip(v, 0, 1)[..., None]
    c += np.random.RandomState(seed + 1).normal(0, .018, c.shape).astype(np.float32)
    return Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8))


PALETTES = [
    {'sky': '#1a0b2e', 'a': '#ff3d7f', 'b': '#ffb347'},
    {'sky': '#062030', 'a': '#1fd1c1', 'b': '#8a7bff'},
    {'sky': '#140f3a', 'a': '#8a7bff', 'b': '#ff5a8a'},
    {'sky': '#2a0f00', 'a': '#ff8a24', 'b': '#1fd1c1'},
]

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'images', 'sample'), exist_ok=True)
    for i, (pal, pose) in enumerate(zip(PALETTES, ['arms', 'guitar', 'mic', 'drums'])):
        scene(10 + i, pal, pose, fireworks=(i % 2 == 0)).save(
            os.path.join(ROOT, 'images', 'sample', f'stage{i + 1}.jpg'), quality=82, optimize=True, progressive=True)
    scene(99, {'sky': '#0f2a4a', 'a': '#f08a24', 'b': '#1fd1c1'}, 'arms', performer=True, fireworks=True).save(
        os.path.join(ROOT, 'images', 'stage-epic.jpg'), quality=82, optimize=True, progressive=True)
    print('done')
