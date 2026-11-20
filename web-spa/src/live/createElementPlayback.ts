export type PlaybackRoute = {
  destination: MediaStreamAudioDestinationNode;
  ready: Promise<void>;
  close(): void;
};

export function createElementPlayback(context: AudioContext, onLost: () => void): PlaybackRoute {
  const destination = context.createMediaStreamDestination();
  const player = new Audio();
  player.autoplay = true;
  player.hidden = true;
  player.srcObject = destination.stream;
  document.body.appendChild(player);

  let cancel!: () => void;
  let timeout: ReturnType<typeof setTimeout>;
  let started = false;
  let closed = false;
  const ready = new Promise<void>((resolve, reject) => {
    cancel = () => reject(new Error("Element playback closed"));
    timeout = setTimeout(() => reject(new Error("Element playback timed out")), 1200);
    player.onerror = () => {
      if (started) onLost();
      else reject(new Error("Element playback failed"));
    };
    void player.play().then(() => {
      if (closed) return;
      started = true;
      clearTimeout(timeout);
      resolve();
    }, reject);
  });

  return {
    destination,
    ready,
    close() {
      if (closed) return;
      closed = true;
      clearTimeout(timeout);
      cancel();
      player.onerror = null;
      player.pause();
      player.srcObject = null;
      player.remove();
      for (const track of destination.stream.getTracks()) track.stop();
    },
  };
}
