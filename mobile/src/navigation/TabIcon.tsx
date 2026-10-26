import { Circle, Path, Rect, Svg } from 'react-native-svg';

export type TabIconName = 'home' | 'map' | 'report' | 'reports' | 'profile';

export function TabIcon({ color, name, size }: { color: string; name: TabIconName; size: number }) {
  const common = {
    fill: 'none' as const,
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {name === 'home' ? (
        <Path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" {...common} />
      ) : name === 'map' ? (
        <>
          <Path d="m3 6.5 5-2.5 8 2.5L21 4v13.5L16 20l-8-2.5L3 20z" {...common} />
          <Path d="M8 4v13.5M16 6.5V20" {...common} />
        </>
      ) : name === 'report' ? (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M12 8v8M8 12h8" {...common} />
        </>
      ) : name === 'reports' ? (
        <>
          <Rect x="5" y="5" width="14" height="17" rx="2" {...common} />
          <Path d="M9 5.5V4h6v1.5M9 11h6M9 15h6M9 19h3" {...common} />
        </>
      ) : (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4 21c.7-4.1 3.6-6 8-6s7.3 1.9 8 6" {...common} />
        </>
      )}
    </Svg>
  );
}
