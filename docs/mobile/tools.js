'use strict';
/* BrasilCord Mobile: recursos avançados compartilhados com o backend Windows. */
(()=>{
 const ROOT='https://brasilcord-sinalizacao-dkx157.onrender.com',API=ROOT+'/api/platform';
 let token=null,user=null,community=null,channel=null,peer=null,socket=null,recording=null,blobUrls=new Set(),replyTo=null;
 const $=id=>document.getElementById(id);
 const create=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined&&text!==null)x.textContent=String(text);if(cls)x.className=cls;return x;};
 async function request(path,method='GET',body,anonymous=false){
   if(!token&&!anonymous)throw Error('Entre na sua conta.');
   const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),16000);
   try{
     const res=await fetch(API+path,{method,signal:ctl.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json',...(token&&!anonymous?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
     let d;try{d=await res.json();}catch{d={};}if(!res.ok)throw Error(d.error||'Falha HTTP '+res.status);return d;
   }finally{clearTimeout(timeout);}
 }
 const toast=(message,bad=false)=>document.dispatchEvent(new CustomEvent('bc:mobile-notice',{detail:{message,bad}}));
 const btn=(label,callback,cls='')=>{const b=create('button',label,cls);b.type='button';b.addEventListener('click',()=>void Promise.resolve().then(callback).catch(e=>toast(e.message,true)));return b;};
 function destroyBlobs(){for(const u of blobUrls)URL.revokeObjectURL(u);blobUrls.clear();}
 function hide(){if(panel.open)panel.close();destroyBlobs();}
 const panel=document.createElement('dialog');panel.className='mobile-advanced';
 panel.innerHTML='<div class="advanced-shell"><header><div><small>BRASILCORD • CONTROLES</small><h2 id="advanced-title">Configurações</h2></div><button id="advanced-close" type="button">✕</button></header><p id="advanced-status" role="status"></p><div id="advanced-content"></div></div>';
 document.body.append(panel);
 panel.querySelector('#advanced-close').addEventListener('click',hide);
 panel.addEventListener('close',destroyBlobs);
 const content=()=>panel.querySelector('#advanced-content');
 const status=text=>panel.querySelector('#advanced-status').textContent=text||'';
 function open(title){
   panel.querySelector('#advanced-title').textContent=title;status('');content().replaceChildren();destroyBlobs();
   if(!panel.open)panel.showModal();return content();
 }
 const top=$('user-name')?.parentElement;
 if(!top)return;
 const tools=btn('⚙ Perfil',()=>openProfile(),'mobile-header-action');
 const server=btn('🛡 Comunidade',()=>openServer(),'mobile-header-action');
 const discover=btn('🌎 Explorar',()=>openDiscover(),'mobile-header-action');
 const inbox=btn('📨 Pedidos',()=>openInbox(),'mobile-header-action');
 const search=btn('⌕ Buscar',()=>openSearch(),'mobile-header-action');
 top.insertBefore(tools,$('user-name'));
 top.insertBefore(server,$('user-name'));
 top.insertBefore(discover,$('user-name'));
 top.insertBefore(inbox,$('user-name'));
 top.insertBefore(search,$('user-name'));
 function updateButtons(){for(const b of [tools,server,discover,inbox,search])b.hidden=!token;server.hidden=!token||!community;search.hidden=!token||(!channel&&!peer);}
 updateButtons();
 function field(label,value='',limit=120,kind='input'){
   const wrap=create('label',label,'advanced-field');
   const input=create(kind==='textarea'?'textarea':'input');input.value=value;input.maxLength=limit;
   wrap.append(input);return {wrap,input};
 }
 function section(title){const box=create('section',null,'advanced-section');box.append(create('h3',title));content().append(box);return box;}
 function formatMime(mime){return ['image/jpeg','image/png','image/webp','image/gif'].includes(mime);}
 async function file64(file,max=1_000_000){
   if(!file||!formatMime(file.type)||file.size>max||file.size<50)throw Error('Escolha JPG, PNG, GIF ou WebP até '+Math.floor(max/1000)+' KB.');
   return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=reject;reader.readAsDataURL(file);});
 }
 async function openProfile(){
   const box=open('Meu perfil');
   const [self,presence,badges]=await Promise.all([request('/me'),request('/me/presence'),request('/me/badges')]);
   user={...user,...self.user};
   const name=field('Nome de exibição',user.displayName||'',40);
   const bio=field('Biografia',user.bio||'',250,'textarea');
   const mode=field('Presença');const select=create('select');
   for(const [v,l] of [['online','🟢 Disponível'],['away','🌙 Ausente'],['dnd','⛔ Não perturbar'],['invisible','⚪ Invisível']]){
     const o=create('option',l);o.value=v;select.append(o);
   }select.value=presence.presence?.mode||'online';mode.input.replaceWith(select);
   const recado=field('Recado pessoal',presence.presence?.customStatus||'',120);
   box.append(name.wrap,bio.wrap,mode.wrap,recado.wrap);
   box.append(btn('Salvar perfil e status',async()=>{
     const updated=await request('/me','PATCH',{displayName:name.input.value.trim(),bio:bio.input.value.trim()});
     await request('/me/presence','PATCH',{mode:select.value,customStatus:recado.input.value.trim(),durationSeconds:0});
     user={...user,...updated.user};toast('Seu perfil foi atualizado.');hide();
   },'primary'));
   const media=section('Fotos do perfil');
   for(const [kind,title] of [['avatar','Foto de perfil'],['banner','Banner']]){
     const line=create('div',null,'advanced-inline');
     const input=create('input');input.type='file';input.accept='image/jpeg,image/png,image/gif,image/webp';input.setAttribute('aria-label',title);
     input.addEventListener('change',async()=>{
       try{
         const file=input.files?.[0];if(!file)return;
         const data=await file64(file,kind==='avatar'?1_500_000:2_500_000);
         await request('/me/media/'+kind,'PUT',{data});toast(title+' atualizado.');input.value='';
       }catch(e){status(e.message);}
     });
     line.append(create('span',title),input);media.append(line);
   }
   const bd=section('Insígnias equipadas');
   for(const badge of badges.badges||[]){
     const row=create('label',null,'advanced-check');
     const input=create('input');input.type='checkbox';input.checked=(badges.equipped||[]).includes(badge.id);input.disabled=!badge.unlocked;
     row.append(input,create('span',(badge.unlocked?'':'🔒 ')+badge.name));bd.append(row);
     input.addEventListener('change',async()=>{
       try{
         const equipped=[...bd.querySelectorAll('input:checked')].map((el,i)=>el.dataset.badgeId);
         const ids=[...bd.querySelectorAll('input:checked')].map(el=>el.value);
         await request('/me/badges','PATCH',{equippedIds:ids});toast('Insígnias atualizadas.');
       }catch(e){input.checked=!input.checked;status(e.message);}
     });
     input.value=badge.id;input.dataset.badgeId=badge.id;
   }
   const blocked=section('Contas bloqueadas');
   try{
     const data=await request('/blocks');
     if(!data.blocked?.length)blocked.append(create('p','Nenhuma pessoa bloqueada.'));
     for(const p of data.blocked||[])blocked.append(btn('Desbloquear @'+p.username,async()=>{await request('/blocks/'+p.id,'DELETE');toast('Usuário desbloqueado.');await openProfile();}));
   }catch(e){blocked.append(create('p',e.message));}
 }
 async function openDiscover(){
   const box=open('Explorar comunidades');
   const list=create('div');box.append(create('p','Descubra comunidades públicas e entre pelo BrasilCord.'),list);
   const d=await request('/discover?category=all&sort=members');
   if(!d.communities?.length)list.append(create('p','Nenhuma comunidade pública encontrada.'));
   for(const c of d.communities||[]){
     const row=create('article',null,'advanced-card');
     row.append(create('strong',c.name),create('p',c.description||'Sem descrição.'));
     row.append(create('small',String(c.member_count||0)+' membros'));
     if(!c.joined)row.append(btn('Entrar na comunidade',async()=>{
       await request('/discover/'+c.id+'/join','POST');toast('Comunidade adicionada. Atualize a lista de comunidades.');hide();
     },'primary'));
     list.append(row);
   }
 }
 async function openInbox(){
   const box=open('Pedidos de conversa');
   const d=await request('/dm-requests');
   if(!d.incoming?.length)box.append(create('p','Nenhum pedido pendente.'));
   for(const item of d.incoming||[]){
     const row=create('article',null,'advanced-card');
     row.append(create('strong',item.displayName||item.username),create('p',item.kind==='call'?'☎ Pedido de ligação':item.kind==='photo'?'🖼️ Foto enviada':item.intro||'Nova mensagem'));
     const controls=create('div',null,'advanced-inline');
     controls.append(btn('Aceitar',async()=>{await request('/dm-requests/'+item.id+'/accept','POST');toast('Conversa aceita.');await openInbox();},'primary'),
       btn('Recusar',async()=>{await request('/dm-requests/'+item.id+'/close','POST');await openInbox();},'danger'));
     row.append(controls);box.append(row);
   }
 }
 async function openSearch(){
   const box=open('Buscar nesta conversa');
   box.append(create('p','Pesquisa local nas mensagens carregadas. A busca global será disponibilizada quando houver indexação no servidor.'));
   const query=field('Texto a encontrar','',100);box.append(query.wrap);
   const matches=create('div');box.append(matches);
   const run=()=>{
     matches.replaceChildren();
     const q=query.input.value.toLocaleLowerCase('pt-BR').trim();
     if(q.length<2)return;
     const rows=[...document.querySelectorAll('#content .message')];
     for(const row of rows.filter(row=>row.textContent.toLocaleLowerCase('pt-BR').includes(q)).slice(0,30)){
       matches.append(btn(row.textContent.slice(0,110),()=>{
         hide();row.scrollIntoView({behavior:'smooth',block:'center'});
       }));
     }
     if(!matches.children.length)matches.append(create('p','Nenhum resultado entre as mensagens carregadas.'));
   };
   query.input.addEventListener('input',run);
 }
 async function showProfile(id){
   const box=open('Perfil de membro'),d=await request('/users/'+id),p=d.profile;
   const title=create('h3',p.displayName||p.username);box.append(title,create('p','@'+p.username),create('p',p.bio||'Sem biografia.'));
   const row=create('div',null,'advanced-inline');
   if(!p.isSelf){
     row.append(btn('✉ Mensagem',async()=>{
       const message=prompt('Escreva a primeira mensagem:');if(message==null||!message.trim())return;
       const result=await request('/dm-requests','POST',{recipientId:id,kind:'message',message:message.trim().slice(0,500)});
       if(result.alreadyAccepted)await request('/dms/'+id,'POST',{content:message.trim()});
       toast(result.alreadyAccepted?'Mensagem enviada.':'Mensagem enviada para a caixa de pedidos.');hide();
     }));
     row.append(btn('➕ Amigo',async()=>{await request('/friends/request','POST',{username:p.username});toast('Pedido enviado.');}));
     row.append(btn(p.blockedByMe?'Desbloquear':'Bloquear',async()=>{
       if(p.blockedByMe)await request('/blocks/'+id,'DELETE');
       else if(confirm('Bloquear @'+p.username+'?'))await request('/blocks','POST',{username:p.username});
       await showProfile(id);
     },'danger'));
     row.append(btn('⚑ Denunciar',async()=>{
       const reason=prompt('Motivo da denúncia:');if(!reason||reason.trim().length<5)return;
       await request('/reports','POST',{kind:'profile',targetUserId:id,reason:reason.trim().slice(0,500)});toast('Denúncia enviada.');
     }));
   }
   box.append(row);
   const badges=await request('/users/'+id+'/badges');
   if(badges.badges?.length){
     const sec=section('Insígnias');
     for(const badge of badges.badges)sec.append(create('span','✦ '+badge.name,'advanced-pill'));
   }
 }
 function rolesConfig(){
   const definitions=[
     ['view_channels','Ver canais'],['send_messages','Enviar mensagens'],['connect_voice','Entrar nas calls'],
     ['create_invites','Gerar convites'],['manage_channels','Gerenciar canais'],['manage_roles','Gerenciar cargos'],
     ['server_mute','Silenciar na call'],['server_deafen','Desativar áudio na call'],['disconnect_voice','Desconectar'],
     ['timeout_members','Castigar'],['kick_members','Expulsar'],['ban_members','Banir']
   ];return definitions;
 }
 async function openServer(){
   if(!community)return;
   const c=community,box=open('Configurar '+c.name);
   const perms=c.permissions||{},manager=c.role==='owner'||perms.manage_channels||perms.manage_roles;
   if(!manager)box.append(create('p','Você não tem permissões de administração nesta comunidade.'));
   const overview=section('Informações e convites');
   overview.append(create('p','Comunidade: '+c.name));
   overview.append(btn('Copiar convite',async()=>{
     const data=await request('/communities/'+c.id+'/invite');
     await navigator.clipboard.writeText('https://brasilcord-sinalizacao-dkx157.onrender.com/invite/'+data.code);
     toast('Link de convite copiado.');
   }));
   if(c.role==='owner'){
     overview.append(btn('Editar descrição e visibilidade',async()=>{
       const current=await request('/communities/'+c.id);
       const description=prompt('Descrição da comunidade:',current.community?.description||'');if(description===null)return;
       const visibility=confirm('Deseja tornar esta comunidade pública no sistema de descoberta?')?'public':'private';
       await request('/communities/'+c.id+'/settings','PATCH',{visibility,category:current.community?.category||'outros',description});
       toast('Comunidade atualizada.');
     }));
     overview.append(btn('Excluir comunidade definitivamente',async()=>{
       if(!confirm('Esta ação é irreversível. Continuar?'))return;
       const name=prompt('Digite o nome EXATO da comunidade "'+c.name+'" para excluir:');
       if(name!==c.name)return;
       await request('/communities/'+c.id,'DELETE',{confirmName:name});hide();toast('Comunidade excluída.');
     },'danger'));
   }
   if(manager){
     const channels=section('Canais e categorias');
     channels.append(btn('+ Categoria',async()=>{
       const name=prompt('Nome da categoria:');if(!name)return;
       await request('/communities/'+c.id+'/categories','POST',{name,minRoleId:null});toast('Categoria criada.');
     }));
     channels.append(btn('+ Canal de texto',async()=>createChannel('text')));
     channels.append(btn('+ Canal de voz',async()=>createChannel('voice')));
     async function createChannel(kind){
       const name=prompt('Nome do novo canal '+(kind==='voice'?'de voz':'de texto')+':');if(!name)return;
       await request('/communities/'+c.id+'/channels','POST',{name,kind});toast('Canal criado. Atualize a comunidade.');
     }
   }
   if(c.role==='owner'||perms.manage_roles){
     const sec=section('Cargos e permissões');
     const data=await request('/communities/'+c.id+'/roles');
     for(const role of data.roles||[]){
       const card=create('div',null,'advanced-card');const title=create('strong','◆ '+role.name);
       title.style.color=role.color;card.append(title);
       card.append(btn('Editar',async()=>{await roleForm(c.id,role);}));
       card.append(btn('Excluir',async()=>{if(!confirm('Excluir cargo '+role.name+'?'))return;await request('/communities/'+c.id+'/roles/'+role.id,'DELETE');await openServer();},'danger'));
       sec.append(card);
     }
     sec.append(btn('+ Criar cargo',async()=>roleForm(c.id,null),'primary'));
   }
   if(c.role==='owner'||Object.keys(perms).some(k=>k.endsWith('_members'))){
     const sec=section('Moderação');
     const members=await request('/communities/'+c.id+'/members');
     for(const m of members.members||[]){
       if(m.id===user?.id||m.role==='owner')continue;
       const row=create('div',null,'advanced-inline');row.append(create('span',m.display_name||m.username));
       row.append(btn('Moderar',async()=>moderate(c.id,m,perms)));
       sec.append(row);
     }
   }
 }
 async function roleForm(cid,role){
   const name=prompt('Nome do cargo:',role?.name||'');if(!name)return;
   const color=prompt('Cor hexadecimal (#RRGGBB):',role?.color||'#56dd9c');if(color===null)return;
   if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error('Cor inválida.');
   const permissions={};for(const [key,label] of rolesConfig()){
     permissions[key]=role?.permissions?.[key]??(key==='view_channels'||key==='send_messages'||key==='connect_voice');
   }
   const temp=open('Permissões de '+name);
   for(const [key,label] of rolesConfig()){
     const row=create('label',null,'advanced-check'),input=create('input');input.type='checkbox';input.checked=permissions[key];
     input.addEventListener('change',()=>permissions[key]=input.checked);row.append(input,create('span',label));temp.append(row);
   }
   temp.append(btn('Salvar cargo',async()=>{
     await request('/communities/'+cid+'/roles'+(role?'/'+role.id:''),role?'PATCH':'POST',{name,color,permissions});
     toast('Cargo salvo.');await openServer();
   },'primary'));
 }
 async function moderate(cid,m,permissions){
   const area=open('Moderar '+(m.display_name||m.username)),actions=[
     ['server-mute','server_mute','Silenciar no servidor'],['server-deafen','server_deafen','Desativar áudio'],
     ['disconnect','disconnect_voice','Desconectar da call'],['timeout','timeout_members','Castigar'],
     ['kick','kick_members','Expulsar'],['ban','ban_members','Banir']
   ];
   for(const [action,perm,label] of actions){
     if(community?.role!=='owner'&&!permissions?.[perm])continue;
     area.append(btn(label,async()=>{
       const reason=prompt('Motivo da moderação:', 'Moderação da comunidade');if(!reason)return;
       if(['kick','ban'].includes(action)&&!confirm(label+' '+(m.display_name||m.username)+'?'))return;
       const body={reason};
       if(action==='timeout')body.durationMinutes=Number(prompt('Duração em minutos (5, 10, 30, 60, 360, 1440, 10080):','60'));
       if(action==='server-mute'||action==='server-deafen')body.enabled=true;
       await request('/communities/'+cid+'/moderation/'+m.id+'/'+action,'POST',body);toast('Ação aplicada.');
     }));
   }
 }
 async function sendFile(kind){
   if(!token||!peer)return;
   if(kind==='photo'){
     const filePicker=create('input');filePicker.type='file';filePicker.accept='image/png,image/jpeg,image/webp,image/gif';
     filePicker.addEventListener('change',async()=>{
       try{
         const data=await file64(filePicker.files?.[0]);
         await request('/dms/'+peer.id+'/photos','POST',{image:data,mime:filePicker.files[0].type});
         toast('Foto enviada.');document.dispatchEvent(new Event('bc:mobile-refresh'));
       }catch(e){toast(e.message,true);}
     },{once:true});
     filePicker.click();return;
   }
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Gravação não suportada no navegador.');
   const mime=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'].find(x=>MediaRecorder.isTypeSupported(x));
   if(!mime)throw Error('Seu navegador não grava áudio WebM ou Ogg Opus.');
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const chunks=[],start=Date.now(),recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:48000});
   recording={recorder,stream};
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{
     stream.getTracks().forEach(t=>t.stop());recording=null;
     const blob=new Blob(chunks,{type:mime}),duration=Math.max(1,Math.min(45,Math.ceil((Date.now()-start)/1000)));
     if(blob.size<50||blob.size>300000){toast('Áudio inválido ou muito grande.',true);return;}
     try{
       const reader=new FileReader();reader.onload=async()=>{
         try{
           await request('/dms/'+peer.id+'/audio','POST',{audio:String(reader.result).split(',')[1],mime,durationSeconds:duration});
           toast('Mensagem de voz enviada.');document.dispatchEvent(new Event('bc:mobile-refresh'));
         }catch(e){toast(e.message,true);}
       };reader.readAsDataURL(blob);
     }catch(e){toast(e.message,true);}
   };
   recorder.start(250);
   toast('Gravando áudio (máximo 45 s). Toque no botão novamente para finalizar.');
   setTimeout(()=>{if(recording?.recorder===recorder&&recorder.state==='recording')recorder.stop();},45000);
 }
 const photoButton=btn('▧',()=>sendFile('photo'),'mobile-compose-media');
 const voiceButton=btn('🎙',async()=>{if(recording){recording.recorder.stop();return;}await sendFile('audio');},'mobile-compose-media');
 photoButton.title='Enviar foto';voiceButton.title='Gravar áudio';
 $('composer').insertBefore(photoButton,$('message-input'));
 $('composer').insertBefore(voiceButton,$('message-input'));
 function refreshComposer(){photoButton.hidden=voiceButton.hidden=!token||!peer;replyTo=null;}
 const replyBar=create('div',null,'mobile-reply-bar');replyBar.hidden=true;
 $('composer').parentElement.insertBefore(replyBar,$('composer'));
 function setReply(m){
   replyTo=m.id;replyBar.replaceChildren(create('span','↩ Respondendo: '+m.content.slice(0,75)),btn('✕',()=>{replyTo=null;replyBar.hidden=true;}));
   replyBar.hidden=false;$('message-input').focus();
 }
 // A ação de responder é aplicada no envio normal via interceptor de submit.
 $('composer').addEventListener('submit',async ev=>{
   if(!replyTo||!channel||peer)return;
   ev.preventDefault();ev.stopImmediatePropagation();
   const value=$('message-input').value.trim();if(!value)return;
   try{await request('/channels/'+channel.id+'/messages','POST',{content:value,replyToId:replyTo});
     $('message-input').value='';replyTo=null;replyBar.hidden=true;document.dispatchEvent(new Event('bc:mobile-refresh'));
   }catch(e){toast(e.message,true);}
 },true);
 document.addEventListener('bc:mobile-message-rendered',e=>{
   const {element,message,privateChat,author,channel:sourceChannel}=e.detail;
   const controls=create('div',null,'mobile-message-actions');
   if(!privateChat){
     controls.append(btn('↩ Responder',()=>setReply(message)));
     controls.append(btn('😊 Reagir',async()=>{
       const emoji=prompt('Reagir com emoji (👍 ❤️ 😂 🔥 🎉 😮 😢 👏 💚 🇧🇷):','👍');
       if(!emoji)return;
       await request('/messages/'+message.id+'/reactions','POST',{emoji});document.dispatchEvent(new Event('bc:mobile-refresh'));
     }));
     if(author?.id===user?.id)controls.append(btn('✎ Editar',async()=>{
       const text=prompt('Editar mensagem:',message.content);if(!text)return;
       await request('/messages/'+message.id,'PATCH',{content:text.trim()});document.dispatchEvent(new Event('bc:mobile-refresh'));
     }));
     if(author?.id===user?.id||community?.role==='owner'||community?.role==='admin'){
       controls.append(btn('🗑',async()=>{
         if(!confirm('Apagar esta mensagem?'))return;
         await request('/messages/'+message.id,'DELETE');document.dispatchEvent(new Event('bc:mobile-refresh'));
       }));
     }
     if(community?.role==='owner'||community?.role==='admin'||community?.permissions?.manage_channels){
       controls.append(btn(message.pinnedAt?'Desafixar':'📌 Fixar',async()=>{
         await request('/messages/'+message.id+'/pin',message.pinnedAt?'DELETE':'POST');
         document.dispatchEvent(new Event('bc:mobile-refresh'));
       }));
     }
     if(author?.id!==user?.id){
       controls.append(btn('⚑',async()=>{
         const reason=prompt('Motivo da denúncia:');if(!reason)return;
         await request('/messages/'+message.id+'/report','POST',{reason:reason.trim()});toast('Denúncia enviada.');
       }));
     }
   }else{
     if(message.has_photo||message.audio_duration_seconds){
       const button=btn('📎 Abrir mídia',async()=>{
         const kind=message.has_photo?'photo':'audio';
         const path='/dms/'+peer.id+'/'+(kind==='photo'?'photos/':'audio/')+message.id;
         const response=await fetch(API+path,{headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit'});
         if(!response.ok)throw Error('Mídia indisponível.');
         const blob=await response.blob(),url=URL.createObjectURL(blob);blobUrls.add(url);
         const media=document.createElement(kind==='photo'?'img':'audio');
         media.src=url;if(kind==='audio')media.controls=true;else media.alt='Foto recebida';
         media.className='mobile-message-media';element.querySelector('.message-body').append(media);button.remove();
       });controls.append(button);
     }
   }
   if(author?.id&&author.id!==user?.id)controls.append(btn('Perfil',()=>showProfile(author.id)));
   if(controls.childElementCount)element.querySelector('.message-body').append(controls);
 });
 function connectWS(){
   if(socket){socket.onclose=null;socket.close();socket=null;}
   if(!token)return;
   const instance=new WebSocket('wss://brasilcord-sinalizacao-dkx157.onrender.com/platform/ws');
   socket=instance;
   instance.onopen=()=>instance.send(JSON.stringify({type:'authenticate',token}));
   instance.onmessage=e=>{
     let data;try{data=JSON.parse(e.data);}catch{return;}
     if(data.type==='message'||data.type==='community-moderation'){
       document.dispatchEvent(new Event('bc:mobile-refresh'));
       if(data.type==='message'&&document.hidden&&Notification.permission==='granted'){
         const notification=new Notification('BrasilCord • Nova mensagem',{body:'Você recebeu uma mensagem na sua comunidade.',icon:'./icon-192.png'});
         setTimeout(()=>notification.close(),6000);
       }
       if(data.type==='community-moderation')toast('Moderação: '+data.reason,true);
     }
     if(data.type==='dm-call-invite'){
       if(confirm((data.displayName||'Contato')+' está ligando. Atender pelo BrasilCord Web?')){
         instance.send(JSON.stringify({type:'dm-call-accept',to:data.from}));
         toast('A chamada foi aceita. Abra a conversa para participar.');
       }else instance.send(JSON.stringify({type:'dm-call-reject',to:data.from}));
     }
   };
   instance.onclose=()=>{if(socket===instance&&token){socket=null;setTimeout(()=>{if(token&&document.visibilityState==='visible')connectWS();},5000);}};
 }
 document.addEventListener('bc:mobile-session',e=>{token=e.detail.token;user=e.detail.user;connectWS();updateButtons();refreshComposer();});
 document.addEventListener('bc:mobile-community',e=>{community=e.detail.community;server.hidden=false;});
 document.addEventListener('bc:mobile-context',e=>{peer=e.detail.peer;channel=e.detail.channel;community=e.detail.community||community;updateButtons();refreshComposer();});
 document.addEventListener('bc:mobile-logout',()=>{
   token=null;user=null;community=null;channel=null;peer=null;replyTo=null;replyBar.hidden=true;
   recording?.recorder?.stop();recording=null;if(socket){socket.onclose=null;socket.close();socket=null;}hide();updateButtons();refreshComposer();
 });
 document.addEventListener('bc:mobile-notice',e=>{const el=$('notice');el.hidden=false;el.textContent=e.detail.message;el.dataset.error=String(e.detail.bad||false);});
 document.addEventListener('bc:mobile-refresh',()=>{const tab=document.querySelector('.bottomnav button.current');if(tab)tab.click();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token&&!socket)connectWS();});
 if('Notification' in window){
   const enable=btn('🔔 Notificações',async()=>{
     if(Notification.permission==='default'){
       const value=await Notification.requestPermission();toast(value==='granted'?'Avisos autorizados.':'Permissão não concedida.');
     }else toast(Notification.permission==='granted'?'Notificações já autorizadas.':'Notificações bloqueadas no navegador.');
   },'mobile-header-action');top.insertBefore(enable,$('user-name'));
 }
 window.addEventListener('pagehide',()=>{destroyBlobs();if(socket)socket.close();},{once:true});
})();
