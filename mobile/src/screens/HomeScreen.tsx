import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '../api/client';
import { getMyIssues } from '../api/issues';
import type { Issue } from '../types/issue';
import { colors, elevations } from '../theme';

export function HomeScreen({ onReport, onExplore, onReports, onProfile, onNotifications, onSelect }: { onReport: () => void; onExplore: () => void; onReports: () => void; onProfile: () => void; onNotifications: () => void; onSelect: (id: string) => void }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setIssues(await getMyIssues()); } catch (requestError) { setError(apiErrorMessage(requestError)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const { active, resolved } = useMemo(() => issues.reduce((counts, issue) => {
    if (!['CLOSED', 'REJECTED'].includes(issue.status)) counts.active += 1;
    if (issue.status === 'CLOSED') counts.resolved += 1;
    return counts;
  }, { active: 0, resolved: 0 }), [issues]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
    <View style={styles.homeHeader}><View><Text style={styles.kicker}>CIVICFIX COMMUNITY</Text><Text style={styles.headerTitle}>Your city, your voice.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={onNotifications} style={styles.notificationButton}><Text style={styles.notificationIcon}>🔔</Text></Pressable></View>
    <Text style={styles.kicker}>GOOD EVENING</Text>
    <Text style={styles.title}>Make your neighborhood count.</Text>
    <Text style={styles.copy}>Report what needs attention and follow progress from report to resolution.</Text>
    <Pressable onPress={onReport} style={styles.primary}><Text style={styles.primaryText}>+ Report an issue</Text><Text style={styles.primaryHint}>It takes less than two minutes</Text></Pressable>
    <View style={styles.stats}><View><Text style={styles.statValue}>{issues.length}</Text><Text style={styles.statLabel}>Your reports</Text></View><View><Text style={styles.statValue}>{active}</Text><Text style={styles.statLabel}>Still active</Text></View><View><Text style={styles.statValue}>{resolved}</Text><Text style={styles.statLabel}>Resolved</Text></View></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Find issues nearby</Text><Pressable onPress={onExplore}><Text style={styles.link}>Explore all</Text></Pressable></View>
    <Pressable onPress={onExplore} style={styles.explore}><Text style={styles.exploreIcon}>⌖</Text><View><Text style={styles.exploreTitle}>See what your community is reporting</Text><Text style={styles.exploreCopy}>Browse nearby issues, priorities and community support.</Text></View></Pressable>
    <View style={styles.shortcuts}><Pressable onPress={onReports} style={styles.shortcut}><Text style={styles.shortcutIcon}>▣</Text><Text style={styles.shortcutText}>My reports</Text></Pressable><Pressable onPress={onProfile} style={styles.shortcut}><Text style={styles.shortcutIcon}>○</Text><Text style={styles.shortcutText}>Profile</Text></Pressable></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent activity</Text></View>
    {loading && !issues.length ? <ActivityIndicator color={colors.blue} /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {!loading && !error && !issues.length ? <Text style={styles.empty}>Your reports will appear here once you submit one.</Text> : null}
    {issues.slice(0, 3).map((issue) => <Pressable key={issue.id} onPress={() => onSelect(issue.id)} style={styles.issue}><View style={[styles.dot, issue.priorityLevel === 'CRITICAL' && styles.critical]} /><View style={styles.issueCopy}><Text style={styles.issueTitle}>{issue.title}</Text><Text style={styles.issueMeta}>{issue.category.replaceAll('_', ' ')} · {issue.status.replaceAll('_', ' ')}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 44 },
  kicker: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  homeHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { color: colors.navy, fontSize: 15, fontWeight: '800', marginTop: 3 },
  notificationButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  notificationIcon: { color: colors.navy, fontSize: 22 },
  title: { color: colors.navy, fontSize: 31, fontWeight: '800', lineHeight: 37, marginTop: 8 },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 10 },
  primary: { backgroundColor: colors.blue, borderRadius: 20, marginTop: 24, padding: 20, ...elevations.card },
  primaryText: { color: colors.surface, fontSize: 19, fontWeight: '800' },
  primaryHint: { color: '#D6E0FF', fontSize: 13, marginTop: 6 },
  stats: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, padding: 18, ...elevations.card },
  statValue: { color: colors.navy, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 28 },
  sectionTitle: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  link: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  explore: { alignItems: 'center', backgroundColor: colors.blueTint, borderRadius: 17, flexDirection: 'row', padding: 16 },
  exploreIcon: { color: colors.blue, fontSize: 30, marginRight: 13 },
  exploreTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  exploreCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  shortcuts: { flexDirection: 'row', gap: 10, marginTop: 24 },
  shortcut: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flex: 1, padding: 14 },
  shortcutIcon: { color: colors.blue, fontSize: 22 },
  shortcutText: { color: colors.navy, fontSize: 13, fontWeight: '800', marginTop: 5 },
  issue: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 8, padding: 14 },
  dot: { backgroundColor: colors.blue, borderRadius: 8, height: 10, marginRight: 12, width: 10 },
  critical: { backgroundColor: colors.danger },
  issueCopy: { flex: 1 },
  issueTitle: { color: colors.navy, fontSize: 14, fontWeight: '800' },
  issueMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  chevron: { color: colors.muted, fontSize: 24 },
  error: { color: colors.danger, marginTop: 12 },
  empty: { color: colors.muted, paddingVertical: 18 }
});
