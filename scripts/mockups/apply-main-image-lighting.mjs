import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve('outputs/main-image-lighting-2026-09-20');
const sources=JSON.parse(await readFile(path.join(root,'manifest-before.json'),'utf8'));
const alphaAudit=JSON.parse(await readFile(path.join(root,'alpha-inventory.json'),'utf8'));
const only=process.argv.indexOf('--only');
const targets=sources.filter(p=>p.visibleOnStorefront&&(!process.argv[only+1]||only<0||process.argv[only+1].split(',').includes(p.slug)));
await mkdir(path.join(root,'edited'),{recursive:true});
const results=[];

for(const p of targets){
 const {data:original,info}=await sharp(p.originalPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const bounds=alphaAudit.find(a=>a.id===p.id).bounds['128'];
 const {left,top,width,height}=bounds;const W=info.width,H=info.height;
 const lit=Buffer.from(original), objectAlpha=Buffer.alloc(W*H);
 // Existing source pixels and geometry are retained. These are the template's
 // daylight and rim-light layers, with no replacement background or texture.
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const k=(y*W+x)*4,a=original[k+3];if(a===0)continue;
  objectAlpha[y*W+x]=a>=128?255:0;
  const u=Math.max(0,Math.min(1,(x-left)/(width-1))),v=Math.max(0,Math.min(1,(y-top)/(height-1)));
  const diagonal=.52*u+.48*v;
  const diffuse=.095*Math.pow(1-diagonal,2.0);
  const faceShade=.115*Math.pow(diagonal,1.65);
  const leftRim=.23*Math.exp(-Math.pow((u-.0033)/.0033,2));
  const topRim=.13*Math.exp(-Math.pow(v/.0038,2));
  const edgeShade=.19*Math.exp(-Math.pow((1-v)/.005,2))+.13*Math.exp(-Math.pow((1-u)/.0048,2));
  const screen=1-(1-diffuse)*(1-leftRim)*(1-topRim);
  for(let c=0;c<3;c++){
   const value=original[k+c]/255;
   const light=[1,.976,.949][c];
   lit[k+c]=Math.round(255*Math.max(0,Math.min(1,(1-(1-value)*(1-screen*light))*(1-faceShade)*(1-edgeShade))));
  }
 }
 const shadow=Buffer.alloc(W*H*4),rightMargin=W-left-width,bottomMargin=H-top-height;
 const baseScale=Math.max(width,height)/2340;
 const recipes=[{dx:35,dy:54,blur:58,opacity:.20},{dx:55,dy:72,blur:32,opacity:.30},{dx:7,dy:10,blur:9,opacity:.39}];
 // Keep the shadow inside each original image, including unusually tight margins.
 for(const r of recipes){
  const scale=Math.min(baseScale,rightMargin*.94/(r.dx+3*r.blur),bottomMargin*.94/(r.dy+3*r.blur));
  if(!(scale>0))continue;
  const dx=Math.round(r.dx*scale),dy=Math.round(r.dy*scale);
  const blurred=await sharp(objectAlpha,{raw:{width:W,height:H,channels:1}}).blur(Math.max(.3,r.blur*scale)).extractChannel(0).raw().toBuffer();
  for(let y=dy;y<H;y++)for(let x=dx;x<W;x++){
   const i=(y*W+x)*4,alpha=blurred[(y-dy)*W+x-dx]/255*r.opacity;
   shadow[i]=49;shadow[i+1]=43;shadow[i+2]=32;
   shadow[i+3]=Math.round(255*(1-(1-shadow[i+3]/255)*(1-alpha)));
  }
 }
 const filename=`${p.slug}-lighting-shadow-v1.png`,outputPath=path.join(root,'edited',filename);
 await sharp(shadow,{raw:{width:W,height:H,channels:4}}).composite([{input:lit,raw:{width:W,height:H,channels:4},blend:'over'}]).png({compressionLevel:6}).toFile(outputPath);
 const {data:out,info:outInfo}=await sharp(outputPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(outInfo.width!==W||outInfo.height!==H)throw new Error(`${p.slug}: dimensions changed`);
 let opaqueChanged=0,originalOpaque=0,shadowPixels=0,outerEdgeAlpha=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4;
  if(original[i+3]===255){originalOpaque++;if(out[i+3]!==255)throw new Error(`${p.slug}: opaque artwork geometry changed`);if(out[i]!==original[i]||out[i+1]!==original[i+1]||out[i+2]!==original[i+2])opaqueChanged++;}
  if(original[i+3]===0&&out[i+3]>0)shadowPixels++;
  if(x===0||y===0||x===W-1||y===H-1)outerEdgeAlpha=Math.max(outerEdgeAlpha,out[i+3]);
 }
 if(outerEdgeAlpha>0)throw new Error(`${p.slug}: shadow clipped at image perimeter`);
 const result={...p,outputPath,outputFilename:filename,bounds,outputWidth:W,outputHeight:H,originalOpaque,opaqueChanged,shadowPixels,outerEdgeAlpha,sha256:createHash('sha256').update(await readFile(outputPath)).digest('hex')};
 results.push(result);console.log(JSON.stringify({slug:p.slug,width:W,height:H,shadowPixels,outerEdgeAlpha}));
}
await writeFile(path.join(root,only>=0?'pilot-manifest.json':'edited-manifest.json'),JSON.stringify(results,null,2));
