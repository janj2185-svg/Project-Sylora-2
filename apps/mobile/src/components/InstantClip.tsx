import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api } from '../api';
import type { VideoItem } from '../types';
import { colors, radii } from '../theme';

function mediaUrl(video?: VideoItem) {
  const path = video?.stream?.playlistUrl || video?.media?.url;
  return path ? (path.startsWith('http') ? path : api.url(path)) : null;
}

export function InstantClip({ video, nextVideo }: { video: VideoItem; nextVideo?: VideoItem }) {
  const source = mediaUrl(video);
  const nextSource = mediaUrl(nextVideo);
  const player = useVideoPlayer(source, instance => { instance.loop = true; instance.muted = true; instance.play(); });
  useVideoPlayer(nextSource, instance => { instance.muted = true; instance.pause(); });
  return (
    <View style={styles.shell}>
      {source ? <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} surfaceType="textureView" /> : <View style={styles.placeholder}><Text style={styles.star}>✦</Text></View>}
      <View style={styles.scrim} />
      <View style={styles.copy}><Text style={styles.title}>{video.title}</Text><Text style={styles.meta}>@{video.author?.username || 'sylora'} · наступне відео вже готується</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { height: 360, borderRadius: radii.large, overflow: 'hidden', backgroundColor: colors.void },
  video: { position: 'absolute', inset: 0 },
  placeholder: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D1A25' },
  star: { fontSize: 70, color: colors.champagneSoft },
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(7,6,10,0.12)' },
  copy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  title: { color: '#FFF', fontSize: 25, fontWeight: '800' },
  meta: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 5 }
});
