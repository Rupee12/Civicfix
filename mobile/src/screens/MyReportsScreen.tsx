import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { apiErrorMessage } from '../api/client';
import { getMyIssues } from '../api/issues';
import type { Issue } from '../types/issue';

export function MyReportsScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [issues, setIssues] = useState<Issue[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setIssues(await getMyIssues()); } catch (requestError) { setError(apiErrorMessage(requestError)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}><Text style={styles.kicker}>YOUR ACTIVITY</Text><Text style={styles.heading}>My reports</Text><Text style={styles.copy}>Keep track of every issue you have raised.</Text>{loading && !issues.length ? <ActivityIndicator color="#28745A" /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}{!loading && !error && !issues.length ? <Text style={styles.empty}>You have not reported anything yet.</Text> : null}{issues.map((issue) => <Pressable key={issue.id} onPress={() => onSelect(issue.id)} style={styles.card}><Text style={styles.category}>{issue.category.replaceAll('_', ' ')}</Text><Text style={styles.title}>{issue.title}</Text><Text style={styles.meta}>{issue.status.replaceAll('_', ' ')} · {issue.reportCount} reports · {issue.supportCount} supports</Text></Pressable>)}</ScrollView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#F5F7F2', flex: 1 }, content: { padding: 22, paddingBottom: 44 }, kicker: { color: '#28745A', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }, heading: { color: '#15352B', fontSize: 30, fontWeight: '800', marginTop: 6 }, copy: { color: '#64736B', marginBottom: 20, marginTop: 8 }, card: { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10, padding: 16 }, category: { color: '#28745A', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { color: '#15352B', fontSize: 17, fontWeight: '800', marginTop: 8 }, meta: { color: '#78867E', fontSize: 12, marginTop: 8 }, error: { color: '#B43D35', marginTop: 12 }, empty: { color: '#64736B', paddingVertical: 24, textAlign: 'center' } });
