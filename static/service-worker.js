let CACHE_NAME = 'static-cache-v1';

function doNotCache(url) {
    return true || url.includes('sockjs') || url.includes('chrome-extension')
}

// Always read from cache first
self.addEventListener('fetch', function(evt) {
    evt.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(evt.request)
                .then((cacheResponse) => {
                    console.log('[Fetch] Cache result for', evt.request.url, ': hit=', !!cacheResponse);
                    let response = cacheResponse;
                    if (!response) {
                        response = fetch(evt.request).then((response) => {
                            if (!doNotCache(evt.request.url)) {
                                console.log('[Fetch] Caching', evt.request.url)
                                cache.put(evt.request, response.clone());
                            }
                            return response;
                        })
                    }
                    return response;
                });
        })
    );
})