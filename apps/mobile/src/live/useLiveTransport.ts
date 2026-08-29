import { useCallback, useEffect, useRef, useState } from 'react';
import EventSource from 'react-native-sse';
import {
  MediaStream,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices
} from 'react-native-webrtc';
import { api } from '../api';
import type { ExternalLiveEvent } from '../types';

type RtcConfig = { iceServers: Array<Record<string, unknown>>; turnConfigured: boolean; readiness: string };
type Signal = { kind: string; fromPeerId: string; toPeerId?: string | null; data?: any };
type HostPeer = { pc: RTCPeerConnection; pending: RTCIceCandidate[] };

function peerId(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`; }

async function sendSignal(liveId: string, kind: string, fromPeerId: string, toPeerId: string | null, data: unknown) {
  return api.post(`/api/live/${encodeURIComponent(liveId)}/signal`, { kind, fromPeerId, toPeerId, data });
}

export function useHostBroadcast(liveId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'live' | 'reconnecting' | 'error'>('idle');
  const [peerCount, setPeerCount] = useState(0);
  const hostId = useRef(peerId('host'));
  const peers = useRef(new Map<string, HostPeer>());
  const source = useRef<EventSource<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rtc = useRef<RtcConfig | null>(null);

  const closePeers = useCallback(() => {
    for (const entry of peers.current.values()) entry.pc.close();
    peers.current.clear();
    setPeerCount(0);
  }, []);

  const stop = useCallback(() => {
    source.current?.removeAllEventListeners();
    source.current?.close();
    source.current = null;
    closePeers();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setLocalStream(null);
    setStatus('idle');
  }, [closePeers]);

  useEffect(() => stop, [stop]);

  const createViewerPeer = useCallback(async (viewerId: string) => {
    if (peers.current.has(viewerId) || !streamRef.current || !rtc.current) return;
    const pc = new RTCPeerConnection({ iceServers: rtc.current.iceServers } as any);
    const entry: HostPeer = { pc, pending: [] };
    peers.current.set(viewerId, entry);
    setPeerCount(peers.current.size);
    for (const track of streamRef.current.getTracks()) pc.addTrack(track, streamRef.current);
    pc.onicecandidate = (event: any) => {
      if (event.candidate) sendSignal(liveId, 'ice', hostId.current, viewerId, event.candidate.toJSON()).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) {
        pc.close(); peers.current.delete(viewerId); setPeerCount(peers.current.size);
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal(liveId, 'offer', hostId.current, viewerId, pc.localDescription);
  }, [liveId]);

  const onSignal = useCallback(async (signal: Signal) => {
    if (signal.kind === 'viewer-ready') return createViewerPeer(signal.fromPeerId);
    if (signal.kind === 'viewer-left') {
      peers.current.get(signal.fromPeerId)?.pc.close(); peers.current.delete(signal.fromPeerId); setPeerCount(peers.current.size); return;
    }
    if (signal.toPeerId !== hostId.current) return;
    const entry = peers.current.get(signal.fromPeerId);
    if (!entry) return;
    if (signal.kind === 'answer') {
      await entry.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
      for (const candidate of entry.pending.splice(0)) await entry.pc.addIceCandidate(candidate).catch(() => {});
    } else if (signal.kind === 'ice') {
      const candidate = new RTCIceCandidate(signal.data);
      if (entry.pc.remoteDescription) await entry.pc.addIceCandidate(candidate).catch(() => {});
      else entry.pending.push(candidate);
    }
  }, [createViewerPeer]);

  const start = useCallback(async (onExternal?: (event: ExternalLiveEvent) => void) => {
    if (streamRef.current) return;
    setStatus('starting');
    try {
      rtc.current = await api.request<RtcConfig>('/api/live/rtc-config');
      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30 } }
      } as any);
      streamRef.current = stream;
      setLocalStream(stream);
      const token = await api.getToken();
      const es = new EventSource<any>(api.url(`/api/live/${encodeURIComponent(liveId)}/events?control=host`), {
        headers: { Authorization: `Bearer ${token}` }, pollingInterval: 2_000
      } as any);
      source.current = es;
      es.addEventListener('open', () => setStatus('live'));
      es.addEventListener('error', () => setStatus('reconnecting'));
      es.addEventListener('signal', (event: any) => { if (event.data) onSignal(JSON.parse(event.data)).catch(() => setStatus('error')); });
      es.addEventListener('external', (event: any) => { if (event.data) onExternal?.(JSON.parse(event.data)); });
      await sendSignal(liveId, 'host-ready', hostId.current, null, { transport: 'native-webrtc', peerLimit: 8 });
    } catch (error) {
      stop(); setStatus('error'); throw error;
    }
  }, [liveId, onSignal, stop]);

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return false; track.enabled = !track.enabled; return !track.enabled;
  }, []);
  const switchCamera = useCallback(() => { (streamRef.current?.getVideoTracks()[0] as any)?._switchCamera?.(); }, []);

  return { localStream, status, peerCount, start, stop, toggleMute, switchCamera };
}

export function useViewerTransport(liveId: string) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('waiting');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const source = useRef<EventSource<any> | null>(null);
  const announceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewerId = useRef(peerId('viewer'));
  const hostId = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (hostId.current) sendSignal(liveId, 'viewer-left', viewerId.current, hostId.current, {}).catch(() => {});
    if (announceTimer.current) clearInterval(announceTimer.current); announceTimer.current = null;
    source.current?.removeAllEventListeners(); source.current?.close(); source.current = null;
    pcRef.current?.close(); pcRef.current = null; setRemoteStream(null); setStatus('closed');
  }, [liveId]);
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (pcRef.current) return;
    const rtc = await api.request<RtcConfig>('/api/live/rtc-config');
    const pc = new RTCPeerConnection({ iceServers: rtc.iceServers } as any); pcRef.current = pc;
    pc.ontrack = (event: any) => { setRemoteStream(event.streams?.[0] || new MediaStream([event.track])); setStatus('live'); };
    pc.onicecandidate = (event: any) => { if (event.candidate && hostId.current) sendSignal(liveId, 'ice', viewerId.current, hostId.current, event.candidate.toJSON()).catch(() => {}); };
    const token = await api.getToken();
    const es = new EventSource<any>(api.url(`/api/live/${encodeURIComponent(liveId)}/events`), { headers: { Authorization: `Bearer ${token}` }, pollingInterval: 2_000 } as any);
    source.current = es;
    es.addEventListener('signal', async (event: any) => {
      if (!event.data) return; const signal = JSON.parse(event.data) as Signal;
      if (signal.toPeerId !== viewerId.current) return;
      if (signal.kind === 'offer') {
        hostId.current = signal.fromPeerId;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        await sendSignal(liveId, 'answer', viewerId.current, hostId.current, pc.localDescription);
      } else if (signal.kind === 'ice') await pc.addIceCandidate(new RTCIceCandidate(signal.data)).catch(() => {});
      else if (signal.kind === 'viewer-rejected') setStatus('limited');
    });
    const announce = () => { if (!pc.remoteDescription) sendSignal(liveId, 'viewer-ready', viewerId.current, null, {}).catch(() => {}); };
    announce(); announceTimer.current = setInterval(announce, 2_000); es.addEventListener('close', () => { if (announceTimer.current) clearInterval(announceTimer.current); announceTimer.current = null; });
    setStatus('connecting');
  }, [liveId]);

  return { remoteStream, status, start, stop };
}
