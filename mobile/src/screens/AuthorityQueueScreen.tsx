import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { apiErrorMessage } from '../api/client';
import { getAuthorityIssues, updateIssueStatus } from '../api/issues';
import type { Issue } from '../types/issue';

export function AuthorityQueueScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setIssues(await getAuthorityIssues()); }
    catch (requestError) { setError(apiErrorMessage(requestError)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function start(issue: Issue) {
    try { const updated = await updateIssueStatus(issue.id, 'IN_PROGRESS'); setIssues((current) => current.map((item) => item.id === updated.id ? updated : item)); }
    catch (requestError) { Alert.alert('Could not update status', apiErrorMessage(requestError)); }
  }

  return <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
    <Text style={styles.eyebrow}>AUTHORITY QUEUE</Text><Text style={styles.heading}>Assigned work</Text>
    {loading && !issues.length ? <ActivityIndicator color="#28745A" /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {issues.map((issue) => <Pressable key={issue.id} onPress={() => onSelect(issue.id)} style={styles.card}><Text style={styles.level}>{issue.priorityLevel} · {issue.priorityScore}</Text><Text style={styles.title}>{issue.title}</Text><Text style={styles.meta}>{issue.reportCount} reports · {issue.supportCount} supports · {issue.status}</Text>{issue.status === 'ASSIGNED' ? <Pressable onPress={() => void start(issue)} style={styles.start}><Text style={styles.startText}>Start work</Text></Pressable> : null}</Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: '#F5F7F2', flex: 1, padding: 22 }, eyebrow: { color: '#28745A', fontSize: 12, fontWeight: '800', letterSpacing: 1.3 }, heading: { color: '#15352B', fontSize: 30, fontWeight: '800', marginBottom: 20, marginTop: 8 }, card: { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 12, padding: 16 }, level: { color: '#B85633', fontSize: 12, fontWeight: '800' }, title: { color: '#15352B', fontSize: 18, fontWeight: '800', marginTop: 8 }, meta: { color: '#64736B', marginTop: 8 }, start: { backgroundColor: '#28745A', borderRadius: 9, marginTop: 14, padding: 12 }, startText: { color: '#FFF', fontWeight: '800', textAlign: 'center' }, error: { color: '#B43D35', marginBottom: 12 } });
