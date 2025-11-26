// This script is injected into the page context to observe fetch() calls
(function () {
  try {
    let lastToken = null;
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      // 1. Inspect request headers to capture the token
      try {
        console.log('MapChirp: Fetch intercepted', args[0]);
        const options = args[1]; // Fetch options are usually the second argument
        if (options && options.headers) {
          let token = null;

          // Check if headers is a Headers object or a plain object
          if (options.headers instanceof Headers) {
            token = options.headers.get('authorization');
          } else if (typeof options.headers === 'object') {
            // Case-insensitive search for 'authorization' key
            const keys = Object.keys(options.headers);
            const authKey = keys.find(k => k.toLowerCase() === 'authorization');
            if (authKey) token = options.headers[authKey];
          }

          if (token && token !== lastToken) {
            console.log('MapChirp: Token found in fetch', token);
            lastToken = token;
            // Send the new token to content.js
            window.postMessage({ source: 'x-location-display-page', type: 'token', token: token }, '*');
          }
        }
      } catch (e) {
        console.log('MapChirp: Error inspecting fetch headers', e);
        // Ignore errors during inspection so we don't block the actual fetch
      }

      // 2. Perform the actual fetch
      const response = await originalFetch.apply(this, args);

      // 3. Inspect response for location data (existing logic)
      try {
        const url = args[0];

        if (typeof url === 'string' && url.includes('AboutAccountQuery')) {
          const clonedResponse = response.clone();
          clonedResponse.json().then(data => {
            try {
              const username = data?.data?.user_result_by_screen_name?.result?.core?.screen_name;
              const location = data?.data?.user_result_by_screen_name?.result?.about_profile?.account_based_in;
              if (username && location) {
                window.postMessage({ source: 'x-location-display-page', type: 'location', username, location }, '*');
              }
            } catch (e) {
              // ignore
            }
          }).catch(() => {/* ignore json parse errors */ });
        }
      } catch (e) {
        // ignore
      }

      return response;
    };

    // Intercept XHR requests as fallback (existing logic)
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (...args) {
      this._url = args[1];
      return originalOpen.apply(this, args);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      if (header && (header.toLowerCase() === 'authorization')) {
        if (value !== lastToken) {
          console.log('MapChirp: XHR Token found', value);
          lastToken = value;
          window.postMessage({ source: 'x-location-display-page', type: 'token', token: value }, '*');
        }
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

  } catch (e) {
    // ignore injection failure
  }
})();