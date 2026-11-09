'use strict';
/* BrasilCord Web / PWA: boas-vindas Beta e comunicação privada com DKX157. */
(()=>{
  const BASE='https://brasilcord-sinalizacao-dkx157.onrender.com/api/platform';
  let token=null,loadedToken=null,busy=false,ackBusy=false,currentKind='suggestion';
  const outer=document.createElement('dialog');
  outer.className='bc-mobile-founder-dialog';
  outer.innerHTML='<div class="bc-mobile-founder"><span class="bc-mobile-founder-stars">✦ ✧ ✦</span><img src="../../desktop/assets/badges/beta.svg" alt="" hidden><strong>BRASILCORD · PRIMEIROS 100</strong><h2>Parabéns! Você é um Fundador Beta!</h2><p id="bc-mobile-founder-position"></p><p>Chame seus amigos e divirta-se! 🇧🇷</p><button id="bc-mobile-founder-ok" type="button">✦ Vamos começar!</button><small id="bc-mobile-founder-error" role="status"></small></div>';
  // A PWA usa emblema com traços próprios na interface, sem depender de imagens hospedadas no app PC.
  outer.querySelector('img').remove();
  document.body.append(outer);
  outer.addEventListener('cancel',e=>e.preventDefault());
  const formDialog=document.createElement('dialog');
  formDialog.className='bc-mobile-feedback-dialog';
  formDialog.innerHTML='<div class="bc-mobile-feedback"><header><div><small>BRASILCORD · COMUNIDADE OFICIAL</small><h2 id="bc-mobile-feedback-title">Enviar sugestão</h2></div><button id="bc-mobile-feedback-close" type="button">✕</button></header><p>Sua mensagem será entregue apenas à central privada de DKX157. Nunca envie senhas ou códigos.</p><form id="bc-mobile-feedback-form"><label>Assunto<input id="bc-mobile-feedback-subject" minlength="5" maxlength="100" required placeholder="Resuma o assunto"></label><label>Descreva sua ideia ou problema<textarea id="bc-mobile-feedback-details" minlength="10" maxlength="1500" rows="6" required placeholder="Escreva os detalhes aqui…"></textarea></label><p id="bc-mobile-feedback-status" role="status"></p><button type="submit" id="bc-mobile-feedback-submit">Enviar em privado</button></form></div>';
  document.body.append(formDialog);
  const $=id=>document.getElementById(id);
  async function api(path,method='GET',data){
    if(!token)throw Error('Entre na sua conta BrasilCord.');
    const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),14000);
    try{
      const resp=await fetch(BASE+path,{method,signal:ctrl.signal,cache:'no-store',credentials:'omit',
        headers:{Authorization:'Bearer '+token,Accept:'application/json',...(data===undefined?{}:{'Content-Type':'application/json'})},
        ...(data===undefined?{}:{body:JSON.stringify(data)})});
      const json=await resp.json().catch(()=>({}));
      if(!resp.ok)throw Error(json.error||'Erro HTTP '+resp.status);
      return json;
    }finally{clearTimeout(timeout);}
  }
  async function celebrate(){
    if(!token||loadedToken===token)return;
    const thisToken=token;loadedToken=thisToken;
    try{
      const data=await api('/beta');
      const position=Number(data.slot);
      if(token!==thisToken||!data.hasBadge||!data.celebrationPending||!Number.isInteger(position)||position<1||position>100)return;
      $('bc-mobile-founder-position').textContent='Você foi a pessoa nº '+position+' a entrar em nosso aplicativo e ganhou a insígnia exclusiva Beta • Fundador!';
      $('bc-mobile-founder-error').textContent='';
      if(!outer.open)outer.showModal();
    }catch{if(thisToken===token)loadedToken=null;}
  }
  $('bc-mobile-founder-ok').addEventListener('click',async()=>{
    if(ackBusy)return;ackBusy=true;$('bc-mobile-founder-ok').disabled=true;
    try{await api('/beta/ack','POST',{});outer.close();}
    catch(e){$('bc-mobile-founder-error').textContent=e.message;}
    finally{ackBusy=false;$('bc-mobile-founder-ok').disabled=false;}
  });
  function showFeedback(kind){
    currentKind=kind==='bug'?'bug':'suggestion';
    $('bc-mobile-feedback-title').textContent=currentKind==='bug'?'🐛 Reportar um erro':'💡 Enviar sugestão';
    $('bc-mobile-feedback-submit').textContent=currentKind==='bug'?'Enviar relatório para DKX157':'Enviar sugestão para DKX157';
    $('bc-mobile-feedback-status').textContent='';
    $('bc-mobile-feedback-form').reset();
    if(!formDialog.open)formDialog.showModal();
  }
  $('bc-mobile-feedback-close').addEventListener('click',()=>formDialog.close());
  $('bc-mobile-feedback-form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const title=$('bc-mobile-feedback-subject').value.trim(),details=$('bc-mobile-feedback-details').value.trim();
    if(title.length<5||title.length>100||details.length<10||details.length>1500){
      $('bc-mobile-feedback-status').textContent='Assunto: 5–100 caracteres; descrição: 10–1500.';return;
    }
    const btn=$('bc-mobile-feedback-submit');btn.disabled=true;busy=true;
    $('bc-mobile-feedback-status').textContent='Enviando sua mensagem com privacidade…';
    try{
      await api('/feedback','POST',{kind:currentKind,title,details});
      $('bc-mobile-feedback-status').textContent='✓ Enviado somente para DKX157! Obrigado por ajudar.';
      $('bc-mobile-feedback-form').reset();
    }catch(error){$('bc-mobile-feedback-status').textContent=error.message;}
    finally{busy=false;btn.disabled=false;}
  });
  document.addEventListener('bc:mobile-feedback-open',event=>showFeedback(event.detail?.kind));
  document.addEventListener('bc:mobile-session',event=>{
    token=event.detail?.token||null;loadedToken=null;
    if(token)void celebrate();
  });
  document.addEventListener('bc:mobile-logout',()=>{
    token=null;loadedToken=null;if(outer.open)outer.close();if(formDialog.open)formDialog.close();
  });
})();
