// This script is injected into the page context to observe fetch() calls
(function() {
  try {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);

      try {
        const url = args[0];
        if (typeof url === 'string' && url.includes('AboutAccountQuery')) {
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            try {
              const username = data?.data?.user_result_by_screen_name?.result?.core?.screen_name;
              const location = data?.data?.user_result_by_screen_name?.result?.about_profile?.account_based_in;
              if (username && location) {
                window.postMessage({ source: 'x-location-display-page', username, location }, '*');
              }
            } catch (e) {
              // ignore
            }
          }).catch(() => {/* ignore json parse errors */});
        }
      } catch (e) {
        // ignore
      }

      return response;
    };
  } catch (e) {
    // ignore injection failure
  }
})();
