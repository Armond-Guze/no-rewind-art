import sharp from 'sharp';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'photoshop-template/main-images-v1');
const assets = path.join(output, 'assets');
await mkdir(assets, {recursive:true});
const size = 3000;
const ratios = [['landscape-2x1',2,1],['landscape-3x2',3,2],['landscape-4x3',4,3],['square-1x1',1,1],['portrait-2x3',2,3],['portrait-3x4',3,4]];
await sharp(path.join(root,'mockups/assets/main-reference-v1/wall.png')).resize(size,size).png().toFile(path.join(assets,'wall.png'));
const texture = await sharp(path.join(root,'mockups/assets/main-reference-v1/canvas-material-reference.png')).extract({left:200,top:300,width:800,height:600}).greyscale().png().toBuffer();
const manifest=[];
for (const [id,rw,rh] of ratios) {
  const unit = Math.floor(2340 / Math.max(rw,rh) / 2) * 2;
  const width=unit*rw,height=unit*rh,left=(size-width)/2,top=(size-height)/2;
  const rect=(x,y,w,h,fill,rx=9)=>`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/></svg>`;
  const layers=[];
  for(const [label,dx,dy,blur,opacity] of [['ambient-shadow',35,54,58,.26],['directional-shadow',55,72,32,.32],['contact-shadow',7,10,9,.48]]) {
    const file=`${id}-${label}.png`;
    await sharp(Buffer.from(rect(left+dx,top+dy,width,height,`rgba(49,43,32,${opacity})`))).blur(blur).png().toFile(path.join(assets,file));
    layers.push({label,file});
  }
  const lighting=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="white"/><stop offset=".5" stop-color="#fbfbfb"/><stop offset="1" stop-color="#e5e5e5"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  await sharp(Buffer.from(lighting)).png().toFile(path.join(assets,`${id}-lighting.png`));
  await sharp(texture).resize(width,height,{fit:'fill'}).png().toFile(path.join(assets,`${id}-texture.png`));
  const edge=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="l"><stop stop-color="white" stop-opacity=".02"/><stop offset=".2" stop-color="white" stop-opacity=".45"/><stop offset=".55" stop-color="white" stop-opacity=".09"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="t" x2="0" y2="1"><stop stop-color="white" stop-opacity=".38"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="b" x2="0" y2="1"><stop stop-opacity="0"/><stop offset="1" stop-opacity=".36"/></linearGradient><linearGradient id="r"><stop stop-opacity="0"/><stop offset="1" stop-opacity=".24"/></linearGradient></defs><rect width="27" height="${height}" fill="url(#l)"/><rect width="${width}" height="10" fill="url(#t)"/><rect y="${height-16}" width="${width}" height="16" fill="url(#b)"/><rect x="${width-13}" width="13" height="${height}" fill="url(#r)"/></svg>`;
  await sharp(Buffer.from(edge)).png().toFile(path.join(assets,`${id}-edges.png`));
  manifest.push({id,ratio:`${rw}:${rh}`,width,height,left,top,layers});
}
await sharp(path.join(root,'dist/artwork/life-has-no-rewind/60x40.png'),{limitInputPixels:false}).extract({left:450,top:450,width:18000,height:12000}).resize(2340,1560).png().toFile(path.join(assets,'cassette-test-art.png'));
await writeFile(path.join(output,'geometry.json'),JSON.stringify({size,templates:manifest},null,2));
console.log('Prepared exact-ratio template assets:',manifest.map(x=>`${x.id} ${x.width}x${x.height}`).join(', '));
