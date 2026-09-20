import {config} from 'dotenv';
import {createClient} from '@sanity/client';
import {readFile,writeFile} from 'node:fs/promises';
config({quiet:true});
const c=createClient({projectId:process.env.SANITY_PROJECT_ID,dataset:process.env.SANITY_DATASET||'production',apiVersion:'2025-05-21',token:process.env.SANITY_WRITE_TOKEN,useCdn:false,perspective:'raw'});
async function run(){
 const slug='departure-passport';
 const existing=await c.fetch('*[_type=="artworkProduct" && (slug.current==$slug || productId==$id || title match "*passport*")]{_id,title}',{slug,id:`${slug}-canvas`});
 if(existing.length) throw new Error('Matching product already exists; no changes made.');
 const doc={_id:`artworkProduct.${slug}-canvas`,_type:'artworkProduct',productId:`${slug}-canvas`,slug:{_type:'slug',current:slug},title:'Departure – Passport',description:'A navy-and-gold passport-inspired canvas with the reminder “Time once lost is never found,” made for travelers and spaces that inspire your next move.',longDescription:'Departure – Passport turns the familiar passport cover into a daily reminder to make time count. Gold lettering and an eagle emblem stand against a textured navy background, with “Time once lost is never found” at the heart of the design. The portrait composition brings a sense of travel, possibility, and purpose to a home office, entryway, or creative space.',details:['Passport-inspired design with gold lettering and an eagle emblem on textured navy.','“Time once lost is never found” brings a daily reminder to make time count.','Portrait composition suited to entryways, home offices, and travel-inspired spaces.'],tone:'focus',collectionSlugs:['new-arrivals','discipline-focus'],sizePreset:'portraitThreeFour',useCustomSizeOptions:false,seoTitle:'Departure – Passport Canvas Wall Art | Armoze',seoDescription:'Explore Departure – Passport, navy-and-gold passport wall art with “Time once lost is never found.” A travel-inspired canvas for your office or entryway.',seoAliases:['passport canvas wall art','departure passport artwork','navy and gold wall art','travel inspired canvas print','time once lost is never found','motivational office wall art'],published:true,sortOrder:30};
 if(doc.description.length>180||doc.seoDescription.length>160||doc.seoTitle.length>65) throw new Error('Copy exceeds schema limits');
 const specs=[['main mockup.png','Navy-and-gold passport canvas with an eagle emblem and the words “Time once lost is never found.”'],['mockup 1.png','Departure – Passport canvas displayed above a console beside a lamp and travel books.'],['mockup 2.png','Angled view of Departure – Passport canvas above a console with books and a vase.'],['side.png','Close side view showing the navy-and-gold passport design and canvas edge.']];
 const images=[];
 for(const [i,[file,alt]] of specs.entries()) {const asset=await c.assets.upload('image',await readFile(`dist/artwork/depature - passport/${file}`),{filename:`departure-passport-${file.replaceAll(' ','-')}`});images.push({_type:'image',_key:`departure-${i}`,asset:{_type:'reference',_ref:asset._id},alt});console.log('Uploaded',file);}
 const {_key,...mainImage}=images[0];doc.mainImage=mainImage;doc.galleryImages=images.slice(1);
 await writeFile('tmp/departure-passport-import.json',JSON.stringify(doc,null,2));
 await c.create(doc);
 const saved=await c.fetch('*[_id==$id][0]{_id,title,slug,published,sizePreset,collectionSlugs,description,details,seoTitle,seoDescription,seoAliases,"mainImage":mainImage.asset->url,"gallery":galleryImages[]{alt,"url":asset->url}}',{id:doc._id});
 if(!saved.mainImage||saved.gallery.length!==3||saved.gallery.some(x=>!x.url))throw new Error('Image verification failed');
 console.log(JSON.stringify(saved,null,2));
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
