import {deflateSync} from "node:zlib";
import {Buffer} from "node:buffer";

// Dependency-free PNG renderer: Crew's orange hood / dark face / white eyes,
// matching the brand mascot without introducing a new runtime or build service.
const crcTable=Uint32Array.from({length:256},(_,i)=>{
 let value=i;
 for(let j=0;j<8;j++)value=(value&1)?(0xedb88320^(value>>>1)):(value>>>1);
 return value>>>0;
});
function crc(buffer){
 let value=0xffffffff;
 for(const byte of buffer)value=crcTable[(value^byte)&255]^(value>>>8);
 return (value^0xffffffff)>>>0;
}
function chunk(type,body){
 const name=Buffer.from(type,"ascii");
 const result=Buffer.alloc(body.length+12);
 result.writeUInt32BE(body.length,0);
 name.copy(result,4);
 body.copy(result,8);
 const checksum=crc(Buffer.concat([name,body]));
 result.writeUInt32BE(checksum,body.length+8);
 return result;
}
function within(x,y,cx,cy,rx,ry){
 return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
}
function pixel(x,y,maskable){
 const scale=maskable?0.81:1;
 x=(x-.5)/scale+.5;
 y=(y-.5)/scale+.5;
 let color=[247,247,244,255];
 // Clothing first, then hood, face, and eyes. All edges fit the OS safe area.
 if(within(x,y,.5,.78,.28,.18))color=[255,255,255,255];
 if(within(x,y,.5,.42,.315,.33))color=[255,154,0,255];
 if(within(x,y,.5,.43,.236,.254))color=[29,30,34,255];
 if(within(x,y,.427,.447,.045,.074)||within(x,y,.573,.447,.045,.074))color=[255,255,255,255];
 if(within(x,y,.5,.745,.1,.025))color=[234,235,235,255];
 return color;
}
export function createCrewPwaIcon(size,maskable=false){
 if(!Number.isInteger(size)||size<16||size>1024)throw Error("Invalid PWA icon size");
 const rowLength=size*4+1;
 const bitmap=Buffer.alloc(size*rowLength);
 for(let y=0;y<size;y++){
  const start=y*rowLength;
  bitmap[start]=0; // PNG filter: none
  for(let x=0;x<size;x++){
   const rgba=pixel((x+.5)/size,(y+.5)/size,maskable);
   for(let j=0;j<4;j++)bitmap[start+1+x*4+j]=rgba[j];
  }
 }
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk("IHDR",ihdr),
  chunk("IDAT",deflateSync(bitmap,{level:9})),
  chunk("IEND",Buffer.alloc(0))
 ]);
}
