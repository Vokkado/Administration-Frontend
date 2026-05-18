import React from 'react';
import { ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ColorPalette } from '@/theme/colors';

type Props = {
  size: number; // width in pixels
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
};

function ScannerIcon({ size, color = ColorPalette.friendlyWhite, strokeWidth = 5, style }: Props) {
  // Keep the original width, but make the height half of the width
  const width = size;
  const height = Math.max(1, Math.floor(size * 0.5));

  const half = strokeWidth / 2;
  // Corner length based on width so corners look proportional
  const cornerLen = Math.max(10, Math.floor(width * 0.1));
  // Radius for the rounded corner curve based on width
  const cornerRadius = Math.max(6, Math.floor(width * 0.04));

  const left = half;
  const top = half;
  const right = width - half;
  const bottom = height - half;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
      {/* Top-left curved corner */}
      <Path
        d={`M ${left} ${top + cornerLen} L ${left} ${top + Math.max(cornerRadius, 1)} Q ${left} ${top} ${left + Math.max(cornerRadius, 1)} ${top} L ${left + cornerLen} ${top}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top-right curved corner */}
      <Path
        d={`M ${right - cornerLen} ${top} L ${right - Math.max(cornerRadius, 1)} ${top} Q ${right} ${top} ${right} ${top + Math.max(cornerRadius, 1)} L ${right} ${top + cornerLen}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-left curved corner */}
      <Path
        d={`M ${left} ${bottom - cornerLen} L ${left} ${bottom - Math.max(cornerRadius, 1)} Q ${left} ${bottom} ${left + Math.max(cornerRadius, 1)} ${bottom} L ${left + cornerLen} ${bottom}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-right curved corner */}
      <Path
        d={`M ${right - cornerLen} ${bottom} L ${right - Math.max(cornerRadius, 1)} ${bottom} Q ${right} ${bottom} ${right} ${bottom - Math.max(cornerRadius, 1)} L ${right} ${bottom - cornerLen}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default React.memo(ScannerIcon);
