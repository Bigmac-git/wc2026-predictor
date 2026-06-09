// Prefill fix — applies saved predictions after DOM is ready
window.addEventListener('load', function() {
  setTimeout(function() {
    if (!window._prefillData) return;
    var data = window._prefillData;
    Object.keys(data).forEach(function(key) {
      var el = document.getElementById(key);
      if (el && data[key] !== undefined && data[key] !== '') {
        el.value = data[key];
      }
    });
    if (data.tott && Array.isArray(data.tott)) {
      data.tott.forEach(function(p, i) {
        var el = document.getElementById('tott_' + i);
        if (el && p.player) el.value = p.player;
      });
    }
  }, 500);
});
