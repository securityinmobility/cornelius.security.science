// Light/dark switch. Loaded in <head> so the page never flashes the wrong theme.
// Dark is the default. The choice is kept only while you click through the site
// in this tab (sessionStorage, nothing else, gone when the tab closes).
// Reloading the page goes back to dark.
(function () {
  var root = document.documentElement, KEY = 'theme', theme = 'dark';

  function isReload() {
    try { var n = performance.getEntriesByType('navigation')[0]; return !!n && n.type === 'reload'; }
    catch (e) { return false; }
  }
  try {
    if (isReload()) sessionStorage.removeItem(KEY);
    else if (sessionStorage.getItem(KEY) === 'light') theme = 'light';
  } catch (e) { /* storage blocked: just use dark */ }
  root.setAttribute('data-theme', theme);

  function current() { return root.getAttribute('data-theme'); }

  function label(btn) {
    var next = current() === 'dark' ? 'light' : 'dark';
    btn.textContent = next === 'light' ? 'Light mode' : 'Dark mode';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function (btn) {
      label(btn);
      btn.addEventListener('click', function () {
        var t = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', t);
        try { if (t === 'light') sessionStorage.setItem(KEY, 'light'); else sessionStorage.removeItem(KEY); } catch (e) {}
        btns.forEach(label);
      });
    });
  });
})();
