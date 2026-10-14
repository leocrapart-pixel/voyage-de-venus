import zlib, struct, sys, colorsys
def decode(path):
    d=open(path,'rb').read()
    assert d[:8]==b'\x89PNG\r\n\x1a\n'
    pos=8; idat=b''; W=H=None; bd=ct=None
    while pos<len(d):
        ln=struct.unpack('>I',d[pos:pos+4])[0]; typ=d[pos+4:pos+8]; data=d[pos+8:pos+8+ln]; pos+=12+ln
        if typ==b'IHDR': W,H,bd,ct,comp,filt,inter=struct.unpack('>IIBBBBB',data)
        elif typ==b'IDAT': idat+=data
        elif typ==b'IEND': break
    raw=zlib.decompress(idat)
    ch={0:1,2:3,3:1,4:2,6:4}[ct]
    assert bd==8, bd
    stride=W*ch
    out=bytearray(H*stride); prev=bytearray(stride); p=0
    for y in range(H):
        f=raw[p]; p+=1
        line=bytearray(raw[p:p+stride]); p+=stride
        if f==1:
            for i in range(ch,stride): line[i]=(line[i]+line[i-ch])&255
        elif f==2:
            for i in range(stride): line[i]=(line[i]+prev[i])&255
        elif f==3:
            for i in range(stride):
                a=line[i-ch] if i>=ch else 0
                line[i]=(line[i]+((a+prev[i])>>1))&255
        elif f==4:
            for i in range(stride):
                a=line[i-ch] if i>=ch else 0
                b=prev[i]; c=prev[i-ch] if i>=ch else 0
                pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        out[y*stride:(y+1)*stride]=line; prev=line
    return W,H,ch,bytes(out)

if __name__=='__main__':
    W,H,ch,px=decode('chakras.png')
    print('decoded',W,H,'channels',ch)
    def rgb(x,y):
        o=(y*W+x)*ch; return px[o],px[o+1],px[o+2]
    # saturation map, restricted to central band
    print('\nper-row peak saturation (central 600px band), rows where sat is high:')
    rows=[]
    for y in range(H):
        best=0; bx=0; bcol=None
        for x in range(0,W,2):
            r,g,b=rgb(x,y)
            mx=max(r,g,b); mn=min(r,g,b)
            s=0 if mx==0 else (mx-mn)/mx
            if s>best: best,bx,bcol=s,x,(r,g,b)
        if best>0.45 and max(bcol)>90:
            rows.append((y,bx,bcol,round(best,2)))
    # group contiguous rows
    groups=[]
    for r in rows:
        if groups and r[0]-groups[-1][-1][0]<=6: groups[-1].append(r)
        else: groups.append([r])
    print(f'{len(groups)} clusters\n')
    for i,g in enumerate(groups):
        ys=[t[0] for t in g]; xs=[t[1] for t in g]
        # colour at the cluster centroid
        cy=sum(ys)//len(ys); cx=sum(xs)//len(xs)
        # use the most saturated pixel in the cluster
        pk=max(g,key=lambda t:t[3])
        r,gc,b=pk[2]
        hh,ss,vv=colorsys.rgb_to_hsv(r/255,gc/255,b/255)
        print(f'gate{i+1}: rows {ys[0]}-{ys[-1]} (mid {cy}, h={ys[-1]-ys[0]+1})  x~{pk[1]}  rgb={pk[2]}  hsl_hue={hh*360:.0f}deg  sat={pk[3]}')
