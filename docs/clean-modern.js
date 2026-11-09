'use strict';
(() => {
  // Animacoes leves; nao bloqueiam conteudo nem dependem de bibliotecas.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const init = () => {
    const elements = document.querySelectorAll('.bc-modern-showcase-title,.bc-modern-highlight,.feature-card,.community-copy,.about-copy,.download-panel');
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries)=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        entry.target.classList.add('bc-visible');
        observer.unobserve(entry.target);
      }
    },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
    const sections=[...document.querySelectorAll('#recursos,#comunidades,#sobre,#baixar')];
    const links=[...document.querySelectorAll('#main-nav a[href^="#"]')];
    if(sections.length&&links.length){
      const navigationObserver=new IntersectionObserver(entries=>{
        const current=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(!current)return;
        links.forEach(link=>{
          const active=link.getAttribute('href')==='#'+current.target.id;
          link.classList.toggle('bc-nav-active',active);
          if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
        });
      },{rootMargin:'-20% 0px -58% 0px',threshold:0});
      sections.forEach(section=>navigationObserver.observe(section));
    }
    elements.forEach((element,index)=>{
      element.classList.add('bc-animate-on-scroll');
      element.style.transitionDelay=(index%3)*75+'ms';
      observer.observe(element);
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
