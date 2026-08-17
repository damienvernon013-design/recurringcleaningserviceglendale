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

  function getStoredUtm() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function showMessage(panel, text, isError) {
    var existing = panel.querySelector('.form-status');
    if (existing) existing.remove();
    var el = document.createElement('p');
    el.className = 'form-status ' + (isError ? 'form-status-error' : 'form-status-success');
    el.textContent = text;
    panel.appendChild(el);
  }

  function initForm(panel) {
    var button = panel.querySelector('.btn-primary');
    if (!button) return;

    button.addEventListener('click', function () {
      var name = panel.querySelector('#name');
      var phone = panel.querySelector('#phone');
      var email = panel.querySelector('#email');
      var zip = panel.querySelector('#zip');
      var sqft = panel.querySelector('#sqft');
      var freq = panel.querySelector('#freq');

      if (!name.value.trim() || !phone.value.trim() || !email.value.trim() || !zip.value.trim()) {
        showMessage(panel, 'Please fill in your name, phone, email, and ZIP code.', true);
        return;
      }
      if (!/^\d{5}$/.test(zip.value.trim())) {
        showMessage(panel, 'Please enter a valid 5-digit ZIP code.', true);
        return;
      }

      var utm = getStoredUtm();
      var originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Submitting...';

      fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value.trim(),
          phone: phone.value.trim(),
          email: email.value.trim(),
          zip: zip.value.trim(),
          sqft: sqft ? sqft.value : '',
          freq: freq ? freq.value : '',
          utm_source: utm.utm_source || '',
          utm_medium: utm.utm_medium || '',
          utm_campaign: utm.utm_campaign || '',
          page_url: window.location.href,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data.ok) {
            panel.querySelectorAll('input, select').forEach(function (field) {
              field.value = '';
            });
            showMessage(panel, 'Thank you! We will call you back by the next business day.', false);
          } else {
            showMessage(panel, (result.data && result.data.error) || 'Something went wrong. Please call us instead.', true);
          }
        })
        .catch(function () {
          showMessage(panel, 'Something went wrong. Please call us instead.', true);
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = originalLabel;
        });
    });
  }

  captureUtm();
  document.querySelectorAll('.quote-form-panel').forEach(initForm);
})();
