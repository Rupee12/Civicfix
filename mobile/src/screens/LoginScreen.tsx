import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiErrorMessage } from '../api/client';
import { login, register } from '../api/issues';

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (token: string, role: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      if (registering) {
        await register(name, email, password);
      }
      const session = await login(email, password);
      await onLoggedIn(session.token, session.user.role);
    }
    catch (requestError) { setError(apiErrorMessage(requestError)); }
    finally { setLoading(false); }
  }

  return <View style={styles.container}>
    <Text style={styles.kicker}>CIVICFIX</Text>
    <Text style={styles.title}>{registering ? 'Create your account.' : 'Make your neighborhood count.'}</Text>
    <Text style={styles.copy}>{registering ? 'Join CivicFix to report issues and help verify completed work.' : 'Sign in to report an issue and follow it from the street to resolution.'}</Text>
    {registering ? <TextInput autoCapitalize="words" placeholder="Full name" value={name} onChangeText={setName} style={styles.input} /> : null}
    <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
    <TextInput secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable onPress={() => void submit()} disabled={loading} style={styles.button}><Text style={styles.buttonText}>{loading ? 'Please wait...' : registering ? 'Create account' : 'Sign in'}</Text></Pressable>
    <Pressable onPress={() => { setRegistering((value) => !value); setError(''); }} disabled={loading} style={styles.secondary}><Text style={styles.secondaryText}>{registering ? 'Already have an account? Sign in' : 'New to CivicFix? Create an account'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#F5F7F2' },
  kicker: { color: '#28745A', fontWeight: '800', letterSpacing: 2 },
  title: { color: '#15352B', fontSize: 36, fontWeight: '800', marginTop: 12 },
  copy: { color: '#5D6C65', fontSize: 16, lineHeight: 24, marginVertical: 18 },
  input: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 15, fontSize: 16 },
  button: { backgroundColor: '#E9774C', borderRadius: 12, marginTop: 18, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  error: { color: '#B43D35', marginTop: 12 },
  secondary: { alignItems: 'center', marginTop: 18, padding: 8 },
  secondaryText: { color: '#28745A', fontWeight: '800' },
});
