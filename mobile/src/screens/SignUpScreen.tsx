import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiErrorMessage, register } from '../api/client';

export function SignUpScreen({ onRegistered, onBack }: { onRegistered: () => void; onBack: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true); setError('');
    try { await register(name, email, password); onRegistered(); } catch (requestError) { setError(apiErrorMessage(requestError)); } finally { setLoading(false); }
  }
  return <View style={styles.screen}><Text style={styles.kicker}>JOIN CIVICFIX</Text><Text style={styles.title}>Create your citizen account.</Text><TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} /><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} /><TextInput secureTextEntry placeholder="Password (8+ characters)" value={password} onChangeText={setPassword} style={styles.input} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={() => void submit()} disabled={loading} style={styles.primary}><Text style={styles.primaryText}>{loading ? 'Creating...' : 'Create account'}</Text></Pressable><Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>Already have an account? Sign in</Text></Pressable></View>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#F5F7F2', flex: 1, justifyContent: 'center', padding: 28 }, kicker: { color: '#28745A', fontWeight: '800', letterSpacing: 1.6 }, title: { color: '#15352B', fontSize: 31, fontWeight: '800', lineHeight: 38, marginVertical: 18 }, input: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 12, borderWidth: 1, fontSize: 16, marginTop: 12, padding: 15 }, primary: { alignItems: 'center', backgroundColor: '#E9774C', borderRadius: 12, marginTop: 18, padding: 16 }, primaryText: { color: '#FFF', fontWeight: '800' }, error: { color: '#B43D35', marginTop: 12 }, back: { marginTop: 18, padding: 10 }, backText: { color: '#28745A', fontWeight: '700', textAlign: 'center' } });
