var noteNameMap={
    0:'C',
    1:'C#/Db',
    2:'D',
    3:'D#/Eb',
    4:'E',
    5:'F',
    6:'F#/Gb',
    7:'G',
    8:'G#/Ab',
    9:'A',
    10:'A#/Bb',
    11:'B'}

var placementsNotes = ['B', 'Gb', 'Eb', 'Bb', 'A', 'Db', 'F', 'Ab', 
'C', 'E', 'G', 'B', 'D', 'Gb', 'Db', 'Bb', 'D', 'F', 'A', 'C', 'E', 'G'] 

function objectFlip(obj) {
    return Object.entries(obj).reduce((ret, entry) => {
      const [ key, value ] = entry;
      var s = value.split('/')
      s.forEach(f=>
      ret[ f ] = key)
      return ret;
    }, {});
  }
var noteNameMapFlip = objectFlip(noteNameMap);

var placements = placementsNotes.map(f=>parseInt(noteNameMapFlip[f]));

var controls = ['L', 'P', 'B', 'A', '1', '2', '3', '4'];
var root = document.getElementById("root");
var keyWidth = (window.innerWidth - 10) / 4, keyHeight = window.innerHeight / 8;
var sw, obxd;

async function registerSW() {
    if ('serviceWorker' in navigator) {
        try {
            let res = await navigator.serviceWorker.register('./sw.js');
            return res;
        } catch (e) {
            throw e
        }
    } else {
        document.querySelector('.alert').removeAttribute('hidden');
    }
}
window.addEventListener('load', async e => {
    sw = await registerSW();

    const messageChannel1 = new MessageChannel();

    navigator.serviceWorker.controller.postMessage({
        type: 'INIT_PORT',
    }, [messageChannel1.port2]);

    messageChannel1.port1.onmessage = (event) => {
        if (event.data.type === 'on') {
            //console.log(event.data.payload.note)
            obxd.onMidi([0x90, event.data.payload.note, Math.round(127 * event.data.payload.pressure)]);
        }
        if (event.data.type === 'off') {
            obxd.onMidi([0x80, event.data.payload.note, 0]);
        }
        if (event.data.type === 'change') {
            obxd.onMidi([0xa0, event.data.payload.note, Math.round(Pressure.map(event.data.payload.pressure, 0, 1, 50, 127))]);
        }
    };
});

function post(type, id, pressure) {
    var messageChannel = new MessageChannel();

    navigator.serviceWorker.controller.postMessage({
        type, payload: { id, pressure }
    }, [messageChannel.port2]);
}



window.addEventListener('resize', function () {
    keyWidth = window.innerWidth / 5;
    keyHeight = window.innerHeight / 8;
    render();
}, false);

function render() {
    document.querySelectorAll('.row .but').forEach(f => {
        f.style.width = keyWidth + 'px';
        f.style.height = keyHeight + 'px';
    })
}
var count = 0;
for (let row = 2; row >= 0; row--) {
    var keyrow = document.getElementById(`key-row-${row}`)
    for (let note = 7; note >= 0; note--) {
        var name = noteNameMap[(36 + placements[count]) % 12]
        var div = document.createElement('div');
        div.className = 'but';
        div.id = 'n-' +(note+row*8+'-')+ ((36 + placements[count]))
        var p = document.createElement('p');
        p.innerHTML = name;
        div.appendChild(p)
        keyrow.prepend(div)
        count+=1;
        count%=placements.length
    }
    count -= 1;
    if(count<0){
        count+=12
    }
}

