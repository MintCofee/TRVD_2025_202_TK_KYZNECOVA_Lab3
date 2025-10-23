/* Shared JS for pages: handles users and songs CRUD via localStorage */
(function(){
'use strict';
const USERS_KEY='trvd_users_v1';
const SONGS_KEY='trvd_songs_v1';


function read(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return []}}
function write(key,val){localStorage.setItem(key,JSON.stringify(val))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function esc(s){if(!s) return ''; return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}


/* USERS */
function renderUsersList(containerId){const container=document.getElementById(containerId); if(!container) return; container.innerHTML=''; const users=read(USERS_KEY);
if(users.length===0){container.innerHTML='<p class="muted">Немає збережених акаунтів.</p>'; return}
users.forEach(u=>{const row=document.createElement('div'); row.className='song-card'; row.innerHTML=`<div><h3>${esc(u.name)} ${esc(u.surname)}</h3><div class="song-meta">${esc(u.email)}</div></div>
<div class="song-actions"><button class="action-btn edit-user" data-id="${u.id}">Редагувати</button><button class="action-btn danger del-user" data-id="${u.id}">Видалити</button></div>`; container.appendChild(row)})}


function populateOwnerSelect(selectId, includeEmpty=true){const sel=document.getElementById(selectId); if(!sel) return; sel.innerHTML=''; if(includeEmpty){const opt=document.createElement('option'); opt.value=''; opt.textContent='-- без власника --'; sel.appendChild(opt)}; const users=read(USERS_KEY); users.forEach(u=>{const o=document.createElement('option'); o.value=u.id; o.textContent=`${u.name} ${u.surname}`; sel.appendChild(o)})}


/* SONGS */
function renderSongsList(containerId){const container=document.getElementById(containerId); if(!container) return; container.innerHTML=''; const songs=read(SONGS_KEY);
if(songs.length===0){container.innerHTML='<p class="muted">Пісень ще немає.</p>'; return}
songs.slice().reverse().forEach(s=>{const card=document.createElement('div'); card.className='song-card'; const ownerName=getUserNameById(s.owner); card.innerHTML=`<div><h3>${esc(s.title)}</h3><div class="song-meta">${esc(s.artist)} · ${esc(s.tuning||'тюнінг: стандарт') } ${s.capo?('· капо: '+esc(s.capo)):''} ${s.difficulty?('· '+esc(s.difficulty)):''} ${ownerName?('· власник: '+esc(ownerName)):''}</div></div>
<div class="song-actions"><button class="action-btn edit-song" data-id="${s.id}">Редагувати</button><button class="action-btn danger del-song" data-id="${s.id}">Видалити</button></div>
<pre>${esc(s.tab)}</pre>`; container.appendChild(card)})}


function getUserNameById(id){if(!id) return ''; const users=read(USERS_KEY); const u=users.find(x=>x.id===id); return u? (u.name+' '+u.surname):''}


function renderRecentSongs(containerId, limit=5){const container=document.getElementById(containerId); if(!container) return; container.innerHTML=''; const songs=read(SONGS_KEY); if(songs.length===0){container.innerHTML='<p class="muted">Поки немає пісень.</p>'; return} songs.slice(-limit).reverse().forEach(s=>{const el=document.createElement('div'); el.className='song-card'; el.innerHTML=`<div><h3>${esc(s.title)}</h3><div class="song-meta">${esc(s.artist)}</div></div><div><a href="create.html" class="action-btn" data-id="${s.id}" onclick="localStorage.setItem('trvd_edit_song', '${s.id}')">Відкрити</a></div>`; container.appendChild(el)}) }


/* Form handlers */
function initUserForm(){const form=document.getElementById('user-form'); if(!form) return; const idField=document.getElementById('user-id');
form.addEventListener('submit', e=>{e.preventDefault(); const users=read(USERS_KEY); const id=idField.value || uid(); const payload={id,name:document.getElementById('user-name').value.trim(),surname:document.getElementById('user-surname').value.trim(),email:document.getElementById('user-email').value.trim()}; const idx=users.findIndex(u=>u.id===id); if(idx>=0) users[idx]=payload; else users.push(payload); write(USERS_KEY,users); idField.value=''; form.reset(); populateOwnerSelect('song-owner'); renderUsersList('users-list'); alert('Акаунт збережено'); })
// reset
const resetBtn=document.getElementById('user-reset'); if(resetBtn) resetBtn.addEventListener('click', ()=>{form.reset(); idField.value=''});
// edit & delete delegation
const usersList=document.getElementById('users-list'); if(usersList){usersList.addEventListener('click', e=>{if(e.target.classList.contains('edit-user')){const id=e.target.dataset.id; const users=read(USERS_KEY); const u=users.find(x=>x.id===id); if(u){document.getElementById('user-id').value=u.id; document.getElementById('user-name').value=u.name; document.getElementById('user-surname').value=u.surname; document.getElementById('user-email').value=u.email}} if(e.target.classList.contains('del-user')){if(!confirm('Видалити акаунт? Це також очистить поле власника у піснях.')) return; const id=e.target.dataset.id; let users=read(USERS_KEY); users=users.filter(x=>x.id!==id); write(USERS_KEY,users); // remove owner references
let songs=read(SONGS_KEY); songs=songs.map(s=>{if(s.owner===id) s.owner=''; return s}); write(SONGS_KEY,songs); populateOwnerSelect('song-owner'); renderUsersList('users-list'); renderSongsList('songs-list');}})} }


function initSongForm(){const form=document.getElementById('song-form'); if(!form) return; const idField=document.getElementById('song-id'); populateOwnerSelect('song-owner'); // prefill if editing from collections
const editId=localStorage.getItem('trvd_edit_song'); if(editId){const songs=read(SONGS_KEY); const s=songs.find(x=>x.id===editId); if(s){idField.value=s.id; document.getElementById('song-title').value=s.title; document.getElementById('song-artist').value=s.artist; document.getElementById('song-tuning').value=s.tuning; document.getElementById('song-capo').value=s.capo; document.getElementById('song-difficulty').value=s.difficulty; document.getElementById('song-tab').value=s.tab; document.getElementById('song-owner').value=s.owner;} localStorage.removeItem('trvd_edit_song')}
form.addEventListener('submit', e=>{e.preventDefault(); const songs=read(SONGS_KEY); const id=idField.value || uid(); const payload={id,title:document.getElementById('song-title').value.trim(),artist:document.getElementById('song-artist').value.trim(),tuning:document.getElementById('song-tuning').value.trim(),capo:document.getElementById('song-capo').value.trim(),difficulty:document.getElementById('song-difficulty').value,tab:document.getElementById('song-tab').value,owner:document.getElementById('song-owner').value}; const idx=songs.findIndex(x=>x.id===id); if(idx>=0) songs[idx]=payload; else songs.push(payload); write(SONGS_KEY,songs); alert('Пісню збережено'); idField.value=''; form.reset(); // if on collections page, refresh list
if(document.getElementById('songs-list')) renderSongsList('songs-list'); })
const resetBtn=document.getElementById('song-reset'); if(resetBtn) resetBtn.addEventListener('click', ()=>{form.reset(); idField.value=''});
}


function initSongsListActions(){const container=document.getElementById('songs-list'); if(!container) return; container.addEventListener('click', e=>{if(e.target.classList.contains('edit-song')){const id=e.target.dataset.id; // open create.html with edit flag
localStorage.setItem('trvd_edit_song', id); window.location.href='create.html';}
if(e.target.classList.contains('del-song')){if(!confirm('Видалити пісню?')) return; const id=e.target.dataset.id; let songs=read(SONGS_KEY); songs=songs.filter(s=>s.id!==id); write(SONGS_KEY,songs); renderSongsList('songs-list'); alert('Пісню видалено');}})}


/* Public init function to be called on DOM ready */
function initAll(){try{initUserForm(); initSongForm(); renderUsersList('users-list'); renderSongsList('songs-list'); initSongsListActions(); }catch(e){console.error(e)}}


// expose small API
window.app = {initAll, renderRecentSongs, renderSongsList, renderUsersList, populateOwnerSelect};


// Auto init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', ()=>{app.initAll();});
})();