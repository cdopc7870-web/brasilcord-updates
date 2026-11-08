'use strict';
(() => {
  const menuButton=document.querySelector('.menu-toggle');
  const nav=document.querySelector('#main-nav');
  if(menuButton&&nav){
    const close=()=>{menuButton.setAttribute('aria-expanded','false');nav.classList.remove('is-open');};
    menuButton.addEventListener('click',()=>{
      const expanded=menuButton.getAttribute('aria-expanded')==='true';
      menuButton.setAttribute('aria-expanded',String(!expanded));
      nav.classList.toggle('is-open',!expanded);
    });
    nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    window.addEventListener('resize',()=>{if(window.innerWidth>620)close();});
  }

  const year=document.querySelector('#copyright-year');
  if(year)year.textContent=String(new Date().getFullYear());

  // Uma fonte única e pública para o instalador mais recente.
  // Se a consulta falhar, links continuam apontando para a página oficial Releases.
  const defaultLink='https://github.com/cdopc7870-web/brasilcord-updates/releases/latest';
  const state=document.querySelector('#release-state');
  const buttons=['hero-download','primary-download'].map(id=>document.getElementById(id)).filter(Boolean);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  fetch('https://api.github.com/repos/cdopc7870-web/brasilcord-updates/releases/latest',{
    signal:controller.signal,cache:'no-store',headers:{Accept:'application/vnd.github+json'}
  }).then(response=>{
    if(!response.ok)throw new Error('release unavailable');
    return response.json();
  }).then(release=>{
    const version=typeof release.tag_name==='string'&&/^v?\d+\.\d+\.\d+$/.test(release.tag_name)?release.tag_name:null;
    const asset=Array.isArray(release.assets)?release.assets.find(file=>
      typeof file.name==='string'&&/^BrasilCord-Setup-\d+\.\d+\.\d+\.exe$/i.test(file.name)&&
      typeof file.browser_download_url==='string'&&
      /^https:\/\/github\.com\/cdopc7870-web\/brasilcord-updates\/releases\/download\/[^/]+\/BrasilCord-Setup-[\d.]+\.exe$/i.test(file.browser_download_url)
    ):null;
    if(version && state)state.textContent='Versão mais recente: '+version+' · Windows';
    if(asset)for(const button of buttons)button.href=asset.browser_download_url;
    else for(const button of buttons)button.href=defaultLink;
  }).catch(()=>{
    if(state)state.textContent='Baixe sempre a versão mais recente pelo GitHub Releases oficial.';
  }).finally(()=>clearTimeout(timer));
})();
