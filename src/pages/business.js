import { shell, message } from '../components/shell.js';
import { requireClient } from '../services/client.js';
import { escapeHtml, safeUrl } from '../utils/html.js';
shell('Business');
const target=document.querySelector('#detail');
try {
 const id=new URLSearchParams(location.search).get('id');
 if(!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Choose a business from the directory.');
 const {data:b,error}=await requireClient().from('businesses').select('*,categories(name)').eq('id',id).eq('status','approved').maybeSingle();
 if(error) throw error;
 if(!b) throw new Error('This business is unavailable.');
 shell(b.name);
 target.innerHTML=`<p class="eyebrow">${escapeHtml(b.categories?.name)}</p><h1>${escapeHtml(b.name)}</h1><p class="lead">${escapeHtml(b.tagline)}</p><div class="row g-5"><div class="col-lg-8"><p class="detail-copy">${escapeHtml(b.description)}</p><h2>Amenities</h2><p>${b.amenities.map(escapeHtml).join(' ? ') || 'No amenities listed.'}</p></div><aside class="col-lg-4"><div class="card"><h2>Plan your visit</h2><p>${escapeHtml(b.address)}, ${escapeHtml(b.city)} ${escapeHtml(b.postcode)}</p><p>${escapeHtml(b.phone)}</p><p>${escapeHtml(b.email)}</p><p class="detail-copy">${escapeHtml(b.opening_hours)}</p>${safeUrl(b.website) ? `<a href="${escapeHtml(safeUrl(b.website))}" rel="noopener noreferrer" target="_blank">Visit website ?</a>` : ''}</div></aside></div>`;
} catch(error) { message(target,error.message,true); }

import {session,checked} from '../services/session.js';
import {downloadFile} from '../services/files.js';
const idForExtras=new URLSearchParams(location.search).get('id');
if(idForExtras){try{const db=requireClient();
 const reviews=await checked(db.from('reviews').select('rating,body').eq('business_id',idForExtras).eq('status','approved').order('created_at',{ascending:false}).limit(50));
 const section=document.createElement('section');section.className='mt-5';section.innerHTML='<h2>Local reviews</h2>'+reviews.map(r=>`<article class="card my-3"><p>${r.rating} / 5 stars</p><p>${escapeHtml(r.body)}</p></article>`).join('')+`<form id="review-form" class="auth"><label for="rating" class="form-label">Your rating</label><select class="form-select" name="rating" id="rating">${[5,4,3,2,1].map(n=>`<option>${n}</option>`).join('')}</select><label class="form-label" for="body">Your review</label><textarea id="body" name="body" class="form-control" minlength="10" maxlength="3000" required></textarea><button class="btn btn-dark mt-3">Submit review</button><p id="review-status" role="status"></p></form>`;target.append(section);
 section.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const {user}=await session();await checked(db.from('reviews').insert({business_id:idForExtras,author_id:user.id,rating:Number(e.target.elements.rating.value),body:e.target.elements.body.value}));e.target.reset();message(document.querySelector('#review-status'),'Review submitted for approval.');}catch(e){message(document.querySelector('#review-status'),e.message,true);}};
 const files=await checked(db.from('business_files').select('name,path,mime_type').eq('business_id',idForExtras));
 const fileSection=document.createElement('section');fileSection.className='mt-5';const heading=document.createElement('h2');heading.textContent='Photos and documents';fileSection.append(heading);
 for(const file of files){if(file.mime_type.startsWith('image/')){const data=await checked(db.storage.from('business-files').createSignedUrl(file.path,300));const img=document.createElement('img');img.src=data.signedUrl;img.alt=file.name;img.loading='lazy';img.className='img-fluid rounded my-2';img.style.maxHeight='320px';fileSection.append(img);}const button=document.createElement('button');button.className='btn btn-outline-dark m-2';button.textContent=`Download ${file.name}`;button.onclick=async()=>{try{await downloadFile(db,file.path);}catch(e){message(document.querySelector('#review-status'),e.message,true);}};fileSection.append(button);}if(files.length)target.append(fileSection);
 const offers=await checked(db.from('advertisements').select('title,body').eq('business_id',idForExtras).eq('status','approved').lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()));
 if(offers.length){const area=document.createElement('section');area.className='mt-5';area.innerHTML='<h2>Local offers</h2>'+offers.map(a=>`<article class="card my-3"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.body)}</p></article>`).join('');target.append(area);}
}catch(error){const notice=document.createElement('p');notice.textContent=error.message;target.append(notice);}}
