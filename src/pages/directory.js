import { shell, message } from '../components/shell.js';
import { requireClient } from '../services/client.js';
import { escapeHtml } from '../utils/html.js';
shell('Explore places');
const form = document.querySelector('#search');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
let page = 0;
let request = 0;
async function search() {
 const current = ++request;
 message(status, 'Finding local places?');
 results.replaceChildren();
 try {
  const db = requireClient();
  const data = new FormData(form);
  let query = db.from('directory_entries').select('*', { count: 'exact' }).eq('status','approved');
  const term = data.get('q').trim();
  if (term) query = query.textSearch('search_vector',term,{type:'websearch',config:'english'});
  if (data.get('category')) { const children=await db.from('categories').select('id').eq('parent_id',data.get('category'));if(children.error)throw children.error;query=query.in('category_id',[data.get('category'),...children.data.map(c=>c.id)]); }
  if (data.get('city').trim()) query = query.ilike('city',data.get('city').trim());
  if (data.get('price')) query = query.eq('price_level',Number(data.get('price')));
  if(data.get('rating')) query=query.gte('average_rating',Number(data.get('rating')));
  query = query.order(({name:'name',rating:'average_rating',newest:'created_at'})[data.get('sort')] || 'created_at', {ascending:data.get('sort') === 'name'}).order('id').range(page*12,page*12+11);
  const {data:rows,error,count} = await query;
  if (current !== request) return;
  if(error) throw error;
  results.innerHTML = rows.map(row => `<div class="col-md-6 col-lg-4"><article class="card"><p class="tag">${escapeHtml(row.category_name || 'Local business')} ? ${'?'.repeat(row.price_level)}</p><h2><a href="/business.html?id=${encodeURIComponent(row.id)}">${escapeHtml(row.name)}</a></h2><p>${escapeHtml(row.tagline)}</p><p class="mb-0 mt-auto">${escapeHtml(row.city)} ? ${Number(row.average_rating).toFixed(1)} ? (${row.review_count})</p></article></div>`).join('');
  message(status,count ? `${count} places ? Page ${page+1}` : 'No places found. Try a different search.');
  document.querySelector('#previous').disabled = page === 0;
  document.querySelector('#next').disabled = (page+1)*12 >= count;
 } catch(error) { if(current === request) message(status,error.message,true); }
}
form.elements.q.value = new URLSearchParams(location.search).get('q') || '';
form.addEventListener('submit',event => {event.preventDefault();page=0;search();});
document.querySelector('#previous').onclick=()=>{page=Math.max(0,page-1);search();};
document.querySelector('#next').onclick=()=>{page++;search();};
try { const {data,error}=await requireClient().from('categories').select('id,name').order('name'); if(error) throw error; for(const item of data) form.elements.category.add(new Option(item.name,item.id)); } catch(error) { message(status,error.message,true); }
search();
