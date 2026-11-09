'use strict';
/* BrasilCord Mobile — beta web. Todos os dados pessoais são carregados on-line;
   token em memória somente, nunca no cache da PWA nem no localStorage. */
(()=>{
  const API='https://brasilcord-sinalizacao-dkx157.onrender.com/api/platform';
  const $=id=>document.getElementById(id);
  const state={token:null,user:null,tab:'communities',communities:[],community:null,channel:null,peer:null,
    friends:[],requests:[],approvedContacts:[],verificationId:null,register:false,requestSeq:0,poll:null,installEvent:null};
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e;};
  function notice(text,error=false){
    const e=$('notice');e.textContent=text;e.dataset.error=String(error);e.hidden=!text;
  }
  async function api(path,{method='GET',body,anonymous=false}={}){
    if(!anonymous&&!state.token)throw Error('Entre na sua conta.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
    try{
      const response=await fetch(API+path,{method,cache:'no-store',mode:'cors',credentials:'omit',signal:controller.signal,
        headers:{Accept:'application/json',...(state.token&&!anonymous?{Authorization:'Bearer '+state.token}:{}),
          ...(body===undefined?{}:{'Content-Type':'application/json'})},
        ...(body===undefined?{}:{body:JSON.stringify(body)})});
      let result;try{result=await response.json();}catch{result={};}
      if(!response.ok)throw Error(result.error||'Serviço indisponível (HTTP '+response.status+').');
      return result;
    }catch(e){
      if(e.name==='AbortError')throw Error('A conexão demorou demais. Tente novamente.');
      if(e instanceof TypeError)throw Error('Não foi possível conectar ao BrasilCord. Verifique a internet e a publicação do servidor.');
      throw e;
    }finally{clearTimeout(timer);}
  }
  function labelOf(person){return person?.displayName||person?.display_name||person?.username||'Membro';}
  function initials(person){return labelOf(person).trim().slice(0,2).toUpperCase()||'BC';}
  function avatar(person){
    const el=node('span',initials(person),'avatar'),url=person?.avatarUrl;
    if(typeof url==='string'&&url.startsWith('https://brasilcord-sinalizacao-dkx157.onrender.com/')){
      const img=node('img');img.alt='';img.src=url;img.loading='lazy';img.referrerPolicy='no-referrer';el.replaceChildren(img);
    }
    return el;
  }
  const when=value=>{try{return new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return '';}};
  function setTitle(text,kicker='BRASILCORD MOBILE'){
    $('channel-title').textContent=text;$('channel-kicker').textContent=kicker;
    document.title=text+' • BrasilCord Mobile';
  }
  function setAuthenticated(yes){
    $('login-open').hidden=yes;$('logout').hidden=!yes;$('user-name').hidden=!yes;
    if(yes)$('user-name').textContent='@'+state.user.username;
    $('welcome-login').textContent=yes?'Abrir comunidades':'Entrar na minha conta';
  }
  function clearContent(){const box=$('content');box.replaceChildren();box.hidden=false;$('welcome').hidden=true;$('composer').hidden=true;notice('');return box;}
  function empty(text){return node('p',text,'empty');}
  function button(text,callback,cls=''){
    const e=node('button',text,cls);e.type='button';e.addEventListener('click',()=>void Promise.resolve().then(callback).catch(err=>notice(err.message,true)));return e;
  }
  function iconLabel(entry,sub='',image=null,marker='✦'){
    const row=node('div',null,'list-copy');
    row.append(node('strong',entry),node('small',sub));
    const symbol=node('span',marker,'item-icon');
    if(image&&typeof image==='string'&&image.startsWith('https://brasilcord-sinalizacao-dkx157.onrender.com/')){
      const img=node('img');img.src=image;img.alt='';symbol.replaceChildren(img);
    }
    return [symbol,row];
  }
  function sidebarEntry(title,subtitle,callback,{image=null,active=false,marker='✦'}={}){
    const el=button('',callback,active?'active':'');el.replaceChildren(...iconLabel(title,subtitle,image,marker));
    $('sidebar-list').append(el);return el;
  }
  function closeSidebar(){$('sidebar').classList.remove('open');}
  function openAuth(){
    if(state.token){void chooseTab('communities');return;}
    $('auth-dialog').showModal();$('auth-form').hidden=false;$('otp-form').hidden=true;
    $('auth-feedback').textContent='';$('auth-email').focus();
  }
  function switchAuth(){
    state.register=!state.register;
    $('username-wrap').hidden=!state.register;$('auth-username').required=state.register;
    $('auth-title').textContent=state.register?'Criar conta BrasilCord':'Entrar na sua conta';
    $('auth-submit').textContent=state.register?'Criar conta':'Entrar';
    $('auth-switch').textContent=state.register?'Já tenho conta':'Criar uma conta BrasilCord';
    $('auth-password').autocomplete=state.register?'new-password':'current-password';
    $('auth-feedback').textContent='';
  }
  async function session(data){
    if(!data.token||!data.user)throw Error('O servidor não retornou uma sessão válida.');
    state.token=data.token;state.user=data.user;state.verificationId=null;
    $('auth-dialog').close();$('auth-password').value='';$('otp-code').value='';
    setAuthenticated(true);
    document.dispatchEvent(new CustomEvent('bc:mobile-session',{detail:{token:state.token,user:state.user}}));
    await Promise.all([loadCommunities(),loadFriends(),loadRequests()]);
    void chooseTab('communities');
    clearInterval(state.poll);
    state.poll=setInterval(()=>{if(state.token&&!document.hidden)void refreshActive(false);},10000);
  }
  async function loadCommunities(){
    const data=await api('/communities');
    state.communities=data.communities||[];
    return state.communities;
  }
  async function loadFriends(){
    const data=await api('/friends');
    state.friends=data.friends||[];
    return state.friends;
  }
  async function loadRequests(){
    const data=await api('/dm-requests');
    state.requests=data.incoming||[];state.approvedContacts=(data.accepted||[]).map(x=>({id:x.peerId,username:x.username,displayName:x.displayName,avatarUrl:x.avatarUrl,viaRequest:true}));
    const n=state.requests.length;
    $('request-badge').textContent=n>99?'99+':String(n);$('request-badge').hidden=!n;
    return state.requests;
  }
  async function fetchUnread(){
    try{const data=await api('/dms/unread'),n=Number(data.total)||0;
      $('unread-badge').hidden=n===0;$('unread-badge').textContent=n>99?'99+':String(n);
    }catch{}
  }
  function sidebarForCommunities(){
    $('sidebar-title').textContent='Comunidades';$('sidebar-footer').hidden=false;
    const list=$('sidebar-list');list.replaceChildren();
    if(!state.communities.length)list.append(empty('Você ainda não entrou em uma comunidade.'));
    for(const c of state.communities)sidebarEntry(c.name,c.is_official?'Comunidade oficial':c.role==='owner'?'Sua comunidade':'Membro',()=>selectCommunity(c.id),{active:state.community?.id===c.id,marker:c.is_official?'🇧🇷':'#'});
  }
  async function selectCommunity(id){
    const seq=++state.requestSeq;
    const data=await api('/communities/'+encodeURIComponent(id));
    if(seq!==state.requestSeq)return;
    state.community={...data.community,id};state.channel=null;state.peer=null;
    document.dispatchEvent(new CustomEvent('bc:mobile-community',{detail:{community:state.community,channels:data.channels||[]}}));
    closeSidebar();
    $('sidebar-footer').hidden=true;$('sidebar-list').replaceChildren();
    const back=sidebarEntry('← Comunidades','Voltar à lista',()=>chooseTab('communities'),{marker:'←'});
    back.classList.add('back');
    $('sidebar-title').textContent=state.community.name;
    const channels=data.channels||[],texts=channels.filter(c=>c.kind==='text'),voices=channels.filter(c=>c.kind==='voice');
    $('sidebar-list').append(node('div','CANAIS DE TEXTO','group-title'));
    for(const channel of texts)sidebarEntry('# '+channel.name,'Canal de texto',()=>selectChannel(channel),{marker:'#'});
    if(voices.length){
      $('sidebar-list').append(node('div','CANAIS DE VOZ','group-title'));
      for(const c of voices)sidebarEntry('◉ '+c.name,'Entrar na chamada de voz',()=>{
        document.dispatchEvent(new CustomEvent('bc:mobile-voice-request',{detail:{channel:c,community:state.community}}));closeSidebar();
      },{marker:'◉'});
    }
    if(!texts.length){clearContent().append(empty('Esta comunidade não possui canais de texto disponíveis.'));setTitle(state.community.name);}
    else await selectChannel(texts[0]);
  }
  async function selectChannel(channel,quiet=false){
    const entry={
      'b76c0d04-2a6f-47a5-95d1-bc0fdc000015':'suggestion',
      'b76c0d04-2a6f-47a5-95d1-bc0fdc000016':'bug'
    }[channel?.id];
    if(entry){
      document.dispatchEvent(new CustomEvent('bc:mobile-feedback-open',{detail:{kind:entry}}));
      closeSidebar();return;
    }
    state.channel=channel;state.peer=null;state.tab='communities';
    document.dispatchEvent(new CustomEvent('bc:mobile-context',{detail:{channel,community:state.community,peer:null}}));
    setTitle('# '+channel.name,state.community?.name||'COMUNIDADE');
    if(!quiet){closeSidebar();notice('');}
    await showMessages();
  }
  function renderMessages(items,{privateChat=false}={}){
    const box=clearContent(),list=node('div',null,'message-list');
    if(!items.length){box.append(empty('Nenhuma mensagem ainda. Que tal começar a conversa?'));}
    else{
      for(const item of items){
        const author=privateChat?(item.sender_id===state.user.id?state.user:state.peer):item.author;
        const row=node('article',null,'message'+(author?.id===state.user.id?' message-self':''));
        if(!privateChat&&state.user?.username&&String(item.content||'').toLowerCase().includes('@'+state.user.username.toLowerCase()))
          row.classList.add('message-mentioned');
        row.dataset.messageId=item.id;row.dataset.messageKind=privateChat?'dm':'channel';
        row.append(avatar(author));
        const body=node('div',null,'message-body'),head=node('div',null,'message-head');
        head.append(node('strong',labelOf(author)),node('time',when(item.createdAt||item.created_at)));
        body.append(head);
        if(item.replyPreview)body.append(node('p','↩ '+item.replyPreview.author+': '+item.replyPreview.content,'message-reply'));
        body.append(node('p',item.content||''));
        if(item.reactions?.length){
          const reactions=node('div',null,'reaction-bar');
          for(const reaction of item.reactions){
            const b=button(reaction.emoji+' '+reaction.count,async()=>{
              try{await api('/messages/'+item.id+'/reactions',{method:'POST',body:{emoji:reaction.emoji}});await showMessages(false);}
              catch(e){notice(e.message,true);}
            },reaction.mine?'reaction mine':'reaction');
            reactions.append(b);
          }
          body.append(reactions);
        }
        if(privateChat&&(item.has_photo||item.audio_duration_seconds))body.append(node('p','📎 Mídia privada disponível no BrasilCord para PC nesta versão beta.','channels-note'));
        row.append(body);list.append(row);
        document.dispatchEvent(new CustomEvent('bc:mobile-message-rendered',{detail:{element:row,message:item,privateChat,author,peer:state.peer,channel:state.channel,community:state.community}}));
      }
      box.append(list);
      box.scrollTop=box.scrollHeight;
    }
    $('composer').hidden=false;
    $('message-input').placeholder=privateChat?'Mensagem para '+labelOf(state.peer):'Enviar em #'+state.channel.name;
  }
  async function showMessages(){
    if(!state.token)return;
    const seq=++state.requestSeq,channel=state.channel,peer=state.peer;
    if(!channel&&!peer)return;
    try{
      if(peer){
        const result=await api('/dms/'+encodeURIComponent(peer.id));
        if(seq!==state.requestSeq)return;
        renderMessages(result.messages||[],{privateChat:true});
      }else{
        const result=await api('/channels/'+encodeURIComponent(channel.id)+'/messages');
        if(seq!==state.requestSeq)return;
        renderMessages(result.messages||[]);
      }
    }catch(e){if(seq===state.requestSeq)notice(e.message,true);}
  }
  async function openDM(friend){
    state.peer=friend;state.channel=null;state.tab='dms';closeSidebar();
    document.dispatchEvent(new CustomEvent('bc:mobile-context',{detail:{peer:friend,community:null,channel:null}}));
    setTitle(labelOf(friend),'MENSAGEM PRIVADA');await showMessages();
  }
  function getAcceptedPeers(){
    const set=new Map();
    for(const friend of state.friends)if(friend.status==='accepted')set.set(friend.id,friend);
    for(const person of state.approvedContacts)if(!set.has(person.id))set.set(person.id,person);
    return [...set.values()];
  }
  function sideForDMs(){
    $('sidebar-title').textContent='Mensagens';$('sidebar-footer').hidden=true;
    $('sidebar-list').replaceChildren();
    const friends=getAcceptedPeers();
    if(!friends.length)$('sidebar-list').append(empty('Adicione um amigo para conversar.'));
    for(const friend of friends)sidebarEntry(labelOf(friend),'@'+friend.username,()=>openDM(friend),{image:friend.avatarUrl,active:state.peer?.id===friend.id,marker:'✉'});
  }
  async function friendsView(){
    setTitle('Amigos e solicitações','MINHA REDE');
    const box=clearContent(),add=node('form',null,'friend-add');
    const field=node('input');field.name='username';field.required=true;field.placeholder='Nome de usuário para adicionar';field.maxLength=28;field.autocomplete='off';
    const send=node('button','Adicionar','primary');send.type='submit';
    add.append(field,send);box.append(add);
    add.addEventListener('submit',async e=>{
      e.preventDefault();send.disabled=true;
      try{await api('/friends/request',{method:'POST',body:{username:field.value.trim()}});
        field.value='';await loadFriends();await friendsView();notice('Solicitação enviada ou amizade aceita.');
      }catch(e){notice(e.message,true);}finally{send.disabled=false;}
    });
    const groups=[['Meus amigos',state.friends.filter(x=>x.status==='accepted')],['Pedidos recebidos',state.friends.filter(x=>x.status==='pending'&&x.direction==='received')],['Pedidos enviados',state.friends.filter(x=>x.status==='pending'&&x.direction!=='received')]];
    for(const [name,items] of groups){
      box.append(node('h3',name+' ('+items.length+')','section-label'));
      if(!items.length){box.append(empty('Nada por aqui.'));continue;}
      for(const item of items){
        const row=node('div',null,'friend-card'),copy=node('div',null,'friend-copy');
        copy.append(node('strong',labelOf(item)),node('small','@'+item.username));
        const actions=node('div',null,'card-actions');
        if(item.status==='accepted')actions.append(button('Mensagem',()=>openDM(item)));
        actions.append(button('Perfil',()=>document.dispatchEvent(new CustomEvent('bc:mobile-user-profile',{detail:{id:item.id}}))));
        if(item.status==='pending'&&item.direction==='received')actions.append(button('Aceitar',async()=>{
          await api('/friends/'+item.id+'/accept',{method:'POST'});await loadFriends();await friendsView();
        }));
        actions.append(button(item.status==='accepted'?'Remover':item.direction==='received'?'Recusar':'Cancelar',async()=>{
          await api('/friends/'+item.id,{method:'DELETE'});await loadFriends();await friendsView();
        },'danger'));
        row.append(avatar(item),copy,actions);box.append(row);
      }
    }
  }
  async function requestsView(){
    setTitle('Solicitações de conversa','CAIXA DE ENTRADA');
    const box=clearContent();
    box.append(node('p','Pedidos de mensagens e ligações de pessoas que ainda não são suas amigas.','section-intro'));
    if(!state.requests.length)box.append(empty('Nenhuma solicitação pendente.'));
    for(const request of state.requests){
      const row=node('div',null,'request-card'),copy=node('div',null,'friend-copy');
      copy.append(node('strong',labelOf(request)),node('small','@'+request.username+' · '+(request.kind==='call'?'Solicitação de ligação':'Solicitação de mensagem')));
      copy.append(node('p',request.kind==='call'?'Quer iniciar uma conversa por ligação. Aceitar não liga automaticamente.':request.intro||'Solicitação de conversa'));
      const actions=node('div',null,'card-actions');
      actions.append(button('Aceitar conversa',async()=>{
        await api('/dm-requests/'+request.id+'/accept',{method:'POST'});
        await loadRequests();await loadFriends();await requestsView();notice('Conversa aceita.');
      }));
      actions.append(button('Fechar',async()=>{
        await api('/dm-requests/'+request.id+'/close',{method:'POST'});
        await loadRequests();await requestsView();
      },'danger'));
      row.append(avatar(request),copy,actions);box.append(row);
    }
  }
  async function chooseTab(tab){
    state.tab=tab;
    if(tab!=='communities'&&tab!=='dms'){
      state.channel=null;state.peer=null;
      document.dispatchEvent(new CustomEvent('bc:mobile-context',{detail:{channel:null,peer:null,community:null}}));
    }
    for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('current',b.dataset.tab===tab);
    if(!state.token){$('welcome').hidden=false;$('content').hidden=true;$('composer').hidden=true;return;}
    if(tab==='communities'){
      state.channel=null;state.peer=null;sidebarForCommunities();
      clearContent().append(empty('Selecione uma comunidade para ver seus canais.'));
      setTitle('Suas comunidades');if(state.communities.length)await selectCommunity(state.communities[0].id);
    }else if(tab==='dms'){
      state.channel=null;state.peer=null;sideForDMs();
      setTitle('Mensagens privadas');clearContent().append(empty('Escolha um amigo para abrir uma conversa.'));
    }else{
      $('sidebar-footer').hidden=true;$('sidebar-title').textContent=tab==='friends'?'Amigos':'Solicitações';
      $('sidebar-list').replaceChildren();
      if(tab==='friends'){await loadFriends();await friendsView();}
      else{await loadRequests();await requestsView();}
    }
    await fetchUnread();
  }
  async function refreshActive(){
    try{
      await fetchUnread();
      await loadRequests();
      if(state.channel||state.peer)await showMessages();
      else if(state.tab==='friends'){await loadFriends();await friendsView();}
      else if(state.tab==='requests')await requestsView();
    }catch(e){notice(e.message,true);}
  }
  async function health(){
    try{
      const result=await api('/health',{anonymous:true});
      $('service-state').textContent=result.ok?'Serviço conectado':'Serviço indisponível';
      $('service-state').dataset.state=result.ok?'online':'offline';
    }catch{$('service-state').textContent='Serviço indisponível';$('service-state').dataset.state='offline';}
  }
  function actionDialog(title,description,label,submit,handler){
    $('action-title').textContent=title;$('action-description').textContent=description;
    $('action-label').firstChild.textContent=label;
    $('action-input').value='';$('action-feedback').textContent='';$('action-submit').textContent=submit;
    $('action-dialog').showModal();$('action-input').focus();
    $('action-form').onsubmit=async event=>{
      event.preventDefault();const btn=$('action-submit');btn.disabled=true;
      try{await handler($('action-input').value.trim());$('action-dialog').close();}
      catch(err){$('action-feedback').textContent=err.message;}
      finally{btn.disabled=false;}
    };
  }
  function setupInstall(){
    // iOS/Safari não emite beforeinstallprompt: mantenha a ajuda visível.
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
    if(!standalone){
      $('welcome-install').hidden=false;
      if(window.matchMedia?.('(max-width: 690px)').matches)$('install').hidden=false;
    }
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();state.installEvent=event;
      $('install').hidden=false;$('welcome-install').hidden=false;
    });
    const prompt=async()=>{
      if(state.installEvent){
        const e=state.installEvent;state.installEvent=null;
        await e.prompt();$('install').hidden=true;$('welcome-install').hidden=true;
      }else notice('Para instalar: no Android use o menu do navegador → Instalar aplicativo. No iPhone, Safari → Compartilhar → Adicionar à Tela de Início.');
    };
    $('install').addEventListener('click',()=>void prompt());
    $('welcome-install').addEventListener('click',()=>void prompt());
    window.addEventListener('appinstalled',()=>{$('install').hidden=true;$('welcome-install').hidden=true;});
    if('serviceWorker' in navigator&&location.protocol==='https:')
      window.addEventListener('load',()=>void navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));
  }
  $('login-open').addEventListener('click',openAuth);
  $('welcome-login').addEventListener('click',()=>state.token?chooseTab('communities'):openAuth());
  $('auth-switch').addEventListener('click',switchAuth);
  $('auth-form').addEventListener('submit',async event=>{
    event.preventDefault();const b=$('auth-submit');b.disabled=true;
    $('auth-feedback').textContent='Verificando sua conta...';
    try{
      const payload={email:$('auth-email').value.trim(),password:$('auth-password').value};
      if(state.register)payload.username=$('auth-username').value.trim();
      const result=await api(state.register?'/register':'/login',{method:'POST',body:payload,anonymous:true});
      if(result.verificationRequired){
        state.verificationId=result.challengeId;
        $('auth-form').hidden=true;$('otp-form').hidden=false;
        $('otp-feedback').textContent='Código enviado para seu e-mail.';$('otp-code').focus();
      }else await session(result);
    }catch(e){$('auth-feedback').textContent=e.message;}
    finally{b.disabled=false;}
  });
  $('otp-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const code=$('otp-code').value.trim();
    if(!/^\d{6}$/.test(code)){$('otp-feedback').textContent='Digite os seis dígitos.';return;}
    try{const result=await api('/login/verify',{method:'POST',body:{challengeId:state.verificationId,code},anonymous:true});await session(result);}
    catch(e){$('otp-feedback').textContent=e.message;}
  });
  $('otp-back').addEventListener('click',()=>{$('otp-form').hidden=true;$('auth-form').hidden=false;state.verificationId=null;});
  document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>$(x.dataset.close).close()));
  $('logout').addEventListener('click',async()=>{
    const old=state.token;
    clearInterval(state.poll);
    state.token=null;state.user=null;state.community=null;state.channel=null;state.peer=null;
    document.dispatchEvent(new Event('bc:mobile-logout'));
    state.communities=[];state.friends=[];state.requests=[];state.approvedContacts=[];++state.requestSeq;
    setAuthenticated(false);
    $('sidebar-list').replaceChildren();$('content').hidden=true;$('composer').hidden=true;$('welcome').hidden=false;
    setTitle('Sua comunidade. Em qualquer lugar.');
    if(old)void fetch(API+'/logout',{method:'POST',headers:{Authorization:'Bearer '+old},cache:'no-store',credentials:'omit'}).catch(()=>{});
    notice('Você saiu da sua conta.');
  });
  $('composer').addEventListener('submit',async event=>{
    event.preventDefault();
    const input=$('message-input'),value=input.value.trim();
    if(!value)return;
    const b=$('composer').querySelector('button');b.disabled=true;
    try{
      if(state.peer)await api('/dms/'+encodeURIComponent(state.peer.id),{method:'POST',body:{content:value}});
      else if(state.channel)await api('/channels/'+encodeURIComponent(state.channel.id)+'/messages',{method:'POST',body:{content:value}});
      input.value='';await showMessages();input.focus();
    }catch(e){notice(e.message,true);}finally{b.disabled=false;}
  });
  $('community-create').addEventListener('click',()=>actionDialog('Criar comunidade','Crie um espaço para seus amigos.','Nome da comunidade','Criar',async name=>{
    const result=await api('/communities',{method:'POST',body:{name,description:''}});
    await loadCommunities();await chooseTab('communities');
    if(result.community?.id)await selectCommunity(result.community.id);
  }));
  $('community-join').addEventListener('click',()=>actionDialog('Entrar por convite','Cole o código ou o link de convite do BrasilCord.','Código de convite','Entrar',async code=>{
    const result=await api('/join',{method:'POST',body:{code}});
    await loadCommunities();await chooseTab('communities');if(result.community?.id)await selectCommunity(result.community.id);
  }));
  $('sidebar-toggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  $('sidebar-close').addEventListener('click',closeSidebar);
  for(const btn of document.querySelectorAll('[data-tab]'))btn.addEventListener('click',()=>{closeSidebar();void chooseTab(btn.dataset.tab);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){void health();if(state.token)void refreshActive();}});
  document.addEventListener('bc:mobile-open-search-result',event=>void (async()=>{
    const target=event.detail;
    try{
      if(!state.token||!target)return;
      if(target.kind==='channel'){
        await selectCommunity(target.communityId);
        const found=(await api('/communities/'+target.communityId)).channels?.find(c=>c.id===target.channelId);
        if(found)await selectChannel(found);
      }else if(target.kind==='dm'){
        const p=(await api('/users/'+target.peerId)).profile;
        await openDM(p);
      }
    }catch(err){notice(err.message,true);}
  })());
  document.addEventListener('bc:mobile-refresh',()=>{if(state.token)void refreshActive();});
  document.addEventListener('bc:mobile-messages-reopen',()=>{if(state.token&&state.channel||state.token&&state.peer)void showMessages();});
  setupInstall();setAuthenticated(false);void health();
})();