var keyrow = document.getElementById(`controls`)
for (let control = 7; control >= 0; control--) {
    var name = controls[control];
    if (!name) {
        continue;
    }
    var div = document.createElement('div');
    div.className = 'but';
    div.id = 'c-' + name;
    var p = document.createElement('p');
    p.innerHTML = name;
    div.appendChild(p)
    if (name === "P") {
        div.innerHTML += `<select id="banks" onchange="bankChange()">
            <option>factory.fxb</option>
            <option>Designer/Breeze_Meat-n-Potatoes_Obxd-Bank.fxb</option>
            <!-- <option>AJ- OBXD Basses.fxb</option>
           <option>AJ- OBXD Pads.fxb</option>
           <option>Breeze_Meat-n-Potatoes_Obxd-Bank_rev3b.fxb</option>
           <option>Breeze_Meat-n-Potatoes_Obxd-Bank_rev3b-ALPHA.fxb</option> -->
            <!-- <option>factory.fxb</option>
           <option>FMR - OB-Xa Patch Book.fxb</option>
           <option>IW_OBXD Bank 1_Rev 1.11.fxb</option>
           <option>Joel.fxb</option>
           <option>Kujashi-OBXD-Bank.fxb</option>
           <option>OBXD Init Bank.fxb</option>
           <option>OBXD - KVR Community Bank - Part 1.fxb</option>
           <option>OBXD - KVR Community Bank - Part 2.fxb</option>
           <option>OBXd Bank by Rin_Elyran.fxb</option>
           <option>OBXD_AZurStudio.fxb</option>
           <option>Xenos Soundworks.fxb</option> -->
          </select>`
    } else if (name === "B") {
        div.innerHTML += `<select id="patches" onchange="patchChange()"></select>`
    }

    keyrow.appendChild(div)
}

render();
document.querySelectorAll('.row .but').forEach(f => {
    Pressure.set('#' + f.id, {
        start: async function (event) {
            f.style.backgroundColor = '#000000';
            f.style.opacity = 0.5;
            if (f.id[0] === 'n') {
                post('on', f.id, event.pressure);
            } else {
                post('control', f.id);
            }
            //let note = 48 + notesPositions[i];
            //return obxd.onMidi([0x90, note, Math.round(127 * event.pressure)]);
        },
        end: function () {
            f.style.backgroundColor = '#FFFFFF';
            f.style.opacity = 1;
            post('off', f.id);
            //   o.style.backgroundColor = '#443548';
            //   o.style.opacity = 1;
            //   let note = 48 + notesPositions[i];
            //return obxd.onMidi([0x80, note, 0]);
        },
        change: function (force, event) {
            //   o.style.backgroundColor = '#5F674B';
            //   o.style.opacity = force;
            //   let note = 48 + notesPositions[i];
            //return obxd.onMidi([0xa0, note, Math.round(Pressure.map(force, 0, 1, 50, 127))]);
        },
        unsupported: function () {
        }
    });
    interact('#n' + f.id)
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            onmove: dragMoveListener,
            onend: function (event) {
                var target = event.target;
                target.style.webkitTransform =
                    target.style.transform =
                    'translate(' + 0 + 'px, ' + 0 + 'px)';
                target.setAttribute('data-x', 0)
                target.setAttribute('data-y', 0)
            }
        })
    function dragMoveListener(event) {
        var target = event.target
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

        target.style.webkitTransform =
            target.style.transform =
            'translate(' + x + 'px, ' + y + 'px)'

        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)
    }
})

async function loadSynth() {
    let actx = new AudioContext();

    await WAM.OBXD.importScripts(actx);
    obxd = new WAM.OBXD(actx);
    obxd.connect(actx.destination);

    let gui = await obxd.loadGUI("skin");
    if (document.getElementById('controller').style.display !== 'none') {
        frontpanel.appendChild(gui);
        container.style.width = gui.width + "px";
        frontpanel.style.height = gui.height + "px";
        frontpanel.className = container.className = "ready";

        let midikeys = new QwertyHancock({
            container: document.querySelector("#keys"), height: 60,
            octaves: 6, startNote: 'C2', oct: 4,
            whiteNotesColour: 'white', blackNotesColour: 'black', activeColour: 'orange'
        });
        midikeys.keyDown = (note, name) => obxd.onMidi([0x90, note, 100]);
        midikeys.keyUp = (note, name) => obxd.onMidi([0x80, note, 100]);
    }
    await obxd.loadBank("presets/factory.fxb");
    loadPatches();
    obxd.selectPatch(20);
}
async function bankChange() {
    var x = document.getElementById("banks").value;
    await obxd.loadBank("presets/" + x);
    loadPatches();
}
async function patchChange() {
    var x = document.getElementById("patches").value;
    obxd.selectPatch(x);
}
function loadPatches() {
    var array = obxd.patches;
    var patchList = document.getElementById("patches");
    patchList.innerHTML = '';
    for (var i = 0; i < array.length; i++) {
        var option = document.createElement("option");
        option.value = i;
        option.text = i + ": " + array[i];
        patchList.appendChild(option);
    }
}

async function load() {
    try {
        await loadSynth();
        var el = document.getElementById("load");
        el.style.display = "none";
    } catch (e) {
        alert(e)
    }
}