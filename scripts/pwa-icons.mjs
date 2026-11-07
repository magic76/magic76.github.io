import {readFileSync} from "node:fs";
import {Buffer} from "node:buffer";
import {deflateSync,inflateSync} from "node:zlib";

/*
 * Crew's PWA identity is the official Crew Teacher Android launcher image,
 * not an independently drawn mascot. Source is a byte-identical copy of
 * magic76/crew-teacher/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png.
 *
 * Generate 180/192/512 and maskable icons without extra npm dependencies.
 * The shortcut icons are drawn as real PNG pictograms, never font/emoji glyphs.
 */
const nativeBytes=readFileSync(new URL("../web-spa/public/icons/crew-teacher-source.png",import.meta.url));
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const crcTable=Uint32Array.from({length:256},(_,index)=>{
 let value=index;
 for(let j=0;j<8;j++)value=value&1?0xedb88320^(value>>>1):value>>>1;
 return value>>>0;
});
function crc(bytes){
 let n=0xffffffff;
 for(const byte of bytes)n=crcTable[(n^byte)&255]^(n>>>8);
 return (n^0xffffffff)>>>0;
}
function chunk(type,bytes){
 const header=Buffer.from(type,"ascii"),out=Buffer.alloc(bytes.length+12);
 out.writeUInt32BE(bytes.length,0);
 header.copy(out,4);bytes.copy(out,8);
 out.writeUInt32BE(crc(Buffer.concat([header,bytes])),bytes.length+8);
 return out;
}
function encodePng(width,height,rgba){
 const stride=width*4;
 const scan=Buffer.alloc((stride+1)*height);
 for(let y=0;y<height;y++)rgba.copy(scan,y*(stride+1)+1,y*stride,(y+1)*stride);
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
 ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([
  signature,chunk("IHDR",ihdr),chunk("IDAT",deflateSync(scan,{level:9})),chunk("IEND",Buffer.alloc(0))
 ]);
}
function paeth(a,b,c){
 const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
 return da<=db&&da<=dc?a:db<=dc?b:c;
}
function decodeNativePng(bytes){
 if(!bytes.subarray(0,8).equals(signature))throw Error("Crew Teacher logo is not PNG");
 let cursor=8,w=0,h=0,channels=0,interlace=0;
 const idat=[];
 while(cursor+12<=bytes.length){
  const length=bytes.readUInt32BE(cursor),type=bytes.toString("ascii",cursor+4,cursor+8);
  if(cursor+length+12>bytes.length)throw Error("Truncated Crew Teacher PNG chunk");
  const body=bytes.subarray(cursor+8,cursor+8+length);
  if(type==="IHDR"){
   w=body.readUInt32BE(0);h=body.readUInt32BE(4);
   if(body[8]!==8||body[9]!==6||body[10]!==0||body[11]!==0)throw Error("Expected 8-bit RGBA Crew Teacher launcher PNG");
   interlace=body[12];channels=4;
  }
  if(type==="IDAT")idat.push(body);
  cursor+=length+12;
  if(type==="IEND")break;
 }
 if(!w||!h||w>2048||h>2048||!idat.length||!channels||interlace)throw Error("Unsupported native PNG encoding");
 const raw=inflateSync(Buffer.concat(idat));
 const stride=w*4,rgba=Buffer.alloc(w*h*4);
 if(raw.length!==(stride+1)*h)throw Error("Unexpected native PNG data length");
 let input=0,previous=Buffer.alloc(stride);
 for(let y=0;y<h;y++){
  const filter=raw[input++];
  if(filter>4)throw Error("Unsupported native PNG row filter");
  const current=Buffer.alloc(stride);
  for(let i=0;i<stride;i++){
   const value=raw[input++],left=i>=4?current[i-4]:0,up=previous[i],upLeft=i>=4?previous[i-4]:0;
   let predictor=0;
   if(filter===1)predictor=left;
   else if(filter===2)predictor=up;
   else if(filter===3)predictor=Math.floor((left+up)/2);
   else if(filter===4)predictor=paeth(left,up,upLeft);
   current[i]=(value+predictor)&255;
  }
  current.copy(rgba,y*stride);previous=current;
 }
 return {width:w,height:h,rgba};
}
const native=decodeNativePng(nativeBytes);
function sample(x,y){
 const ix=Math.max(0,Math.min(native.width-1,Math.floor(x)));
 const iy=Math.max(0,Math.min(native.height-1,Math.floor(y)));
 return (iy*native.width+ix)*4;
}
function renderNative(size,maskable){
 const image=Buffer.alloc(size*size*4);
 const area=maskable?0.72:1;
 // RGB pre-multiplied bilinear resampling avoids dark fringes around the
 // alpha edges of the real Play Store / Android launcher artwork.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  if(maskable){image[i]=9;image[i+1]=13;image[i+2]=22;image[i+3]=255;}
  const u=((x+.5)/size-(1-area)/2)/area;
  const v=((y+.5)/size-(1-area)/2)/area;
  if(u<0||u>=1||v<0||v>=1)continue;
  const fx=u*native.width-.5,fy=v*native.height-.5;
  const x0=Math.floor(fx),y0=Math.floor(fy),dx=fx-x0,dy=fy-y0;
  let alpha=0,colors=[0,0,0];
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const weight=(col?dx:1-dx)*(row?dy:1-dy);
   const p=sample(x0+col,y0+row),a=native.rgba[p+3]/255*weight;
   alpha+=a;
   for(let k=0;k<3;k++)colors[k]+=native.rgba[p+k]*a;
  }
  if(alpha<=0)continue;
  if(maskable){
   for(let k=0;k<3;k++)image[i+k]=Math.round(colors[k]+image[i+k]*(1-alpha));
  }else{
   for(let k=0;k<3;k++)image[i+k]=Math.round(colors[k]/alpha);
   image[i+3]=Math.round(alpha*255);
  }
 }
 return encodePng(size,size,image);
}
export function createCrewPwaIcon(size,maskable=false){
 if(!Number.isInteger(size)||size<16||size>1024)throw Error("Invalid PWA icon size");
 // 192px should be precisely the Android native launcher image, byte for byte.
 if(size===native.width&&!maskable)return Buffer.from(nativeBytes);
 return renderNative(size,maskable);
}
function rounded(x,y,l,t,r,b,radius){
 if(x<l||x>r||y<t||y>b)return false;
 const cx=Math.max(l+radius,Math.min(r-radius,x));
 const cy=Math.max(t+radius,Math.min(b-radius,y));
 return (x-cx)**2+(y-cy)**2<=radius**2;
}
function circle(x,y,cx,cy,r){return (x-cx)**2+(y-cy)**2<=r*r;}
function polygon(x,y,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function glyph(kind,x,y){
 if(kind==="chat"){
  const bubble=rounded(x,y,.19,.255,.81,.69,.16)||
   polygon(x,y,[[.30,.60],[.285,.80],[.48,.67]]);
  if(!bubble)return -1;
  return circle(x,y,.37,.48,.035)||circle(x,y,.50,.48,.035)||circle(x,y,.63,.48,.035)?2:1;
 }
 if(kind==="learn"){
  const left=rounded(x,y,.185,.26,.477,.725,.052);
  const right=rounded(x,y,.523,.26,.815,.725,.052);
  if(!left&&!right)return -1;
  if(rounded(x,y,.26,.39,.415,.412,.008)||rounded(x,y,.26,.49,.415,.512,.008)||
     rounded(x,y,.585,.39,.74,.412,.008)||rounded(x,y,.585,.49,.74,.512,.008))return 2;
  return 1;
 }
 if(kind==="games"){
  if(!rounded(x,y,.15,.305,.85,.695,.16))return -1;
  if(rounded(x,y,.295,.405,.365,.595,.018)||
     rounded(x,y,.235,.465,.425,.535,.018)||
     circle(x,y,.64,.46,.045)||circle(x,y,.73,.54,.045))return 2;
  return 1;
 }
 throw Error("Unknown PWA shortcut: "+kind);
}
export function createCrewShortcutIcon(kind,size=96){
 if(!["chat","learn","games"].includes(kind))throw Error("Unknown shortcut icon kind");
 if(!Number.isInteger(size)||size<48||size>512)throw Error("Invalid shortcut icon size");
 const image=Buffer.alloc(size*size*4);
 const accent=kind==="chat"?[63,132,206]:kind==="learn"?[113,93,207]:[42,146,177];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  // Four samples per pixel soften edges for 96px Android launcher shortcuts.
  let opacity=0,r=0,g=0,b=0;
  for(const ox of [.25,.75])for(const oy of [.25,.75]){
   const u=(x+ox)/size,v=(y+oy)/size;
   if(!rounded(u,v,.018,.018,.982,.982,.195))continue;
   let color=[12+accent[0]*v*.22,24+accent[1]*v*.25,48+accent[2]*v*.30];
   const glow=Math.max(0,1-Math.hypot(u-.74,v-.22)*1.28);
   color=color.map((n,i)=>n+accent[i]*glow*.37);
   const shape=glyph(kind,u,v);
   if(shape===1)color=[250,251,255];
   if(shape===2)color=[24,44,78];
   opacity++;
   r+=color[0];g+=color[1];b+=color[2];
  }
  const i=(y*size+x)*4;
  if(opacity){
   image[i]=Math.round(r/opacity);
   image[i+1]=Math.round(g/opacity);
   image[i+2]=Math.round(b/opacity);
   image[i+3]=Math.round(255*opacity/4);
  }
 }
 return encodePng(size,size,image);
}
