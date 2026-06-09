// Debug prefill
(function() {
  var checks = 0;
  var timer = setInterval(function() {
    checks++;
    console.log('Prefill check #' + checks + ', _prefillData:', window._prefillData ? 'SET' : 'NOT SET');
    
    if (window._prefillData) {
      clearInterval(timer);
      var data = window._prefillData;
      console.log('Applying prefill data:', JSON.stringify(data).substring(0, 200));
      
      // Apply all values
      Object.keys(data).forEach(function(key) {
        var el = document.getElementById(key);
        if (el && data[key] !== undefined && data[key] !== '') {
          el.value = data[key];
          console.log('Set', key, '=', data[key]);
        }
      });
      
      if (data.tott && Array.isArray(data.tott)) {
        data.tott.forEach(function(p, i) {
          var el = document.getElementById('tott_' + i);
          if (el && p.player) el.value = p.player;
        });
      }
      console.log('Prefill complete ✓');
    }
    
    if (checks > 60) {
      clearInterval(timer);
      console.log('Prefill gave up — _prefillData never set');
    }
  }, 100);
})();
