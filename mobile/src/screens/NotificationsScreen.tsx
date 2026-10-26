import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient, apiErrorMessage } from '../api/client';
import { colors, elevations } from '../theme';

type Notification = { id: string; title: string; message: string; readAt?: string; createdAt: string };
export function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]); const [error, setError] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { setError(''); try { const response = await apiClient.get<{ data: { notifications: Notification[] } }>('/notifications?limit=50'); setItems(response.data.data.notifications); } catch (e) { setError(apiErrorMessage(e)); } }, []);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (item: Notification) => {
    if (item.readAt) return;
    try {
      await apiClient.patch(`/notifications/${item.id}/read`);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  };
  return <ScrollView contentContainerStyle={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.blue} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}><Text style={styles.kicker}>YOUR UPDATES</Text><Text style={styles.title}>Notifications</Text>{error ? <View style={styles.error}><Text>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}{items.length ? items.map((item) => <Pressable key={item.id} onPress={() => void markRead(item)} style={[styles.card, !item.readAt && styles.unread]}><View style={styles.cardHeading}><Text style={styles.cardTitle}>{item.title}</Text>{!item.readAt ? <View style={styles.unreadDot} /> : null}</View><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text></Pressable>) : <Text style={styles.empty}>No notifications yet.</Text>}</ScrollView>;
}
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flexGrow: 1, padding: 22 },
  kicker: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.navy, fontSize: 29, fontWeight: '800', marginBottom: 18, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 17, borderWidth: 1, marginBottom: 11, padding: 16, ...elevations.card },
  unread: { borderColor: colors.blue, borderWidth: 1 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  unreadDot: { backgroundColor: colors.blue, borderRadius: 5, height: 8, width: 8 },
  cardTitle: { color: colors.navy, flex: 1, fontSize: 15, fontWeight: '800' },
  message: { color: colors.muted, lineHeight: 20, marginTop: 6 },
  date: { color: colors.muted, fontSize: 11, marginTop: 10 },
  error: { backgroundColor: colors.dangerTint, borderRadius: 12, padding: 14 },
  link: { color: colors.blue, fontWeight: '700', marginTop: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 36 },
});
