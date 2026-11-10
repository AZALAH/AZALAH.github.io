'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const api = window.launcher;
  let ready = false;

  function showSave() {
    let s = null; try { s = JSON.parse(localStorage.getItem('azalah-save') || 'null'); } catch (e) {}
    const sum = s && s.sum && typeof s.sum === 'object' ? s.sum : null;
    $('saveNone').hidden = !!sum; $('saveBox').hidden = !sum; if (!sum) return;
    const n = v => Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
    $('pct').textContent = Math.min(100, n(sum.pct)) + '%'; $('meter').style.width = Math.min(100, n(sum.pct)) + '%';
    $('where').textContent = typeof sum.where === 'string' ? sum.where.slice(0, 40) : '';
    $('sEx').textContent = n(sum.ex) + ' of ' + n(sum.exT); $('sPpl').textContent = n(sum.ppl) + ' of ' + n(sum.pplT); $('sAch').textContent = n(sum.ach) + ' of ' + n(sum.achT);
    const m = Math.floor(n(s.stats && s.stats.secs) / 60); $('sTime').textContent = m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }
  function showNotes(notes) {
    const ul = $('notes'); ul.textContent = '';
    const list = Array.isArray(notes) && notes.length ? notes : ['You are on the first release.'];
    list.slice(0, 12).forEach(t => { const li = document.createElement('li'); li.textContent = String(t).slice(0, 200); ul.append(li); });
  }
  function setReady(on) { ready = on; $('play').disabled = !on; if (on) $('play').focus(); }
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }
  function onUpdate(d) {
    const st = $('status'), prog = $('prog');
    if (d.version) $('gver').textContent = 'Version ' + d.version;
    if (d.notes) showNotes(d.notes);
    if (d.phase === 'checking') { st.textContent = 'Checking for updates'; prog.hidden = true; setReady(false); }
    else if (d.phase === 'downloading') { st.textContent = 'Updating  ' + mb(d.done) + ' of ' + mb(d.total); prog.hidden = false; $('progBar').style.width = (d.total ? 100 * d.done / d.total : 100) + '%'; setReady(false); }
    else if (d.phase === 'ready') { st.textContent = d.updated ? 'Updated. Ready to play.' : 'Up to date. Ready to play.'; prog.hidden = true; setReady(true); }
    else if (d.phase === 'offline') { st.textContent = 'Offline. Playing the installed version.'; prog.hidden = true; setReady(true); }
    else if (d.phase === 'failed') { st.textContent = 'Update failed. Playing the installed version.'; st.title = d.message || ''; prog.hidden = true; setReady(true); }
  }
  function toggle(btn, key) { btn.addEventListener('click', () => { const v = btn.getAttribute('aria-checked') !== 'true'; btn.setAttribute('aria-checked', String(v)); api.set(key, v); }); }

  $('min').onclick = () => api.minimize(); $('close').onclick = () => api.close(); $('site').onclick = () => api.site();
  $('play').onclick = () => { if (ready) { $('status').textContent = 'Starting the game'; api.play(); } };
  toggle($('optFull'), 'fullscreen'); toggle($('optSkip'), 'skipTitle');
  api.onUpdate(onUpdate);
  api.onGameClosed(() => { showSave(); $('status').textContent = 'Welcome back. Ready to play.'; api.check(); });
  addEventListener('keydown', e => { if (e.key === 'Enter' && document.activeElement === document.body && ready) $('play').click(); });
  let padPrev = false;
  (function pad() { let on = false; try { for (const g of navigator.getGamepads()) if (g && g.connected && ((g.buttons[0] && g.buttons[0].pressed) || (g.buttons[9] && g.buttons[9].pressed))) on = true; } catch (e) {}
    if (on && !padPrev && ready && document.hasFocus()) $('play').click(); padPrev = on; requestAnimationFrame(pad); })();

  showSave();
  api.state().then(s => { if (!s) return; $('ver').textContent = 'Launcher ' + s.launcher; $('gver').textContent = 'Version ' + s.game; showNotes(s.notes);
    $('optFull').setAttribute('aria-checked', String(!!s.settings.fullscreen)); $('optSkip').setAttribute('aria-checked', String(!!s.settings.skipTitle)); api.check(); });
})();
