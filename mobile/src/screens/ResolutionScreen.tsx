import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiErrorMessage } from '../api/client';
import { submitResolution } from '../api/issues';

export function ResolutionScreen({ issueId, onSubmitted }: { issueId: string; onSubmitted: () => void }) {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  async function addPhoto(useCamera: boolean) {
    if (photos.length >= 5) return;
    const result = useCamera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhotos((current) => [...current, ...result.assets].slice(0, 5));
  }
  async function submit() {
    if (description.trim().length < 10 || !photos.length) { Alert.alert('Evidence required', 'Add a description and at least one after-resolution photo.'); return; }
    setLoading(true);
    try { await submitResolution(issueId, description, photos.map((photo, index) => ({ uri: photo.uri, name: photo.fileName ?? `after-${index}.jpg`, type: photo.mimeType ?? 'image/jpeg' }))); onSubmitted(); }
    catch (error) { Alert.alert('Could not submit resolution', apiErrorMessage(error)); }
    finally { setLoading(false); }
  }
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.eyebrow}>AFTER EVIDENCE</Text><Text style={styles.heading}>Submit resolution</Text><Text style={styles.copy}>Describe what was completed and attach a clear photo of the result.</Text><TextInput multiline placeholder="What was fixed?" value={description} onChangeText={setDescription} style={styles.input} /><View style={styles.photos}>{photos.map((photo, index) => <Pressable key={photo.uri} onPress={() => setPhotos(photos.filter((_, photoIndex) => photoIndex !== index))}><Image source={{ uri: photo.uri }} style={styles.photo} /></Pressable>)}</View><View style={styles.actions}><Pressable onPress={() => void addPhoto(true)} style={styles.action}><Text style={styles.actionText}>Camera</Text></Pressable><Pressable onPress={() => void addPhoto(false)} style={styles.action}><Text style={styles.actionText}>Gallery</Text></Pressable></View><Pressable onPress={() => void submit()} disabled={loading} style={styles.submit}><Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit resolution'}</Text></Pressable></ScrollView>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: '#F5F7F2', flexGrow: 1, padding: 22 }, eyebrow: { color: '#28745A', fontSize: 12, fontWeight: '800', letterSpacing: 1.3 }, heading: { color: '#15352B', fontSize: 30, fontWeight: '800', marginTop: 8 }, copy: { color: '#64736B', fontSize: 15, lineHeight: 22, marginVertical: 16 }, input: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 10, borderWidth: 1, minHeight: 130, padding: 14, textAlignVertical: 'top' }, photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }, photo: { borderRadius: 10, height: 84, width: 84 }, actions: { flexDirection: 'row', gap: 10, marginTop: 12 }, action: { borderColor: '#28745A', borderRadius: 9, borderWidth: 1, padding: 12, width: 100 }, actionText: { color: '#28745A', fontWeight: '800', textAlign: 'center' }, submit: { alignItems: 'center', backgroundColor: '#E9774C', borderRadius: 10, marginTop: 24, padding: 15 }, submitText: { color: '#FFF', fontWeight: '800' } });