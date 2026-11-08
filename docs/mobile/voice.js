'use strict';
/* BrasilCord Mobile — voz e vídeo WebRTC com a mesma sinalização autenticada do desktop. */
(()=>{
  const API='https://brasilcord-sinalizacao-dkx157.onrender.com',WS='wss://brasilcord-sinalizacao-dkx157.onrender.com/platform/voice';
  let token=null,user=null,room=null,ws=null,local=null,camera=null,screen=null,muted=false,deaf=false,serverMuted=false,serverDeaf=false;
  let generation=0,keepAlive=null,iceServers=[{urls:'stun:stun.l.google.com:19302'}];
  const peers=new Map(),participants=new Map(),candidateQueues=new Map(),volumes=new Map(),localMute=new Set(),peerTasks=new Map();
  let meterContext=null,meterTimer=null;
  const meters=new Map();
  function meterFor(id,stream){
    if(!stream?.getAudioTracks().length||!window.AudioContext)return;
    try{
      meterContext||=new AudioContext();
      const src=meterContext.createMediaStreamSource(stream),analyser=meterContext.createAnalyser();
      analyser.fftSize=512;src.connect(analyser);
      const old=meters.get(id);old?.source.disconnect();
      meters.set(id,{source:src,analyser,data:new Uint8Array(512)});
      if(!meterTimer)meterTimer=setInterval(updateMeters,160);
    }catch{}
  }
  function updateMeters(){
    for(const [id,m] of meters){
      m.analyser.getByteTimeDomainData(m.data);
      let sum=0;for(const sample of m.data){const value=(sample-128)/128;sum+=value*value;}
      const speaking=Math.sqrt(sum/m.data.length)>.027&&(id==='self'?!muted&&!serverMuted:!participants.get(id)?.muted);
      const card=$('mobile-call-people').querySelector('[data-user-id="'+id+'"]');
      card?.classList.toggle('speaking',speaking);
    }
  }
  function removeMeter(id){const old=meters.get(id);if(old){old.source.disconnect();meters.delete(id);}}
  function clearMeters(){
    for(const id of [...meters.keys()])removeMeter(id);
    clearInterval(meterTimer);meterTimer=null;
    if(meterContext){void meterContext.close().catch(()=>{});meterContext=null;}
  }

  const overlay=document.createElement('dialog');overlay.className='mobile-call';
  overlay.innerHTML='<div class="mobile-call-inner"><header><div><small>BRASILCORD • CHAMADA</small><h2 id="mobile-call-title">Canal de voz</h2></div><button id="mobile-call-close" type="button" aria-label="Desconectar">✕</button></header><p id="mobile-call-status" role="status">Preparando chamada…</p><div id="mobile-call-people" class="mobile-call-people"></div><div id="mobile-call-videos" class="mobile-call-videos"></div><div id="mobile-call-audio" hidden></div><div class="mobile-call-controls"><button id="mobile-call-mute" type="button">🎙 Microfone</button><button id="mobile-call-deafen" type="button">🔊 Ouvir</button><button id="mobile-call-camera" type="button">📷 Câmera</button><button id="mobile-call-screen" type="button">▣ Tela</button><button id="mobile-call-hangup" class="danger" type="button">☎ Desligar</button></div></div>';
  document.body.append(overlay);
  const $=id=>overlay.querySelector('#'+id);
  const label=(p)=>p?.name||p?.displayName||p?.username||'Participante';
  function status(t){$('mobile-call-status').textContent=t;}
  function send(data){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));}
  function queue(id,fn){
    const prior=peerTasks.get(id)||Promise.resolve();
    const next=prior.catch(()=>{}).then(fn);
    peerTasks.set(id,next);next.catch(e=>status('Erro de negociação: '+e.message));
  }
  function mediaState(){send({type:'media-state',camera:!!camera,screen:!!screen});}
  function trackStop(stream){stream?.getTracks().forEach(t=>t.stop());}
  function stopVideo(type){
    const s=type==='camera'?camera:screen;
    if(!s)return;
    if(type==='camera')camera=null;else screen=null;
    trackStop(s);
    for(const record of peers.values())void record.senders[type]?.replaceTrack(null).catch(()=>{});
    const tile=$('mobile-call-videos').querySelector('[data-kind="'+type+'"][data-peer="self"]');
    tile?.remove();mediaState();render();
  }
  function clearPeer(id){
    const p=peers.get(id);if(p){p.pc.close();peers.delete(id);}
    candidateQueues.delete(id);peerTasks.delete(id);removeMeter(id);
    for(const element of overlay.querySelectorAll('[data-peer="'+id+'"]')){
      if(element.tagName==='AUDIO'||element.tagName==='VIDEO')element.srcObject=null;
      element.remove();
    }
  }
  function leave(text){
    generation++;clearInterval(keepAlive);keepAlive=null;
    if(ws){const old=ws;ws=null;old.onclose=null;old.onerror=null;if(old.readyState===WebSocket.OPEN)old.send(JSON.stringify({type:'leave'}));old.close();}
    for(const id of [...peers.keys()])clearPeer(id);
    peers.clear();participants.clear();candidateQueues.clear();peerTasks.clear();clearMeters();
    stopVideo('camera');stopVideo('screen');trackStop(local);local=null;
    room=null;muted=false;deaf=false;serverMuted=false;serverDeaf=false;
    $('mobile-call-audio').replaceChildren();$('mobile-call-videos').replaceChildren();
    if(overlay.open)overlay.close();
    if(text)document.dispatchEvent(new CustomEvent('bc:mobile-notice',{detail:{message:text}}));
  }
  function tile(id,kind,name,stream,isSelf=false){
    let video=$('mobile-call-videos').querySelector('video[data-peer="'+id+'"][data-kind="'+kind+'"]');
    if(!video){
      const wrap=document.createElement('div');wrap.className='mobile-video-tile';
      video=document.createElement('video');video.autoplay=true;video.playsInline=true;video.muted=isSelf;
      video.dataset.peer=id;video.dataset.kind=kind;
      const text=document.createElement('span');text.textContent=(kind==='screen'?'🖥 ':'📷 ')+name;
      wrap.append(video,text);$('mobile-call-videos').append(wrap);
    }
    video.srcObject=stream;void video.play().catch(()=>{});
  }
  function render(){
    $('mobile-call-mute').textContent=serverMuted?'🔇 Moderação':muted?'🔇 Silenciado':'🎙 Microfone';
    $('mobile-call-deafen').textContent=serverDeaf?'🔕 Moderação':deaf?'🔕 Sem áudio':'🔊 Ouvir';
    $('mobile-call-camera').textContent=camera?'📷 Desligar câmera':'📷 Câmera';
    $('mobile-call-screen').textContent=screen?'▣ Parar transmissão':'▣ Tela';
    const area=$('mobile-call-people');area.replaceChildren();
    const everyone=[{...user,id:user?.id,name:label(user)+' (você)',self:true,muted:muted||serverMuted},...participants.values()];
    for(const p of everyone){
      const card=document.createElement('article');card.className='mobile-call-person';card.dataset.userId=p.self?'self':p.id;
      const ava=document.createElement('span');ava.className='mobile-call-avatar';ava.textContent=label(p).slice(0,2).toUpperCase();
      const url=p.avatarUrl;if(typeof url==='string'&&url.startsWith(API+'/')){
        const img=document.createElement('img');img.src=url;img.alt='';ava.replaceChildren(img);
      }
      const name=document.createElement('strong');name.textContent=(p.muted?'🔇 ':'')+label(p);
      card.append(ava,name);
      if(!p.self){
        const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';
        slider.value=String(volumes.get(p.id)??100);slider.setAttribute('aria-label','Volume de '+label(p));
        slider.addEventListener('input',()=>{volumes.set(p.id,Number(slider.value));applyVolume(p.id);});
        const btn=document.createElement('button');btn.type='button';btn.textContent=localMute.has(p.id)?'Voltar a ouvir':'Silenciar';
        btn.addEventListener('click',()=>{localMute.has(p.id)?localMute.delete(p.id):localMute.add(p.id);applyVolume(p.id);render();});
        card.append(slider,btn);
      }
      area.append(card);
    }
  }
  function applyVolume(id){
    const audio=$('mobile-call-audio').querySelector('audio[data-peer="'+id+'"]');
    if(!audio)return;
    audio.volume=(volumes.get(id)??100)/100;
    audio.muted=deaf||serverDeaf||localMute.has(id);
  }
  async function ensurePeer(id){
    const existing=peers.get(id);if(existing)return existing;
    if(!local)throw Error('Microfone não disponível.');
    const pc=new RTCPeerConnection({iceServers}),stream=local;
    for(const track of stream.getAudioTracks())pc.addTrack(track,stream);
    const cam=pc.addTransceiver('video',{direction:'sendrecv'});
    const scr=pc.addTransceiver('video',{direction:'sendrecv'});
    const record={pc,senders:{camera:cam.sender,screen:scr.sender}};
    peers.set(id,record);
    if(camera)await cam.sender.replaceTrack(camera.getVideoTracks()[0]);
    if(screen)await scr.sender.replaceTrack(screen.getVideoTracks()[0]);
    pc.onicecandidate=event=>{if(event.candidate)send({type:'signal',to:id,payload:{type:'candidate',candidate:event.candidate.toJSON()}});};
    pc.ontrack=event=>{
      const stream=event.streams[0]||new MediaStream([event.track]);
      if(event.track.kind==='audio'){
        let a=$('mobile-call-audio').querySelector('audio[data-peer="'+id+'"]');
        if(!a){a=document.createElement('audio');a.dataset.peer=id;a.autoplay=true;a.playsInline=true;$('mobile-call-audio').append(a);}
        a.srcObject=stream;meterFor(id,stream);applyVolume(id);void a.play().catch(()=>status('Toque na tela para permitir reprodução de áudio.'));
      }else{
        const index=pc.getTransceivers().indexOf(event.transceiver);
        const kind=index===1?'camera':index===2?'screen':null;
        if(kind)tile(id,kind,label(participants.get(id)),stream);
      }
    };
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')status('Conexão WebRTC falhou. Sua rede pode precisar de TURN.');};
    return record;
  }
  async function flushCandidates(id,pc){
    for(const candidate of candidateQueues.get(id)||[])await pc.addIceCandidate(candidate);
    candidateQueues.delete(id);
  }
  async function offer(id){
    const {pc}=await ensurePeer(id);
    await pc.setLocalDescription(await pc.createOffer());
    send({type:'signal',to:id,payload:{type:'offer',sdp:pc.localDescription.sdp}});
  }
  async function signal(id,payload){
    if(!room||!payload||!['offer','answer','candidate'].includes(payload.type))return;
    const {pc}=await ensurePeer(id);
    if(payload.type==='candidate'){
      if(!pc.remoteDescription){const queue=candidateQueues.get(id)||[];if(queue.length<60)queue.push(payload.candidate);candidateQueues.set(id,queue);}
      else await pc.addIceCandidate(payload.candidate);
      return;
    }
    if(payload.type==='offer'){
      await pc.setRemoteDescription({type:'offer',sdp:payload.sdp});
      await flushCandidates(id,pc);
      await pc.setLocalDescription(await pc.createAnswer());
      send({type:'signal',to:id,payload:{type:'answer',sdp:pc.localDescription.sdp}});
    }else{
      await pc.setRemoteDescription({type:'answer',sdp:payload.sdp});
      await flushCandidates(id,pc);
    }
  }
  async function join(channel){
    if(!token)return;
    leave();
    room=channel;const seq=++generation;
    $('mobile-call-title').textContent='◉ '+channel.name;
    if(!overlay.open)overlay.showModal();status('Pedindo permissão para acessar o microfone…');render();
    try{
      if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw Error('Este navegador não suporta chamadas WebRTC.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      if(seq!==generation){trackStop(stream);return;}
      local=stream;meterFor('self',stream);
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(seq===generation)leave('Microfone desconectado.');},{once:true}));
      try{
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
        const response=await fetch(API+'/api/ice-config',{signal:controller.signal,cache:'no-store',credentials:'omit'});clearTimeout(timer);
        if(response.ok){const data=await response.json();if(Array.isArray(data.iceServers))iceServers=data.iceServers;}
      }catch{}
      const socket=new WebSocket(WS);ws=socket;
      socket.onopen=()=>{
        if(seq!==generation)return;
        socket.send(JSON.stringify({type:'auth',token}));
        keepAlive=setInterval(()=>send({type:'ping'}),20000);
      };
      socket.onmessage=event=>{
        if(seq!==generation)return;
        let data;try{data=JSON.parse(event.data);}catch{return;}
        if(data.type==='authenticated'){send({type:'join',channelId:channel.id,muted,deafened:deaf});}
        if(data.type==='error'){leave(data.message||'Não foi possível entrar na call.');return;}
        if(data.type==='joined'){
          serverMuted=data.serverMuted===true;serverDeaf=data.serverDeafened===true;
          local?.getAudioTracks().forEach(t=>t.enabled=!(muted||serverMuted));
          participants.clear();for(const p of data.peers||[])participants.set(p.id,p);
          status('Conectado. Sua voz é compartilhada apenas com os participantes.');render();
          for(const p of data.peers||[])queue(p.id,()=>offer(p.id));
        }
        if(data.type==='peer-joined'&&data.peer){participants.set(data.peer.id,data.peer);render();}
        if(data.type==='peer-left'){participants.delete(data.id);clearPeer(data.id);render();}
        if(data.type==='peer-mute'||data.type==='peer-deafen'||data.type==='peer-media'){
          const peer=participants.get(data.id);if(peer){if(data.type==='peer-mute')peer.muted=!!data.muted;else if(data.type==='peer-deafen')peer.deafened=!!data.deafened;else peer.media=data.media;render();}
        }
        if(data.type==='moderation-restrictions'){
          serverMuted=data.serverMuted===true;serverDeaf=data.serverDeafened===true;
          local?.getAudioTracks().forEach(t=>t.enabled=!(muted||serverMuted));
          for(const id of participants.keys())applyVolume(id);
          render();
        }
        if(data.type==='moderation-disconnect'){leave(data.message||'Desconectado pela moderação.');}
        if(data.type==='signal')queue(data.from,()=>signal(data.from,data.payload));
      };
      socket.onclose=()=>{if(seq===generation)leave('A chamada foi desconectada.');};
      socket.onerror=()=>{if(seq===generation)status('Não foi possível conectar ao canal de voz.');};
    }catch(e){if(seq===generation)leave(e.name==='NotAllowedError'?'Autorize o microfone para participar da call.':'Falha na chamada: '+e.message);}
  }
  async function toggleVideo(type){
    if(!room||!local)return;
    if(type==='camera'&&camera||type==='screen'&&screen){stopVideo(type);return;}
    try{
      const stream=type==='camera'?await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}):
        await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
      if(!room){trackStop(stream);return;}
      if(type==='camera')camera=stream;else screen=stream;
      const track=stream.getVideoTracks()[0];
      track.addEventListener('ended',()=>stopVideo(type),{once:true});
      for(const record of peers.values())await record.senders[type].replaceTrack(track);
      tile('self',type,'Você',stream,true);mediaState();render();
    }catch(e){status(e.name==='NotAllowedError'?'Permissão de câmera ou tela negada.':e.message);}
  }
  $('mobile-call-close').addEventListener('click',()=>leave());
  $('mobile-call-hangup').addEventListener('click',()=>leave());
  $('mobile-call-mute').addEventListener('click',()=>{muted=!muted;local?.getAudioTracks().forEach(t=>t.enabled=!(muted||serverMuted));send({type:'mute',muted});render();});
  $('mobile-call-deafen').addEventListener('click',()=>{deaf=!deaf;for(const id of participants.keys())applyVolume(id);send({type:'deafen',deafened:deaf});render();});
  $('mobile-call-camera').addEventListener('click',()=>void toggleVideo('camera'));
  $('mobile-call-screen').addEventListener('click',()=>void toggleVideo('screen'));
  overlay.addEventListener('cancel',()=>leave());
  document.addEventListener('bc:mobile-session',e=>{token=e.detail.token;user=e.detail.user;});
  document.addEventListener('bc:mobile-logout',()=>{token=null;user=null;leave();});
  document.addEventListener('bc:mobile-voice-request',e=>void join(e.detail.channel));
  window.addEventListener('pagehide',()=>leave(),{once:true});
})();
