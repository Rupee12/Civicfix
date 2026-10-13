import { Pressable, StyleSheet, Text, View } from 'react-native';

export function WelcomeScreen({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return <View style={styles.screen}>
    <Text style={styles.kicker}>CIVICFIX</Text>
    <Text style={styles.title}>Make your neighborhood count.</Text>
    <Text style={styles.copy}>Report problems, follow progress and help your community get things fixed.</Text>
    <Pressable onPress={onSignIn} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable>
    <Pressable onPress={onSignUp} style={styles.secondary}><Text style={styles.secondaryText}>Create an account</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F7F2', flex: 1, justifyContent: 'center', padding: 28 },
  kicker: { color: '#28745A', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#15352B', fontSize: 38, fontWeight: '800', lineHeight: 44, marginTop: 14 },
  copy: { color: '#5D6C65', fontSize: 16, lineHeight: 24, marginVertical: 22 },
  primary: { alignItems: 'center', backgroundColor: '#15352B', borderRadius: 12, padding: 16 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', borderColor: '#28745A', borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 15 },
  secondaryText: { color: '#28745A', fontSize: 16, fontWeight: '800' },
});
