import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient, apiErrorMessage } from '../api/client';

type Notification = { id: string; title: string; message: string; readAt?: string; createdAt: string };
export function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]); const [error, setError] = useState(''); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { setError(''); try { const response = await apiClient.get<{ data: { notifications: Notification[] } }>('/notifications?limit=50'); setItems(response.data.data.notifications); } catch (e) { setError(apiErrorMessage(e)); } }, []);
  useEffect(() => { void load(); }, [load]);
  const markRead = async (item: Notification) => { if (!item.readAt) { await apiClient.patch(`/notifications/${item.id}/read`); await load(); } };
  return <ScrollView contentContainerStyle={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}><Text style={styles.title}>Notifications</Text>{error ? <View style={styles.error}><Text>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.link}>Try again</Text></Pressable></View> : null}{items.length ? items.map((item) => <Pressable key={item.id} onPress={() => void markRead(item)} style={[styles.card, !item.readAt && styles.unread]}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text></Pressable>) : <Text style={styles.empty}>No notifications yet.</Text>}</ScrollView>;
}
const styles = StyleSheet.create({ screen: { backgroundColor: '#F5F7F2', flexGrow: 1, padding: 24 }, title: { color: '#15352B', fontSize: 28, fontWeight: '800', marginBottom: 18 }, card: { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10, padding: 16 }, unread: { borderColor: '#28745A', borderWidth: 1 }, cardTitle: { color: '#15352B', fontSize: 16, fontWeight: '800' }, message: { color: '#5E7467', lineHeight: 20, marginTop: 6 }, date: { color: '#8A9890', fontSize: 12, marginTop: 10 }, error: { backgroundColor: '#FBE9E7', borderRadius: 12, padding: 14 }, link: { color: '#28745A', fontWeight: '700', marginTop: 8 }, empty: { color: '#64736B', textAlign: 'center', marginTop: 36 } });
