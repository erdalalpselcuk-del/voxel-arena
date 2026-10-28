// Tarayıcı içi sunucu: WebSocket yerine geçer. Aynı oyun mantığını (game.js) botlarla çalıştırır.
(function () {
  const { Game } = window.VGame;
  let game = null, fake = null, ticker = null, muted = false;
  const deliver = (obj) => {
    if (muted) return;
    const s = JSON.stringify(obj);
    setTimeout(() => { if (fake && fake.onmessage) fake.onmessage({ data: s }); }, 0);
  };

  class FakeWS {
    constructor() {
      fake = this; this.readyState = 0;
      setTimeout(() => { this.readyState = 1; if (this.onopen) this.onopen(); }, 20);
    }
    send(s) {
      const m = JSON.parse(s);
      if (m.t === 'join') {
        if (ticker) clearInterval(ticker);
        game = new Game({
          rotate: false, mode: m.mode || 'kc', theme: m.theme >= 0 ? m.theme : undefined,
          send: (id, o) => { if (id === this.pid) deliver(o); },
          broadcast: (o, skip) => { if (skip !== this.pid) deliver(o); },
        });
        this.pid = 1; window.VGameInst = game; // ilk oyuncu her zaman 1 numara
        game.addPlayer(m, true);
        muted = true; game.fillBots(7); muted = false; // botlar ilk anlık görüntüyle görünür
        let last = Date.now();
        ticker = setInterval(() => { const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; if (document.body.classList.contains('paused')) return; game.step(dt); }, 50);
      } else if (game) game.onMsg(this.pid, m);
    }
    close() { this.readyState = 3; if (ticker) { clearInterval(ticker); ticker = null; } }
  }
  window.FakeWS = FakeWS;
})();
