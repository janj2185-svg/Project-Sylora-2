import React from 'react';
import { Image, type ImageStyle, type StyleProp, View } from 'react-native';

const canonicalLogo = require('../../../../public/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png');

export function BrandLogo({ width = 210, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  const height = width * 650 / 1100;
  return (
    <View style={{ width, height, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        accessibilityLabel="SYLORA — YOUR AI. YOUR WORLD. YOUR LEGACY."
        source={canonicalLogo}
        resizeMode="contain"
        style={[{ width, height }, style]}
      />
    </View>
  );
}
