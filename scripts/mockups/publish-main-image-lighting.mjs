import {config} from 'dotenv';
import {createClient} from '@sanity/client';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

config({quiet:true});
const root=path.resolve('outputs/main-image-lighting-2026-09-20');
const client=createClient({projectId:process.env.SANITY_PROJECT_ID,dataset:process.env.SANITY_DATASET||'production',apiVersion:'2025-05-21',token:process.env.SANITY_WRITE_TOKEN,perspective:'raw',useCdn:false});
const mode=process.argv[2]||'audit';
async function run(){
 const edits=JSON.parse(await readFile(path.join(root,'edited-manifest.json'),'utf8'));
 if(edits.length!==50||edits.some(p=>!p.visibleOnStorefront||p.outerEdgeAlpha!==0||p.width!==p.outputWidth||p.height!==p.outputHeight))throw new Error('Batch did not pass invariants');
 const uploadedFile=path.join(root,'uploaded-assets.json');
 let uploaded=[];try{uploaded=JSON.parse(await readFile(uploadedFile,'utf8'));}catch{}
 if(mode==='upload'){
  // Asset uploads are additive. Product references are unchanged until apply.
  for(const p of edits){
   if(uploaded.some(a=>a.id===p.id))continue;
   const file=await readFile(p.outputPath);if(createHash('sha256').update(file).digest('hex')!==p.sha256)throw new Error(`Edited file changed: ${p.slug}`);
   const asset=await client.assets.upload('image',file,{filename:p.outputFilename});
   if(asset.metadata.dimensions.width!==p.width||asset.metadata.dimensions.height!==p.height)throw new Error(`Uploaded size mismatch: ${p.slug}`);
   uploaded.push({id:p.id,slug:p.slug,oldRef:p.imageRef,newRef:asset._id,url:asset.url,sha1:asset.sha1,width:p.width,height:p.height});
   await writeFile(uploadedFile,JSON.stringify(uploaded,null,2));console.log(`Uploaded ${uploaded.length}/50: ${p.title}`);
  }
  await writeFile('shared/main-image-lighting-assets.json',JSON.stringify({version:1,assetHashes:uploaded.map(p=>p.sha1),keepCropAssetHashes:uploaded.filter(p=>p.slug==='money-band-aid').map(p=>p.sha1)},null,2)+'\n');
 }
 if(mode==='apply'){
  if(uploaded.length!==50)throw new Error('Need all 50 verified asset uploads');
  const ids=edits.map(p=>p.id);
  const docs=await client.fetch('*[_id in $ids]',{ids});
  const backup=JSON.parse(await readFile(path.join(root,'catalog-before.json'),'utf8'));
  let transaction=client.transaction();
  for(const p of uploaded){
   const live=docs.find(d=>d._id===p.id),before=backup.documents.find(d=>d._id===p.id);
   if(!live||live.published===false||live.mainImage?.asset?._ref!==p.oldRef)throw new Error(`Main image or visibility changed during work: ${p.slug}`);
   if(JSON.stringify(live.mainImage)!==JSON.stringify(before.mainImage))throw new Error(`Main image metadata changed: ${p.slug}`);
   transaction=transaction.patch(p.id,patch=>patch.ifRevisionId(live._rev).set({'mainImage.asset._ref':p.newRef}));
  }
  await writeFile(path.join(root,'documents-immediately-before-apply.json'),JSON.stringify(docs,null,2));
  const result=await transaction.commit({visibility:'sync'});
  await writeFile(path.join(root,'commit-result.json'),JSON.stringify(result,null,2));
  const after=await client.fetch('*[_id in $ids]',{ids});
  for(const p of uploaded){
   const d=after.find(x=>x._id===p.id),b=docs.find(x=>x._id===p.id);
   if(d?.mainImage?.asset?._ref!==p.newRef)throw new Error(`Readback mismatch: ${p.slug}`);
   const clean=v=>{v=structuredClone(v);delete v._rev;delete v._updatedAt;delete v._system;v.mainImage.asset._ref='IMAGE';return v;};
   if(JSON.stringify(clean(d))!==JSON.stringify(clean(b)))throw new Error(`Unexpected field change: ${p.slug}`);
  }
  await writeFile(path.join(root,'catalog-after.json'),JSON.stringify(after,null,2));
  console.log('Updated and read-back verified all 50 product main-image references. All other fields preserved.');
 }
 if(mode==='audit')console.log(JSON.stringify({edited:edits.length,uploaded:uploaded.length,dimensionsPreserved:true},null,2));
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
