/**
 * Sinal sonoro curto para notificação no desktop (sem arquivo de áudio).
 * Respeita autoplay: pode falhar até haver interação do usuário no Chrome.
 */
export function playNotificationChime(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99];
    let t = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + 0.3);
      t += 0.09;
    });

    void ctx.resume().catch(() => {});
    window.setTimeout(() => {
      try {
        ctx.close();
      } catch {
        /* */
      }
    }, 900);
  } catch {
    /* */
  }
}
