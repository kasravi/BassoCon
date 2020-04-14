const APP_CACHE_NAME = 'bossocon-pwa-morteza';
const STATIC_CACHE_NAME = 'bossocon-pwa-morteza-static'
const staticAssets = [
    './',
    './index.html',
    './scripts.js',
    './style.css',
    './libs/webcomponents-lite.js',
    './libs/keys.js',
    './libs/wam-controller.js',
    './obxd.js',
    './libs/pressure.min.js',
    './libs/interact.min.js',
];

self.addEventListener('install', async event => {
    //event.waitUntil(self.skipWaiting());
    const cache = await caches.open(APP_CACHE_NAME);
    await cache.addAll(staticAssets);
});

async function cacheFirst(req) {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(req);
    return cachedResponse || fetch(req);
}

self.addEventListener('fetch', async event => {
    const req = event.request;
    event.respondWith(cacheFirst(req));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        if (cacheName !== APP_CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
                            console.log('deleting', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

function distinct(value, index, self) {
    return self.indexOf(value) === index;
}

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this,
        args = arguments;
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      }, wait);
      if (callNow) func.apply(context, args);
    }
  }

var getVersionPort;
var notes = [], recNotes = [];
var arrpeg = false;
var pressure = 0;
var tempo = 69;
var currentPat = 2;
var arrpegTimer = null;
var base = 48;

self.addEventListener("message", event => {
    if (event.data) {
        switch (event.data.type) {
            case 'INIT_PORT':
                getVersionPort = event.ports[0];
                break;
            case 'on':
                var spl = event.data.payload.id.split('-');
                var note = parseInt(spl[2]);
                recNotes.push(note);
                recNotes = recNotes.filter(distinct).sort((a, b) => a > b ? 1 : -1);
                pressure = event.data.payload.pressure;

                play();
                break;
            case 'off':
                var spl = event.data.payload.id.split('-');
                var note = parseInt(spl[2]);
                recNotes.splice(recNotes.indexOf(notes), 1)
                play()
                break;
            case 'control':
                var id = event.data.payload.id.split('-')[1];
                switch (id) {
                    case 'A':
                        arrpeg = !arrpeg;
                        break;
                }
                break;

        }
    }

})

function wait(s) {
    return new Promise((resolve) => setTimeout(resolve, s * 1000))
}

function isEqaul(a, b) {
    if (a.length !== b.length) return false;
    return !a.some((f, i) => f !== b[i])
}

var play = debounce(playDebounced, 100);

function playDebounced() {
    if (recNotes.length > 0) {
        var t = [];
        for (let i = -12; i < 13; i += 12) {
            if (recNotes.length === 2) {
                t.push(recNotes[0] + base + i);
                t.push(recNotes[0] + base + i + 3);
                t.push(recNotes[0] + base + i + 7);

            } else if (recNotes.length === 1) {
                t.push(recNotes[0] + base + i);
                t.push(recNotes[0] + base + i + 4);
                t.push(recNotes[0] + base + i + 7);
            }
        }
        if (!isEqaul(notes, t)) {
            stop();
            notes = t;
            if (!arrpeg) {
                notes.sort((a, b) => a > b ? -1 : 1)
                    .forEach((note) => getVersionPort
                        .postMessage({ type: 'on', payload: { note, pressure } }))
            } else {
                if (arrpegTimer) {
                    clearTimeout(arrpegTimer);
                }
                arrpegiate()
            }
        }
    } else {
        stop();
    }
}

var patterns = [
    { name: "", pattern: [{ on: [0, 1, 2, 3, 4], off: [0, 1, 2, 3, 4], t: 1 }] },
    { name: "", pattern: [{ on: [0, 1, 2, 3, 4], t: 1 }] },
    { name: "", pattern: [{ on: [0,3,6], t: 1 }, { on: [1,4,7], off: [1, 2,4,5,7,9], t: 0.5 }, { on: [2,5,8], off: [1, 2,4,5,7,9], t: 0.5 }] }
]

function stop() {
    if (arrpegTimer) {
        clearTimeout(arrpegTimer);
    }
    notes.forEach((note) => getVersionPort.postMessage({ type: 'off', payload: { note } }));
    notes = [];
}


function arrpegiate(i) {
    if (!arrpeg || notes.length === 0) {
        stop();
        return;
    }

    var p = patterns[currentPat];
    i = (i || 0) % p.pattern.length;
    (p.pattern[i].off || [...Array(notes.length).keys()]).forEach(i => {
        if (notes[i]) {
            getVersionPort.postMessage({ type: 'off', payload: { note: notes[i], pressure } })
        }
    });
    p.pattern[i].on.forEach(i => {
        if (notes[i]) {
            getVersionPort.postMessage({ type: 'on', payload: { note: notes[i], pressure } })
        }
    });
    arrpegTimer = setTimeout(() => arrpegiate(i + 1), 1000 * tempo * p.pattern[i].t / 60);
}