import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiErrorMessage } from '../api/client';
import { getNearbyIssues } from '../api/issues';
import { ISSUE_CATEGORIES, type Issue, type IssueCategory } from '../types/issue';
import { colors, elevations } from '../theme';
import { normalizeMapCoordinate, type MapCoordinate } from '../utils/mapCoordinates';

export function NearbyIssuesScreen({ onSelect, onReport }: { onSelect: (id: string) => void; onReport: () => void }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [center, setCenter] = useState<MapCoordinate>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<IssueCategory | 'ALL'>('ALL');
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadTimedOut, setMapLoadTimedOut] = useState(false);
  const [mapRetry, setMapRetry] = useState(0);
  const mountedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        if (mountedRef.current) setError('Location permission is needed to find nearby issues.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextCenter = normalizeMapCoordinate(location.coords);
      if (!nextCenter) throw new Error('Location returned invalid coordinates.');
      if (!mountedRef.current) return;
      setCenter(nextCenter);
      const nextIssues = await getNearbyIssues(nextCenter.latitude, nextCenter.longitude);
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

  useEffect(() => {
    if (!center || mapLoaded) return undefined;
    const timeout = setTimeout(() => setMapLoadTimedOut(true), 15000);
    return () => clearTimeout(timeout);
  }, [center, mapLoaded, mapRetry]);

  const matchingIssues = useMemo(() => issues.filter((issue) => {
    const matchesCategory = category === 'ALL' || issue.category === category;
    const searchText = `${issue.title} ${issue.description} ${issue.category}`.toLowerCase();
    return matchesCategory && searchText.includes(query.trim().toLowerCase());
  }), [category, issues, query]);
  const mappableIssues = useMemo(() => matchingIssues.flatMap((issue) => {
    const coordinate = normalizeMapCoordinate(issue.location);
    return coordinate ? [{ issue, coordinate }] : [];
  }), [matchingIssues]);
  const handleMapLoaded = useCallback(() => {
    setMapReady(true);
    setMapLoaded(true);
    setMapLoadTimedOut(false);
  }, []);
  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);
  const retryMap = useCallback(() => {
    setMapReady(false);
    setMapLoaded(false);
    setMapLoadTimedOut(false);
    setMapRetry((attempt) => attempt + 1);
  }, []);
  const renderIssue = useCallback(({ item: issue }: ListRenderItemInfo<Issue>) => (
    <Pressable onPress={() => onSelect(issue.id)} style={styles.card}>
      <View style={styles.cardTop}><Text style={styles.category}>{issue.category.replaceAll('_', ' ')}</Text><Text style={styles.priorityBadge}>{issue.priorityLevel ?? 'LOW'} · {issue.priorityScore ?? 0}</Text></View>
      <Text style={styles.title}>{issue.title}</Text>
      <View style={styles.meta}><Text style={styles.badge}>{issue.severity}</Text><Text style={styles.status}>{issue.reportCount} reports · {issue.supportCount} supports</Text><Text style={styles.distance}>{issue.distanceMeters ?? 0} m</Text></View>
    </Pressable>
  ), [onSelect]);

  const listHeader = <>
    <View style={styles.header}>
      <View><Text style={styles.kicker}>YOUR AREA</Text><Text style={styles.heading}>Explore issues</Text></View>
      <View style={styles.countBadge}><Text style={styles.count}>{issues.length}</Text></View>
    </View>
    <Text style={styles.intro}>See what your community is reporting nearby.</Text>
    <Pressable onPress={onReport} style={styles.reportButton}><Text style={styles.reportButtonText}>＋  Report an issue</Text></Pressable>
    <TextInput
      accessibilityLabel="Search nearby issues"
      onChangeText={setQuery}
      placeholder="Search area or issue"
      placeholderTextColor={colors.muted}
      returnKeyType="search"
      style={styles.search}
      value={query}
    />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      <Pressable onPress={() => setCategory('ALL')} style={[styles.filter, category === 'ALL' && styles.filterActive]}><Text style={[styles.filterText, category === 'ALL' && styles.filterTextActive]}>All issues</Text></Pressable>
      {ISSUE_CATEGORIES.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]}><Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item.replaceAll('_', ' ')}</Text></Pressable>)}
    </ScrollView>
    {center ? <View style={styles.mapCard}>
      <MapView
        key={mapRetry}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
        showsUserLocation
        showsMyLocationButton
        accessibilityLabel="Map of nearby CivicFix reports"
        onMapReady={handleMapReady}
        onMapLoaded={handleMapLoaded}
      >
        {mappableIssues.map(({ issue, coordinate }) => (
          <Marker
            key={issue.id}
            coordinate={coordinate}
            pinColor={colors.blue}
            title={issue.title}
            description={`${issue.category.replaceAll('_', ' ')} · ${issue.status.replaceAll('_', ' ')}`}
            onCalloutPress={() => onSelect(issue.id)}
          />
        ))}
      </MapView>
      <Text style={styles.mapCaption}>
        {mapLoaded
          ? `${mappableIssues.length} mapped reports · tap a pin for details`
          : mapLoadTimedOut
            ? mapReady
              ? 'Map is ready, but tiles have not loaded.'
              : 'Map has not finished initializing.'
            : 'Loading map tiles…'}
      </Text>
      {mapLoadTimedOut && !mapLoaded ? (
        <Pressable accessibilityRole="button" onPress={retryMap} style={styles.mapRetry}>
          <Text style={styles.mapRetryText}>Retry map</Text>
        </Pressable>
      ) : null}
    </View> : null}
    {loading && !issues.length ? <ActivityIndicator color={colors.blue} style={styles.loading} /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </>;

  return <FlatList<Issue>
    style={styles.screen}
    contentContainerStyle={styles.content}
    removeClippedSubviews={false}
    data={matchingIssues}
    keyExtractor={(issue) => issue.id}
    renderItem={renderIssue}
    ListHeaderComponent={listHeader}
    ListEmptyComponent={!loading && !error ? (
      <Text style={styles.empty}>
        {issues.length ? 'No nearby issues match these filters.' : 'Nothing reported nearby yet.'}
      </Text>
    ) : null}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.blue} />}
  />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 36 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  heading: { color: colors.navy, fontSize: 28, fontWeight: '800', marginTop: 4 },
  countBadge: { alignItems: 'center', backgroundColor: colors.blueTint, borderRadius: 14, height: 48, justifyContent: 'center', minWidth: 48 },
  count: { color: colors.blue, fontSize: 20, fontWeight: '800' },
  intro: { color: colors.muted, fontSize: 14, marginTop: 8 },
  reportButton: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: 15, elevation: 3, marginBottom: 16, marginTop: 18, padding: 14 },
  reportButtonText: { color: colors.surface, fontWeight: '800' },
  search: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 14, borderWidth: 1, color: colors.navy, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12 },
  filters: { gap: 8, paddingBottom: 12 },
  filter: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: colors.surface },
  mapCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 20, borderWidth: 1, marginBottom: 18 },
  map: { height: 250, width: '100%' },
  mapCaption: { color: colors.muted, fontSize: 11, paddingHorizontal: 14, paddingVertical: 11 },
  mapRetry: { alignSelf: 'flex-start', marginBottom: 10, marginLeft: 14 },
  mapRetryText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  loading: { marginVertical: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 17, borderWidth: 1, marginBottom: 11, padding: 16, ...elevations.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  category: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  priorityBadge: { color: '#B86E00', fontSize: 11, fontWeight: '800' },
  distance: { color: colors.muted, fontSize: 11 },
  title: { color: colors.navy, fontSize: 17, fontWeight: '800', marginVertical: 10 },
  meta: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: colors.amberTint, borderRadius: 7, color: '#9A5A00', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 5 },
  status: { color: colors.muted, flex: 1, fontSize: 11 },
  error: { color: colors.danger, paddingVertical: 12 },
  empty: { color: colors.muted, paddingVertical: 30, textAlign: 'center' },
});
