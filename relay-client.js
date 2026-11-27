const RELAY_URL = 'wss://board-relay.sp9889689810.workers.dev';
// Loaded after app.js and enhancements.js once RELAY_URL is configured.
// Stop the previous direct connection and use the room relay instead.
if (peer && !peer.destroyed) peer.destroy();
host = false;
connections = [];
clearTimeout(retryTimer);
let socket, retryDelay = 1000, relayReady = false;
function connectRelay() {
  relayReady = false;
  setStatus("Connecting to shared board…");
  socket = new WebSocket(RELAY_URL.replace(/\/$/, "") + "/room/" + room);
  socket.onmessage = event => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (data.type === "snapshot") {
      const localCopy = structuredClone(strokes);
      if (strokes.length && JSON.stringify(strokes) !== JSON.stringify(data.strokes)) {
        try { localStorage.setItem('board-backup-' + room, JSON.stringify(strokes)); }
        catch { setStatus("Storage full — export your board before reconnecting"); socket.close(); return; }
      }
      apply(data);
      relayReady = true;
      retryDelay = 1000;
      setStatus("Connected");
      notice.classList.add("hidden");
      if (!data.strokes.length && localCopy.length && confirm("This online room is empty. Upload this device's saved board to it?")) {
        for (const stroke of localCopy) {
          strokes.push(stroke);
          socket.send(JSON.stringify({type:"start", stroke}));
        }
        render();
      }
    } else apply(data);
  };
  socket.onclose = () => {
    relayReady = false;
    setStatus("Disconnected — reconnecting…");
    setTimeout(connectRelay, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15000);
  };
  socket.onerror = () => socket.close();
}
let bufferedPoints = null, flushTimer;
function flushPoints() {
  clearTimeout(flushTimer);
  flushTimer = null;
  if (bufferedPoints && relayReady && socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(bufferedPoints));
  bufferedPoints = null;
}
send = function(data) {
  if (!relayReady || socket.readyState !== WebSocket.OPEN) return;
  if (data.type === "points") {
    if (bufferedPoints && bufferedPoints.id !== data.id) flushPoints();
    if (!bufferedPoints) bufferedPoints = {type:"points", id:data.id, points:[]};
    bufferedPoints.points.push(...data.points);
    if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; flushPoints(); }, 50);
  } else {
    flushPoints();
    flushTimer = null;
    socket.send(JSON.stringify(data));
  }
};
// Prevent unsent edits from being overwritten by the reconnect snapshot.
window.addEventListener("pointerdown", event => {
  if (!relayReady && event.target === canvas) {
    event.stopImmediatePropagation();
    event.preventDefault();
    toast("Connecting — please wait before drawing.");
  }
}, { capture: true });
window.addEventListener("pointermove", event => {
  if (!relayReady && event.target === canvas && current) {
    event.stopImmediatePropagation();
    current = null;
    render();
  }
}, { capture: true });
window.addEventListener("click", event => {
  if (!relayReady && event.target.closest("#clear, #undo")) {
    event.stopImmediatePropagation();
    event.preventDefault();
    toast("Connecting — please wait before editing.");
  }
}, { capture: true });
connectRelay();
