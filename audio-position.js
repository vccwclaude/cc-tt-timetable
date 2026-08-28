(() => {
  function positionAudio() {
    const player = document.querySelector('.soundtrack-player');
    if (!player) return;
    const buttons = [...document.querySelectorAll('button')];
    const monthButton = buttons.find(btn => btn.textContent.trim() === 'August 2026');
    if (!monthButton) return;
    const r = monthButton.getBoundingClientRect();
    const gap = 10;
    player.style.position = 'fixed';
    player.style.right = 'auto';
    player.style.left = `${Math.max(8, r.left - player.offsetWidth - gap)}px`;
    player.style.top = `${r.top + (r.height - player.offsetHeight) / 2}px`;
  }
  const run = () => { positionAudio(); setTimeout(positionAudio, 300); setTimeout(positionAudio, 1000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('resize', positionAudio);
  new MutationObserver(positionAudio).observe(document.body, {subtree:true, childList:true});
})();