import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '../api/client';
import { getMyIssues } from '../api/issues';
import type { Issue } from '../types/issue';

export function HomeScreen({ onReport, onExplore, onReports, onProfile, onSelect }: { onReport: () => void; onExplore: () => void; onReports: () => void; onProfile: () => void; onSelect: (id: string) => void }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setIssues(await getMyIssues()); } catch (requestError) { setError(apiErrorMessage(requestError)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const active = issues.filter((issue) => !['CLOSED', 'REJECTED'].includes(issue.status)).length;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
    <Text style={styles.kicker}>GOOD EVENING</Text>
    <Text style={styles.title}>Make your neighborhood count.</Text>
    <Text style={styles.copy}>Report what needs attention and follow progress from report to resolution.</Text>
    <Pressable onPress={onReport} style={styles.primary}><Text style={styles.primaryText}>+ Report an issue</Text><Text style={styles.primaryHint}>It takes less than two minutes</Text></Pressable>
    <View style={styles.stats}><View><Text style={styles.statValue}>{issues.length}</Text><Text style={styles.statLabel}>Your reports</Text></View><View><Text style={styles.statValue}>{active}</Text><Text style={styles.statLabel}>Still active</Text></View><View><Text style={styles.statValue}>{issues.filter((issue) => issue.status === 'CLOSED').length}</Text><Text style={styles.statLabel}>Resolved</Text></View></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Find issues nearby</Text><Pressable onPress={onExplore}><Text style={styles.link}>Explore all</Text></Pressable></View>
    <Pressable onPress={onExplore} style={styles.explore}><Text style={styles.exploreIcon}>⌖</Text><View><Text style={styles.exploreTitle}>See what your community is reporting</Text><Text style={styles.exploreCopy}>Browse nearby issues, priorities and community support.</Text></View></Pressable>
    <View style={styles.shortcuts}><Pressable onPress={onReports} style={styles.shortcut}><Text style={styles.shortcutIcon}>▣</Text><Text style={styles.shortcutText}>My reports</Text></Pressable><Pressable onPress={onProfile} style={styles.shortcut}><Text style={styles.shortcutIcon}>○</Text><Text style={styles.shortcutText}>Profile</Text></Pressable></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent activity</Text></View>
    {loading && !issues.length ? <ActivityIndicator color="#28745A" /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {!loading && !error && !issues.length ? <Text style={styles.empty}>Your reports will appear here once you submit one.</Text> : null}
    {issues.slice(0, 3).map((issue) => <Pressable key={issue.id} onPress={() => onSelect(issue.id)} style={styles.issue}><View style={[styles.dot, issue.priorityLevel === 'CRITICAL' && styles.critical]} /><View style={styles.issueCopy}><Text style={styles.issueTitle}>{issue.title}</Text><Text style={styles.issueMeta}>{issue.category.replaceAll('_', ' ')} · {issue.status.replaceAll('_', ' ')}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7F2' }, content: { padding: 22, paddingBottom: 44 }, kicker: { color: '#28745A', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#15352B', fontSize: 31, fontWeight: '800', lineHeight: 37, marginTop: 8 }, copy: { color: '#64736B', fontSize: 15, lineHeight: 23, marginTop: 10 }, primary: { backgroundColor: '#15352B', borderRadius: 16, marginTop: 24, padding: 20 }, primaryText: { color: '#FFF', fontSize: 19, fontWeight: '800' }, primaryHint: { color: '#B7D1C1', fontSize: 13, marginTop: 6 }, stats: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, padding: 18 }, statValue: { color: '#15352B', fontSize: 25, fontWeight: '800', textAlign: 'center' }, statLabel: { color: '#78867E', fontSize: 11, marginTop: 4, textAlign: 'center' }, sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 28 }, sectionTitle: { color: '#15352B', fontSize: 18, fontWeight: '800' }, link: { color: '#28745A', fontSize: 13, fontWeight: '800' }, explore: { alignItems: 'center', backgroundColor: '#E4F1E9', borderRadius: 14, flexDirection: 'row', padding: 16 }, exploreIcon: { color: '#28745A', fontSize: 30, marginRight: 13 }, exploreTitle: { color: '#15352B', fontSize: 15, fontWeight: '800' }, exploreCopy: { color: '#5E7467', fontSize: 12, lineHeight: 18, marginTop: 4 }, shortcuts: { flexDirection: 'row', gap: 10, marginTop: 24 }, shortcut: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, flex: 1, padding: 14 }, shortcutIcon: { color: '#28745A', fontSize: 22 }, shortcutText: { color: '#15352B', fontSize: 13, fontWeight: '800', marginTop: 5 }, issue: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, flexDirection: 'row', marginBottom: 8, padding: 14 }, dot: { backgroundColor: '#28745A', borderRadius: 8, height: 10, marginRight: 12, width: 10 }, critical: { backgroundColor: '#C75E3E' }, issueCopy: { flex: 1 }, issueTitle: { color: '#15352B', fontSize: 14, fontWeight: '800' }, issueMeta: { color: '#78867E', fontSize: 12, marginTop: 4 }, chevron: { color: '#9AA79F', fontSize: 24 }, error: { color: '#B43D35', marginTop: 12 }, empty: { color: '#64736B', paddingVertical: 18 }
});
