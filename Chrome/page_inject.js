// This script is injected into the page context to observe fetch() calls
(function () {
    try {
        let lastToken = null;
        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
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
        // Intercept XHR requests as fallback
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function (...args) {
            this._url = args[1];
            return originalOpen.apply(this, args);
        };

        XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
            if (header && (header.toLowerCase() === 'authorization')) {
                if (value !== lastToken) {
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
