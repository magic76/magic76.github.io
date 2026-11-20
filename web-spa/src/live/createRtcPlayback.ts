export type RtcPlayback = {
  destination: MediaStreamAudioDestinationNode;
  ready: Promise<void>;
  close(): void;
};

export function createRtcPlayback(context: AudioContext, onLost: () => void): RtcPlayback {
  const destination = context.createMediaStreamDestination();
  const track = destination.stream.getAudioTracks()[0];
  const player = new Audio();
  const peers: RTCPeerConnection[] = [];
  let closed = false;
  let timeout: ReturnType<typeof setTimeout>;
  let cancel: () => void;

  let started = false;
  const ready = new Promise<void>((resolve, reject) => {
    cancel = () => reject(new Error("Local audio playback closed"));
    timeout = setTimeout(() => reject(new Error("Local audio playback timed out")), 1200);

    const config: RTCConfiguration = { iceServers: [] };
    const sender = new RTCPeerConnection(config);
    peers.push(sender);
    const receiver = new RTCPeerConnection(config);
    peers.push(receiver);

    // The sender's only input is AI playback. Neither peer uses a signaling server.
    sender.addTrack(track, destination.stream);
    const toSender: RTCIceCandidate[] = [];
    const toReceiver: RTCIceCandidate[] = [];
    const relay = (peer: RTCPeerConnection, pending: RTCIceCandidate[], candidate: RTCIceCandidate | null) => {
      if (!candidate || closed) return;
      if (peer.remoteDescription) void peer.addIceCandidate(candidate).catch(reject);
      else pending.push(candidate);
    };
    sender.onicecandidate = event => relay(receiver, toReceiver, event.candidate);
    receiver.onicecandidate = event => relay(sender, toSender, event.candidate);
    receiver.ontrack = event => {
      if (closed) return;
      player.srcObject = new MediaStream([event.track]);
      player.autoplay = true;
      player.hidden = true;
      document.body.appendChild(player);
      void player.play().then(() => {
        if (closed) return;
        started = true;
        clearTimeout(timeout);
        resolve();
      }, reject);
    };
    receiver.onconnectionstatechange = () => {
      if (closed || receiver.connectionState !== "failed") return;
      if (started) onLost();
      else reject(new Error("Local audio connection failed"));
    };

    void (async () => {
      await sender.setLocalDescription(await sender.createOffer());
      await receiver.setRemoteDescription(sender.localDescription!);
      await Promise.all(toReceiver.splice(0).map(candidate => receiver.addIceCandidate(candidate)));
      await receiver.setLocalDescription(await receiver.createAnswer());
      await sender.setRemoteDescription(receiver.localDescription!);
      await Promise.all(toSender.splice(0).map(candidate => sender.addIceCandidate(candidate)));
    })().catch(reject);
  });

  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    cancel();
    player.pause();
    player.srcObject = null;
    player.remove();
    track.stop();
    for (const peer of peers) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
  }

  return { destination, ready, close };
}
