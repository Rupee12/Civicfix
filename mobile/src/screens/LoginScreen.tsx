import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiErrorMessage } from '../api/client';
import { login } from '../api/issues';
import { colors } from '../theme';

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (token: string, role: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try { const session = await login(email, password); await onLoggedIn(session.token, session.user.role); }
    catch (requestError) { setError(apiErrorMessage(requestError)); }
    finally { setLoading(false); }
  }

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.container} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.kicker}>WELCOME BACK</Text>
    <Text style={styles.title}>Make your neighborhood count.</Text>
    <Text style={styles.copy}>Sign in to report an issue and follow it from the street to resolution.</Text>
    <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
    <TextInput secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable onPress={() => void submit()} disabled={loading} style={styles.button}><Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  kicker: { color: colors.blue, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.navy, fontSize: 34, fontWeight: '800', marginTop: 12 },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24, marginVertical: 18 },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 15, borderWidth: 1, marginTop: 12, padding: 15, fontSize: 16 },
  button: { backgroundColor: colors.blue, borderRadius: 16, marginTop: 18, padding: 16, alignItems: 'center', elevation: 3 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  error: { color: colors.danger, marginTop: 12 },
});