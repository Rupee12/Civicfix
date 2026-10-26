import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CIVIC_PIN_MOTION } from './pinMotion';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const logo = require('../../assets/civicfix-splash-logo.png') as ImageSourcePropType;

const buildings = [
  { x: 40, y: 355, w: 38, h: 105 },
  { x: 84, y: 326, w: 45, h: 142 },
  { x: 137, y: 372, w: 34, h: 92 },
  { x: 226, y: 348, w: 48, h: 120 },
  { x: 284, y: 318, w: 42, h: 151 },
  { x: 334, y: 367, w: 31, h: 96 },
];

function CinematicArtwork({ progress }: { progress: Animated.Value }) {
  const { width, height } = useWindowDimensions();
  const svgScale = Math.max(width / 393, height / 852);
  const svgOffsetY = (height - 852 * svgScale) / 2;
  const reveal = (start: number, end: number) => progress.interpolate({
    inputRange: [0, start, end, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });
  const buildingOpacity = (index: number) => progress.interpolate({
    inputRange: [0, 0.04 + index * 0.012, 0.17 + index * 0.012, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Svg
        accessibilityLabel="CivicFix city animation"
        accessible
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
        viewBox="0 0 393 852"
      >
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#02090c" />
          <Stop offset="1" stopColor="#063238" />
        </LinearGradient>
        <LinearGradient id="brandGradient" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2dffd0" />
          <Stop offset="0.55" stopColor="#10dca4" />
          <Stop offset="1" stopColor="#2aaaff" />
        </LinearGradient>
        <LinearGradient id="farFacade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#14505c" />
          <Stop offset="1" stopColor="#061d23" />
        </LinearGradient>
        <LinearGradient id="nearLeft" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#153d45" />
          <Stop offset="0.5" stopColor="#061a20" />
        </LinearGradient>
        <LinearGradient id="nearRight" x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#164c52" />
          <Stop offset="0.6" stopColor="#06191e" />
        </LinearGradient>
      </Defs>

      <Rect width="393" height="852" fill="url(#sky)" />
      <Ellipse cx="196" cy="520" rx="190" ry="190" fill="#12dca2" opacity="0.14" />
      <AnimatedG opacity={reveal(0.04, 0.28)}>
        {Array.from({ length: 22 }, (_, index) => (
          <Circle
            key={index}
            cx={(index * 83) % 393}
            cy={72 + ((index * 47) % 230)}
            r={index % 4 === 0 ? 1.2 : 0.6}
            fill="#a2fff0"
            opacity="0.55"
          />
        ))}
      </AnimatedG>

      <AnimatedG opacity={reveal(0.03, 0.3)}>
        <Path
          d="M0 405V320h21v38h14v-82h30v69h22v-115h36v123h20v-78h33v61h25v-97h33v109h19v-63h34v49h19v-94h31v106h26v-72h30v131Z"
          fill="url(#farFacade)"
        />
        {[16, 48, 98, 112, 160, 216, 261, 305, 350, 373].map((x, index) => (
          <Path key={x} d={`M${x} ${285 + (index % 3) * 17}v78`} stroke="#5debd5" strokeWidth="7" strokeDasharray="3 10" opacity="0.3" />
        ))}
        <Path d="M105 230v-42M101 202h8M303 240v-57M298 208h10M214 239v-31" fill="none" stroke="#60bcb5" strokeWidth="1" />
      </AnimatedG>

      <AnimatedG opacity={reveal(0.06, 0.28)}>
        <Ellipse cx="196" cy="584" rx="235" ry="154" fill="#06191e" stroke="#17494b" strokeWidth="2" />
        <Path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" fill="none" stroke="#071316" strokeWidth="54" />
        <Path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444" fill="none" stroke="#284348" strokeWidth="42" />
        <Path d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" fill="none" stroke="#071316" strokeWidth="46" />
        <Path d="M427 650C320 625 299 574 226 554C151 534 129 495 5 470" fill="none" stroke="#1d383e" strokeWidth="34" />
        <Path d="M-20 660C80 642 113 564 192 541C264 520 292 473 421 444M427 650C320 625 299 574 226 554C151 534 129 495 5 470" fill="none" stroke="#b9d5d3" strokeWidth="2" strokeDasharray="10 13" opacity="0.58" />
        {buildings.map(({ x, y, w, h }, index) => (
          <AnimatedG key={x} opacity={buildingOpacity(index)}>
            <Path d={`M${x} ${y}L${x + w / 2} ${y - 12}L${x + w} ${y}L${x + w / 2} ${y + 12}Z`} fill="#173d42" />
            <Path d={`M${x} ${y}L${x + w / 2} ${y + 12}V${y + h}L${x} ${y + h - 12}Z`} fill="#09262c" />
            <Path d={`M${x + w / 2} ${y + 12}L${x + w} ${y}V${y + h - 12}L${x + w / 2} ${y + h}Z`} fill="#0d3036" />
            {Array.from({ length: Math.floor(h / 25) }, (_, row) => [0, 1].map((column) => (
              <AnimatedRect
                key={`${row}-${column}`}
                x={x + 10 + column * 14}
                y={y + 15 + row * 20}
                width="5"
                height="8"
                rx="1"
                fill="#9ffff0"
                opacity={progress.interpolate({
                  inputRange: [0, 0.1 + index * 0.015 + row * 0.01 + column * 0.006, 0.22 + index * 0.015 + row * 0.01 + column * 0.006, 1],
                  outputRange: [0.03, 0.03, 0.75, 0.75],
                  extrapolate: 'clamp',
                })}
              />
            )))}
          </AnimatedG>
        ))}
        <AnimatedG opacity={reveal(0.08, 0.28)}>
          <Path d="M154 449L196 426l42 23-42 23Z" fill="#285159" />
          <Path d="M160 452h72v67h-72z" fill="#10353b" />
          <Path d="M151 514h90v12h-90z" fill="#1c5155" />
          {[170, 188, 207, 225].map((x) => <Rect key={x} x={x} y="466" width="8" height="31" rx="2" fill="#9ffff0" opacity="0.7" />)}
          <Path d="M151 449h90l-45-31Z" fill="#317076" />
          <AnimatedEllipse cx="196" cy="506" rx="20" ry="7" fill="#7bfff0" opacity={reveal(0.33, 0.4)} />
        </AnimatedG>
        <AnimatedG opacity={reveal(0.1, 0.26)}>
          {[38, 72, 312, 348].map((x, index) => (
            <G key={x} transform={`translate(${x} ${530 + (index % 2) * 45})`}>
              <Rect x="-2" width="4" height="16" fill="#6a6250" />
              <Circle cy="-5" r="10" fill="#0d5a4c" />
            </G>
          ))}
          {[35, 117, 275, 354].map((x, index) => (
            <G key={x} transform={`translate(${x} ${605 - (index % 2) * 88})`}>
              <Path d="M0 0v-28h8" stroke="#739091" strokeWidth="2" />
              <Circle cx="9" cy="-28" r="4" fill="#fff4c2" />
            </G>
          ))}
        </AnimatedG>
      </AnimatedG>

      <AnimatedG opacity={reveal(0.14, 0.22)}>
        {[
          { color: '#24ffc2', delay: 0.15, path: 'M-20 660C80 642 113 564 192 541C264 520 292 473 421 444' },
          { color: '#26aaff', delay: 0.2, path: 'M427 650C320 625 299 574 226 554C151 534 129 495 5 470' },
          { color: '#2dffc2', delay: 0.23, path: 'M196 548C170 620 99 663 29 716' },
          { color: '#3ab5ff', delay: 0.26, path: 'M208 546C261 598 322 612 414 628' },
          { color: '#9effe7', delay: 0.29, path: 'M186 538C152 505 104 479 48 457' },
        ].map((signal, index) => (
          <AnimatedPath
            key={index}
            d={signal.path}
            fill="none"
            stroke={signal.color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="18 82"
            strokeDashoffset={progress.interpolate({
              inputRange: [0, signal.delay, signal.delay + 0.17, signal.delay + 0.32, 1],
              outputRange: [102, 102, 55, 0, 0],
              extrapolate: 'clamp',
            })}
            opacity={progress.interpolate({
              inputRange: [0, signal.delay, signal.delay + 0.03, signal.delay + 0.23, signal.delay + 0.32, 1],
              outputRange: [0, 0, 1, 1, 0, 0],
              extrapolate: 'clamp',
            })}
          />
        ))}
        {[{ x: 69, y: 620 }, { x: 310, y: 586 }, { x: 99, y: 481 }].map(({ x, y }, index) => (
          <G key={index} transform={`translate(${x} ${y})`}>
            <Circle r="8" fill="#072f34" stroke="#3effc8" strokeWidth="1.5" />
            <Circle r="2.5" fill="#f9fffe" />
          </G>
        ))}
      </AnimatedG>

      <AnimatedG opacity={reveal(0.34, 0.4)}>
        {[0, 1, 2].map((index) => (
          <AnimatedEllipse
            key={index}
            cx="196"
            cy="471"
            rx={progress.interpolate({
              inputRange: [0.38 + index * 0.035, 0.53 + index * 0.035],
              outputRange: [12, 110],
              extrapolate: 'clamp',
            })}
            ry={progress.interpolate({
              inputRange: [0.38 + index * 0.035, 0.53 + index * 0.035],
              outputRange: [5, 42],
              extrapolate: 'clamp',
            })}
            fill="none"
            stroke="#2dffd0"
            strokeWidth="2"
            opacity={progress.interpolate({
              inputRange: [0.38 + index * 0.035, 0.42 + index * 0.035, 0.53 + index * 0.035],
              outputRange: [0, 0.85, 0],
              extrapolate: 'clamp',
            })}
          />
        ))}
        <Ellipse cx="196" cy="460" rx="28" ry="9" fill="#000000" opacity="0.4" />
      </AnimatedG>

      <AnimatedG opacity={reveal(0.53, 0.68)}>
        {[{ d: 'M48 436C86 308 301 279 348 423C379 518 270 581 165 531', color: 'url(#brandGradient)' }, { d: 'M341 491C294 603 93 577 56 447C25 339 144 282 245 322', color: '#2aaaff' }].map((ribbon, index) => (
          <AnimatedPath
            key={index}
            d={ribbon.d}
            fill="none"
            stroke={ribbon.color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={progress.interpolate({
              inputRange: [0.54 + index * 0.025, 0.7 + index * 0.025],
              outputRange: [100, 0],
              extrapolate: 'clamp',
            })}
          />
        ))}
      </AnimatedG>

      <AnimatedG opacity={reveal(0.66, 0.72)}>
        <Circle cx="196" cy="350" r="82" fill="#19e7b3" opacity="0.16" />
        <SvgImage
          href={logo}
          x="121"
          y="275"
          width="150"
          height="150"
          preserveAspectRatio="xMidYMid meet"
        />
        <AnimatedPath d="M131 398C166 416 226 414 264 382" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity={reveal(0.72, 0.8)} />
      </AnimatedG>

      <AnimatedG opacity={reveal(0.76, 0.84)}>
        <SvgText x="196" y="458" textAnchor="middle" fill="#f5fffd" fontSize="42" fontWeight="700" letterSpacing="-2">
          Civic<TSpan fill="#3df0bd">Fix</TSpan>
        </SvgText>
        <SvgText x="196" y="491" textAnchor="middle" fill="#a4c9c5" fontSize="10" fontWeight="600" letterSpacing="3">
          YOUR CITY. YOUR VOICE.
        </SvgText>
      </AnimatedG>

      <AnimatedG opacity={reveal(0.04, 0.18)}>
        <SvgText x="196" y="105" textAnchor="middle" fill="#68a9a3" fontSize="8" fontWeight="600" letterSpacing="3">
          A BETTER CITY STARTS HERE
        </SvgText>
      </AnimatedG>
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pinMotion,
          {
            left: width / 2 - 35 * svgScale,
            top: svgOffsetY + 422 * svgScale - 50 * svgScale,
            width: 70 * svgScale,
            height: 100 * svgScale,
            opacity: reveal(0.34, 0.4),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [...CIVIC_PIN_MOTION.inputRange],
                  outputRange: CIVIC_PIN_MOTION.translateY.map((value) => value * svgScale),
                  extrapolate: 'clamp',
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [...CIVIC_PIN_MOTION.inputRange],
                  outputRange: [...CIVIC_PIN_MOTION.scale],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="-35 -50 70 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="pinGradient" x1="0" y1="0" x2="0.7" y2="1">
              <Stop offset="0" stopColor="#ffbc62" />
              <Stop offset="0.5" stopColor="#ff7b2d" />
              <Stop offset="1" stopColor="#ca461a" />
            </LinearGradient>
          </Defs>
          <Path d="M0-47c-20 0-35 15-35 34 0 26 35 57 35 57s35-31 35-57C35-32 20-47 0-47Z" fill="url(#pinGradient)" stroke="#ffc274" strokeWidth="1.5" />
          <Circle cy="-14" r="12" fill="#fff9ec" />
          <Circle cy="-14" r="5" fill="#ff8b35" />
        </Svg>
      </Animated.View>
    </>
  );
}

export function CinematicSplash({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [run, setRun] = useState(0);
  const [complete, setComplete] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    }).catch(() => {
      if (active) setReducedMotion(false);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setComplete(false);
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? 150 : 4000,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setComplete(true);
      if (reducedMotion) onComplete();
    });
    const transition = reducedMotion ? undefined : setTimeout(onComplete, 5000);
    return () => {
      animation.stop();
      if (transition) clearTimeout(transition);
    };
  }, [onComplete, progress, reducedMotion, run]);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <CinematicArtwork progress={progress} />
      {complete && !reducedMotion && (
        <View style={[styles.controls, { bottom: Math.max(insets.bottom, 18) + 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Replay CivicFix intro"
            onPress={() => setRun((value) => value + 1)}
            style={styles.control}
          >
            <Text style={styles.controlText}>↻  Replay</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue to CivicFix"
            onPress={onComplete}
            style={[styles.control, styles.continueControl]}
          >
            <Text style={styles.controlText}>Continue</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pinMotion: {
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#02090c',
    zIndex: 10,
    elevation: 10,
  },
  controls: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  control: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderColor: '#6ce1c366',
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: '#061a1de8',
  },
  continueControl: {
    backgroundColor: '#12644f',
    borderColor: '#4be2b4',
  },
  controlText: {
    color: '#d8fff4',
    fontSize: 13,
    fontWeight: '600',
  },
});
