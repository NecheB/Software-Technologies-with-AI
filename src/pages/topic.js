import {shell,message} from '../components/shell.js';
import {requireClient} from '../services/client.js';
import {session,checked} from '../services/session.js';
import {escapeHtml} from '../utils/html.js';
shell('Conversation');const status=document.querySelector('#status');const id=new URLSearchParams(location.search).get('id');
async function load(){try{const db=requireClient();const topic=await checked(db.from('topics').select('*').eq('id',id).single());document.querySelector('#topic').innerHTML=`<h1>${escapeHtml(topic.title)}</h1><p class="detail-copy">${escapeHtml(topic.body)}</p>`;const posts=await checked(db.from('posts').select('body,status').eq('topic_id',id).order('created_at'));document.querySelector('#posts').innerHTML=posts.map(p=>`<article class="card mb-3"><p class="detail-copy">${escapeHtml(p.body)}</p><small>${escapeHtml(p.status)}</small></article>`).join('');}catch(error){message(status,error.message,true);}}
document.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const {db,user}=await session();await checked(db.from('posts').insert({topic_id:id,author_id:user.id,body:e.target.elements.body.value}));e.target.reset();message(status,'Reply submitted for review.');await load();}catch(error){message(status,error.message,true);}};load();
