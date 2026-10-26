import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function WelcomeScreen({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return <View style={styles.screen}>
    <View style={styles.brand}><Image source={require('../../assets/civicfix-splash-logo.png')} style={styles.logo} /><Text style={styles.kicker}>CIVICFIX</Text></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>BETTER CITIES START HERE</Text><Text style={styles.title}>Make your neighborhood count.</Text><Text style={styles.copy}>Report problems, follow progress and help your community get things fixed.</Text></View>
    <Pressable onPress={onSignIn} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable>
    <Pressable onPress={onSignUp} style={styles.secondary}><Text style={styles.secondaryText}>Create an account</Text></Pressable>
    <Text style={styles.footnote}>Your city. Your voice.</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 26 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 42 },
  logo: { height: 38, width: 38 },
  kicker: { color: colors.navy, fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  hero: { backgroundColor: colors.navy, borderRadius: 28, marginBottom: 26, overflow: 'hidden', padding: 24 },
  eyebrow: { color: '#9FB4FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.surface, fontSize: 36, fontWeight: '800', lineHeight: 43, marginTop: 12 },
  copy: { color: '#C5D0E8', fontSize: 15, lineHeight: 23, marginTop: 14 },
  primary: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: 16, elevation: 4, padding: 17 },
  primaryText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 16 },
  secondaryText: { color: colors.blue, fontSize: 16, fontWeight: '800' },
  footnote: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 24, textAlign: 'center' },
});
