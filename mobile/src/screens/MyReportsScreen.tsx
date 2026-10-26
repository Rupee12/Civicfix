import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { apiErrorMessage } from '../api/client';
import { getMyIssues } from '../api/issues';
import type { Issue } from '../types/issue';
import { colors, elevations } from '../theme';

type ReportFilter = 'All' | 'Open' | 'In progress' | 'Resolved';
const REPORT_FILTERS: ReportFilter[] = ['All', 'Open', 'In progress', 'Resolved'];

export function MyReportsScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('All');
  const mountedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextIssues = await getMyIssues();
      if (mountedRef.current) setIssues(nextIssues);
    } catch (requestError) {
      if (mountedRef.current) setError(apiErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const filteredIssues = useMemo(() => issues.filter((issue) => {
    if (filter === 'All') return true;
    if (filter === 'Open') return !['IN_PROGRESS', 'RESOLVED', 'VERIFICATION_PENDING', 'CLOSED', 'REJECTED'].includes(issue.status);
    if (filter === 'In progress') return issue.status === 'IN_PROGRESS';
    return ['RESOLVED', 'VERIFICATION_PENDING', 'CLOSED'].includes(issue.status);
  }), [filter, issues]);
  const resolvedCount = useMemo(
    () => issues.filter((issue) => ['RESOLVED', 'VERIFICATION_PENDING', 'CLOSED'].includes(issue.status)).length,
    [issues],
  );
  const renderIssue = useCallback(({ item: issue }: ListRenderItemInfo<Issue>) => (
    <Pressable onPress={() => onSelect(issue.id)} style={styles.card}>
      <Text style={styles.category}>{issue.category.replaceAll('_', ' ')}</Text>
      <Text style={styles.title}>{issue.title}</Text>
      <Text style={styles.meta}>{issue.status.replaceAll('_', ' ')} · {issue.reportCount} reports · {issue.supportCount} supports</Text>
    </Pressable>
  ), [onSelect]);

  const listHeader = <>
    <Text style={styles.kicker}>YOUR ACTIVITY</Text>
    <Text style={styles.heading}>My complaints</Text>
    <Text style={styles.copy}>Keep track of every issue you have raised.</Text>
    <View style={styles.summary}>
      <View><Text style={styles.summaryLabel}>Issues reported</Text><Text style={styles.summaryValue}>{issues.length}</Text></View>
      <View style={styles.summaryDivider} />
      <View><Text style={styles.summaryLabel}>Resolved</Text><Text style={styles.summaryValue}>{resolvedCount}</Text></View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {REPORT_FILTERS.map((item) => (
        <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
          <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
    {loading && !issues.length ? <ActivityIndicator color={colors.blue} style={styles.loading} /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </>;

  return (
    <FlatList<Issue>
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={filteredIssues}
      keyExtractor={(issue) => issue.id}
      renderItem={renderIssue}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={!loading && !error ? (
        <Text style={styles.empty}>
          {issues.length ? `No ${filter.toLowerCase()} complaints.` : 'You have not reported anything yet.'}
        </Text>
      ) : null}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.blue} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 22, paddingBottom: 44 },
  kicker: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  heading: { color: colors.navy, fontSize: 29, fontWeight: '800', marginTop: 6 },
  copy: { color: colors.muted, marginBottom: 18, marginTop: 8 },
  summary: { alignItems: 'center', backgroundColor: colors.navy, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 17, padding: 17 },
  summaryLabel: { color: '#C5D0E8', fontSize: 11 },
  summaryValue: { color: colors.surface, fontSize: 23, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  summaryDivider: { backgroundColor: '#FFFFFF30', height: 34, width: 1 },
  filters: { gap: 8, paddingBottom: 7 },
  filter: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  filterActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.surface },
  loading: { marginVertical: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 16, borderWidth: 1, marginBottom: 10, padding: 16, ...elevations.card },
  category: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.navy, fontSize: 17, fontWeight: '800', marginTop: 8 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 8 },
  error: { color: colors.danger, marginTop: 12 },
  empty: { color: colors.muted, paddingVertical: 24, textAlign: 'center' },
});
