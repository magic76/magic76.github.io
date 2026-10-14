"""Rebuild Crew OG cards (1200x630) from their original deterministic artwork source.

Requirements: python3 + numpy + pillow; Noto Sans CJK and DejaVu Sans fonts.
Source is kept in git to make the branded social cards reproducible.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import numpy as np
import math, random

OUT=Path(__file__).resolve().parent.parent / 'social'
OUT.mkdir(parents=True,exist_ok=True)
W,H=1200,630
S=2
WS,HS=W*S,H*S
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'  # fonts-noto-cjk on ubuntu
FONT_EN='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
random.seed(76)

def c(rgb,a=255): return (*rgb,a)
def font(sz,bold=False,en=False):
    path=FONT_EN if en else FONT
    return ImageFont.truetype(path,sz*S,index=0)

def line(d,points,fill,width=1,joint='curve'):
    d.line([(int(x*S),int(y*S)) for x,y in points],fill=fill,width=int(width*S),joint=joint)
def ellipse(d,box,fill=None,outline=None,width=1):
    d.ellipse(tuple(int(x*S) for x in box),fill=fill,outline=outline,width=max(1,int(width*S)))
def rr(d,box,r,fill=None,outline=None,width=1):
    d.rounded_rectangle(tuple(int(x*S) for x in box),radius=int(r*S),fill=fill,outline=outline,width=max(1,int(width*S)))
def text(d,pos,string,f,size,fill,stroke=0):
    d.text(tuple(int(x*S) for x in pos),string,font=font(size,en=f=='en'),fill=fill,stroke_width=stroke)

def base(theme,seed):
    random.seed(seed)
    top=(8,15,40); bottom=(22,22,56)
    y=np.linspace(0,1,HS)[:,None,None]
    x=np.linspace(0,1,WS)[None,:,None]
    arr=np.empty((HS,WS,3),dtype=np.float32)
    for k in range(3):
        arr[:,:,k]=top[k]*(1-y[:,:,0])+bottom[k]*y[:,:,0]+4*np.sin(x[:,:,0]*2.8+y[:,:,0]*1.2+k*0.5)
    # cool far-field ambient haze
    xx,yy=np.meshgrid(np.linspace(0,1,WS),np.linspace(0,1,HS))
    for cx,cy,sx,sy,col,opacity in [
      (.80,.38,.23,.38,theme,.46),(.46,-.08,.35,.4,(64,74,150),.14),(.94,1.1,.26,.45,(31,164,180),.16)]:
        v=np.exp(-(((xx-cx)/sx)**2+((yy-cy)/sy)**2)*1.2)*opacity
        for k in range(3): arr[:,:,k]=arr[:,:,k]*(1-v)+col[k]*v
    rand=np.random.default_rng(seed).normal(0,1.5,(HS,WS,1))
    arr=np.clip(arr+rand,0,255).astype('uint8')
    im=Image.fromarray(arr,'RGB').convert('RGBA')
    return im

def add_glows(img,theme,centers):
    blur=Image.new('RGBA',img.size,(0,0,0,0)); d=ImageDraw.Draw(blur,'RGBA')
    for x,y,r,alpha in centers:
        ellipse(d,(x-r,y-r,x+r,y+r),fill=(*theme,alpha))
    img.alpha_composite(blur.filter(ImageFilter.GaussianBlur(38*S)))

def sky(img,theme,seed):
    random.seed(seed)
    d=ImageDraw.Draw(img,'RGBA')
    # ambient micro-star field around illustration, not near the heading
    for _ in range(85):
        x=random.uniform(560,1188); y=random.uniform(14,615)
        r=random.choices([.7,1,1.4,2],[.5,.3,.16,.04])[0]
        ellipse(d,(x-r,y-r,x+r,y+r),fill=(*theme,random.randint(80,185)))
    # dotted tech grid in the right third
    for x in range(666,1200,33):
        for y in range(40,605,33):
            ellipse(d,(x-.65,y-.65,x+.65,y+.65),fill=(166,190,238,30))

def shell(theme,seed):
    im=base(theme,seed)
    add_glows(im,theme,[(905,305,195,50),(1120,110,90,60),(1020,550,120,32)])
    sky(im,theme,seed)
    return im

def header(im,kicker,title,headline,desc,theme,product=None):
    d=ImageDraw.Draw(im,'RGBA')
    # top accent logo, geometric three-diamond mark
    for cx,cy,r in [(83,76,8),(106,65,4.4),(105,91,3.6)]:
        line(d,[(cx,cy-r),(cx+r*.6,cy),(cx,cy+r),(cx-r*.6,cy),(cx,cy-r)],fill=(*theme,255),width=2)
    text(d,(130,47),'Crew','en',34,(246,250,255,255))
    text(d,(83,146),kicker.upper(),'en',16,(*theme,255))
    title_size=70 if len(title)<15 else 63
    text(d,(78,188),title,'en',title_size,(247,249,255,255))
    text(d,(83,293),headline,'zh',35,(234,239,252,255))
    text(d,(85,363),desc,'zh',22,(156,170,200,255))
    rr(d,(82,539,530,541),1,fill=(*theme,195))
    text(d,(84,554),'LEARN   /   IMAGINE   /   EXPLORE   /   DISCOVER','en',13,(149,160,191,255))
    # decor brand index
    rr(d,(1094,50,1148,78),14,fill=(*theme,36),outline=(*theme,120),width=1)
    text(d,(1107,51),'AI','en',13,(*theme,220))

# Fine glow helper
def glow_sphere(im,x,y,r,rgb,alpha=140):
    glow=Image.new('RGBA',im.size,(0,0,0,0));g=ImageDraw.Draw(glow,'RGBA')
    ellipse(g,(x-r*1.2,y-r*1.2,x+r*1.2,y+r*1.2),fill=(*rgb,alpha))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(r*.34*S)))
    d=ImageDraw.Draw(im,'RGBA')
    ellipse(d,(x-r,y-r,x+r,y+r),fill=(*rgb,40),outline=(*rgb,155),width=2)
    ellipse(d,(x-r*.64,y-r*.64,x+r*.64,y+r*.64),fill=(230,234,255,30))

# simplified consistent geometric icon glyphs
def teacher_icon(im,x,y,scale=1,rgb=(181,143,255)):
    d=ImageDraw.Draw(im,'RGBA')
    ell=lambda b,**kw:ellipse(d,tuple([x+v*scale if i%2==0 else y+v*scale for i,v in enumerate(b)]),**kw)
    ellipse(d,(x-45*scale,y-58*scale,x+45*scale,y+34*scale),fill=(229,200,255,70),outline=(*rgb,225),width=2)
    # body
    d.pieslice(tuple(int(k*S) for k in (x-64*scale,y+37*scale,x+64*scale,y+115*scale)),180,360,fill=(*rgb,135))
    ell((-28,-25,28,32),fill=(255,229,210,245))
    # eye dots
    ell((-16,-3,-11,2),fill=(63,49,89,240));ell((10,-3,15,2),fill=(63,49,89,240))
    line(d,[(x-10*scale,y+16*scale),(x,y+20*scale),(x+10*scale,y+16*scale)],fill=(95,55,114,225),width=2)
    # headphones
    ellipse(d,(x-45*scale,y-59*scale,x+45*scale,y+36*scale),outline=(*rgb,225),width=8)
    rr(d,(x-51*scale,y-9*scale,x-36*scale,y+27*scale),7*scale,fill=(*rgb,255))
    rr(d,(x+36*scale,y-9*scale,x+51*scale,y+27*scale),7*scale,fill=(*rgb,255))

def book_icon(im,x,y,scale=1,rgb=(255,190,98)):
    d=ImageDraw.Draw(im,'RGBA')
    # outer book pages
    left=[(x,y+72*scale),(x-48*scale,y+44*scale),(x-116*scale,y+31*scale),(x-113*scale,y-55*scale),(x-55*scale,y-54*scale),(x,y-29*scale)]
    right=[(2*x-u,v) for u,v in reversed(left)]
    poly=lambda pts,fill: d.polygon([(int(px*S),int(py*S)) for px,py in pts],fill=fill)
    poly(left,(249,225,168,255));poly(right,(255,238,189,255))
    line(d,left,(*rgb,255),width=4);line(d,right,(*rgb,255),width=4)
    line(d,[(x,y-30*scale),(x,y+72*scale)],fill=(131,76,59,190),width=3)
    for side in (-1,1):
        for i in range(4):
            yy=y-25*scale+i*15*scale
            line(d,[(x+side*17*scale,yy+5*scale),(x+side*88*scale,yy-7*scale)],fill=(137,93,85,100),width=2)

def zodiac(im,x,y,r=145,rgb=(111,193,255)):
    d=ImageDraw.Draw(im,'RGBA')
    for mult,a,w in [(1.15,55,1),(1,220,2),(.78,110,1),(.44,155,1)]:
        ellipse(d,(x-r*mult,y-r*mult,x+r*mult,y+r*mult),outline=(*rgb,a),width=w)
    for i in range(36):
        theta=(i/36)*2*math.pi
        a=r*.85;b=r*(.99 if i%3==0 else .94)
        line(d,[(x+math.cos(theta)*a,y+math.sin(theta)*a),(x+math.cos(theta)*b,y+math.sin(theta)*b)],fill=(*rgb,190),width=2 if i%3==0 else 1)
    for i in range(12):
        theta=i*math.pi/6
        xx=x+math.cos(theta)*r*.63; yy=y+math.sin(theta)*r*.63
        ellipse(d,(xx-4,yy-4,xx+4,yy+4),fill=(*rgb,205))
    for theta in [0,math.pi/2,math.pi/4,-math.pi/4]:
        line(d,[(x-math.cos(theta)*r*.43,y-math.sin(theta)*r*.43),(x+math.cos(theta)*r*.43,y+math.sin(theta)*r*.43)],fill=(*rgb,110),width=2)
    # central compass star
    pts=[]
    for i in range(16):
        theta=-math.pi/2+i*math.pi/8
        R=48 if i%4==0 else (23 if i%2==0 else 13)
        pts.append((int((x+math.cos(theta)*R)*S),int((y+math.sin(theta)*R)*S)))
    d.polygon(pts,fill=(*rgb,205))
    ellipse(d,(x-10,y-10,x+10,y+10),fill=(236,248,255,245))

def research_icon(im,x,y,theme):
    d=ImageDraw.Draw(im,'RGBA')
    # layered translucent scientific reports
    for ox,oy,opacity in [(55,-30,55),(28,-15,95),(0,0,210)]:
        box=(x-105+ox,y-111+oy,x+100+ox,y+130+oy)
        rr(d,box,17,fill=(25,53,91,215),outline=(*theme,opacity),width=2)
    for i,width in enumerate([128,158,148,96]):
        rr(d,(x-75,y-66+i*28,x-75+width,y-59+i*28),3,fill=(*theme,180-i*17))
    # growth chart
    pts=[(x-70,y+83),(x-34,y+45),(x-3,y+67),(x+35,y+17),(x+76,y-4)]
    line(d,pts,fill=(*theme,255),width=5)
    for xx,yy in pts:ellipse(d,(xx-5,yy-5,xx+5,yy+5),fill=(227,252,255,245))

def home():
    theme=(175,149,255);im=shell(theme,76);header(im,'ONE SPACE · MANY POSSIBILITIES','Crew','你的 AI 夥伴，從學習到探索。','語言學習 · 故事陪讀 · 命理探索 · 每日研究',theme)
    d=ImageDraw.Draw(im,'RGBA')
    glow_sphere(im,897,302,126,(136,151,251),135)
    # network threads converge at core
    for i,(angle,rad,kind) in enumerate([(-2.05,207,'T'),(-.85,210,'S'),(.62,212,'F'),(2.1,202,'R')]):
        x=895+math.cos(angle)*rad; y=296+math.sin(angle)*rad
        line(ImageDraw.Draw(im,'RGBA'),[(895,296),(x,y)],fill=(*theme,105),width=2)
        glow_sphere(im,x,y,53,[(183,142,255),(255,191,101),(121,185,245),(92,221,202)][i],95)
        dd=ImageDraw.Draw(im,'RGBA')
        if kind=='T':
            ellipse(dd,(x-17,y-19,x+17,y+15),outline=(241,221,255,255),width=3)
            dd.arc(tuple(int(z*S) for z in (x-26,y-2,x+26,y+38)),180,360,fill=(241,221,255,240),width=5*S)
        if kind=='S':
            line(dd,[(x,y+15),(x-24,y+2),(x-24,y-17),(x,y-8),(x,y+15),(x+24,y+2),(x+24,y-17),(x,y-8)],fill=(255,238,200,255),width=3)
        if kind=='F':
            ellipse(dd,(x-20,y-20,x+20,y+20),outline=(221,241,255,255),width=3)
            line(dd,[(x-20,y),(x+20,y)],fill=(221,241,255,220),width=2)
        if kind=='R':
            line(dd,[(x-22,y+15),(x-7,y-12),(x+6,y+5),(x+21,y-17)],fill=(212,255,247,255),width=4)
    # core star glow
    glow_sphere(im,895,296,55,(187,176,255),180)
    dd=ImageDraw.Draw(im,'RGBA')
    ellipse(dd,(853,254,937,338),fill=(55,54,133,215),outline=(234,224,255,218),width=3)
    text(dd,(864,262),'C','en',52,(251,247,255,255))
    return im

def teacher():
    theme=(181,145,255);im=shell(theme,77);header(im,'CREW / LANGUAGE','Crew Teacher','讓語言練習，更像真的對話。','AI 老師 · Crew 朋友 · 沉浸式語音練習',theme)
    glow_sphere(im,900,285,167,(142,105,226),120)
    teacher_icon(im,894,260,1.33,theme)
    d=ImageDraw.Draw(im,'RGBA')
    for x,y,msg in [(690,190,'Hi!'),(1060,160,'Hola'),(1035,390,'Hello')]:
        rr(d,(x-38,y-20,x+49,y+27),20,fill=(86,67,151,230),outline=(*theme,130),width=1)
        text(d,(x-25,y-13),msg,'en',17,(245,239,255,255))
    # sound waveform below
    for i in range(21):
        x=740+i*15; value=(10+32*abs(math.sin(i*.82)))*(1-abs(i-10)/28)
        rr(d,(x,494-value/2,x+5,494+value/2),2,fill=(*theme,160))
    return im

def story():
    theme=(255,188,101);im=shell(theme,78);header(im,'CREW / STORYTELLING','Crew Story','從一個想法，走進一段故事。','AI 創作 · 語音朗讀 · 親子陪讀',theme)
    glow_sphere(im,884,304,182,(241,150,67),107)
    book_icon(im,886,332,1.22,theme)
    d=ImageDraw.Draw(im,'RGBA')
    # floating story constellation
    for x,y,size in [(835,105,14),(986,124,9),(1042,184,18),(746,238,9),(1096,300,13)]:
        line(d,[(x,y-size),(x+size*.38,y),(x,y+size),(x-size*.38,y),(x,y-size)],fill=(255,221,152,245),width=2)
    # storybook portal arch
    rr(d,(814,171,967,331),66,fill=(64,43,96,90),outline=(*theme,80),width=2)
    # a castle silhouette
    for x,w,h in [(840,29,68),(890,44,113),(953,24,78)]:
        rr(d,(x,322-h,x+w,322),3,fill=(255,202,140,155))
        d.polygon([(int((x-5)*S),int((322-h)*S)),(int((x+w/2)*S),int((292-h)*S)),(int((x+w+5)*S),int((322-h)*S))],fill=(255,202,140,185))
    return im

def fortune():
    theme=(115,188,255);im=shell(theme,79);header(im,'CREW / SELF DISCOVERY','Crew Fortune','從不同角度，看懂自己的節奏。','八字 · 塔羅生命靈數 · 印度星盤',theme)
    glow_sphere(im,892,298,204,(62,131,217),122)
    zodiac(im,891,300,173,theme)
    d=ImageDraw.Draw(im,'RGBA')
    for x,y,r in [(1134,95,27),(725,495,16),(1077,492,20)]:
        ellipse(d,(x-r,y-r,x+r,y+r),fill=(80,137,204,125),outline=(*theme,170),width=2)
    return im

def research():
    theme=(97,220,206);im=shell(theme,80);header(im,'CREW / AI RESEARCH','Crew Research','每天找出真正值得研究的事。','論文精選 · AI Agent · 工程實作洞察',theme)
    glow_sphere(im,890,310,189,(56,188,180),115)
    research_icon(im,854,325,theme)
    d=ImageDraw.Draw(im,'RGBA')
    # knowledge graph behind reports
    pts=[(704,205),(769,133),(994,115),(1101,198),(1128,395),(1042,521),(693,470)]
    edges=[(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0),(1,4),(0,5)]
    for a,b in edges:line(d,[pts[a],pts[b]],fill=(*theme,75),width=2)
    for x,y in pts:
        ellipse(d,(x-5,y-5,x+5,y+5),fill=(188,255,242,235))
    return im

for slug,fn in [('crew',home),('teacher',teacher),('story',story),('fortune',fortune),('research',research)]:
    image=fn().convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
    image.save(OUT/(slug+'.png'),format='PNG',optimize=True)
    print(slug, image.size, (OUT/(slug+'.png')).stat().st_size)
