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
