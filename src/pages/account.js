import {shell,message} from '../components/shell.js';
import {requireClient} from '../services/client.js';
shell('My account');
const status=document.querySelector('#status');
const button=document.querySelector('#logout');
try { const db=requireClient();const {data,error}=await db.auth.getUser();if(error) throw error;if(!data.user){location.replace('/signin.html');}else{message(status,`Signed in as ${data.user.email}`);button.hidden=false;button.onclick=async()=>{const {error}=await db.auth.signOut();if(error) message(status,error.message,true);else location.assign('/');};} }catch(error){message(status,error.message,true);}
