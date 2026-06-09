// Prefill fix — polls until _prefillData is ready then applies it
(function waitForPrefill() {
  var attempts = 0;
  var interval = setInterval(function() {
    attempts++;
    if (!window._prefillData) {
      if (attempts > 40) clearInterval(interval); // give up after 4 seconds
      return;
    }
    clearInterval(interval);
    var data = window._prefillData;
    // Fill all inputs and selects
    Object.keys(data).forEach(function(key) {
      var el = document.getElementById(key);
      if (el && data[key] !== undefined && data[key] !== '') {
        el.value = data[key];
      }
    });
    // Fill TOTT
    if (data.tott && Array.isArray(data.tott)) {
      data.tott.forEach(function(p, i) {
        var el = document.getElementById('tott_' + i);
        if (el && p.player) el.value = p.player;
      });
    }
    console.log('Prefill applied ✓');
  }, 100);
})();
