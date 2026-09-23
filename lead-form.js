(function () {
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var STORAGE_KEY = 'grc_utm';

  function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var hasUtm = UTM_KEYS.some(function (key) { return params.has(key); });
    if (hasUtm) {
      var utm = {};
      UTM_KEYS.forEach(function (key) {
        if (params.has(key)) utm[key] = params.get(key);
      });
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
      } catch (e) {
        /* sessionStorage unavailable (private mode); UTM lost for this session */
      }
    }
  }

  captureUtm();
})();
