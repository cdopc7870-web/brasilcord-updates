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
    elements.forEach((element,index)=>{
      element.classList.add('bc-animate-on-scroll');
      element.style.transitionDelay=(index%3)*75+'ms';
      observer.observe(element);
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
