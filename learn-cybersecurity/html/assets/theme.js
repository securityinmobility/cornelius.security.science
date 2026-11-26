// Light/dark switch. Loaded in <head> so the page never flashes the wrong theme.
// Dark is the default. The choice is not stored anywhere (no cookies, no localStorage).
(function () {
  var root = document.documentElement;
  root.setAttribute('data-theme', 'dark');

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
        root.setAttribute('data-theme', current() === 'dark' ? 'light' : 'dark');
        btns.forEach(label);
      });
    });
  });
})();
