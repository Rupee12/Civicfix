import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiErrorMessage } from '../api/client';
import { checkDuplicates, createIssue, supportIssue } from '../api/issues';
import { PossibleDuplicatesScreen } from './PossibleDuplicatesScreen';
import type { DuplicateCandidate } from '../types/issue';
import { ISSUE_CATEGORIES, type IssueCategory, type IssueSeverity, type SafetyImpact } from '../types/issue';

const labels: Record<IssueCategory, string> = { GARBAGE: 'Garbage', ILLEGAL_DUMPING: 'Illegal dumping', BROKEN_STREETLIGHT: 'Streetlight', OPEN_DRAIN: 'Open drain', DAMAGED_ROAD: 'Damaged road', WATER_LEAKAGE: 'Water leakage', PUBLIC_SPACE_DAMAGE: 'Public space', OTHER: 'Other' };
const severities: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const safetyImpacts: SafetyImpact[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function ReportIssueScreen({ onCreated }: { onCreated: (id: string) => void }) {
  const [category, setCategory] = useState<IssueCategory>('GARBAGE');
  const [severity, setSeverity] = useState<IssueSeverity>('MEDIUM');
  const [safetyImpact, setSafetyImpact] = useState<SafetyImpact>('NONE');
  const [affectedPeople, setAffectedPeople] = useState('0');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number }>();
  const [locationMessage, setLocationMessage] = useState('Finding your location...');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);

  useEffect(() => { void locate(); }, []);
  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') { setLocationMessage('Location permission is off. You can retry below.'); return; }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoordinate({ latitude: current.coords.latitude, longitude: current.coords.longitude }); setLocationMessage('Drag the marker to adjust the report location.');
  }
  async function addPhoto(useCamera = false) {
    if (photos.length >= 5) return;
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setPhotos((current) => [...current, ...result.assets].slice(0, 5));
  }
  async function submit(forceNew = false) {
    if (!coordinate) { Alert.alert('Location needed', 'Capture your location before submitting.'); return; }
    setLoading(true);
    try {
      if (!forceNew) {
        const matches = await checkDuplicates({ title, description, category, severity, safetyImpact, affectedPeopleEstimate: Number(affectedPeople), latitude: coordinate.latitude, longitude: coordinate.longitude });
        if (matches.length) { setCandidates(matches); return; }
      }
      const issue = await createIssue({ title, description, category, severity, safetyImpact, affectedPeopleEstimate: Number(affectedPeople), latitude: coordinate.latitude, longitude: coordinate.longitude, photos: photos.map((photo, index) => ({ uri: photo.uri, name: photo.fileName ?? `photo-${index}.jpg`, type: photo.mimeType ?? 'image/jpeg' })) });
      onCreated(issue.id);
    } catch (error) { Alert.alert('Could not submit', apiErrorMessage(error)); }
    finally { setLoading(false); }
  }

  if (candidates.length) return <PossibleDuplicatesScreen candidates={candidates} onReportNew={() => { setCandidates([]); void submit(true); }} onSupport={async (candidate) => { setLoading(true); try { const issue = await supportIssue(candidate.issueId, { title, description, category, severity, safetyImpact, affectedPeopleEstimate: Number(affectedPeople), latitude: coordinate?.latitude ?? 0, longitude: coordinate?.longitude ?? 0 }); onCreated(issue.id); } catch (error) { Alert.alert('Could not link report', apiErrorMessage(error)); } finally { setLoading(false); } }} />;

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.heading}>Report an issue</Text><Text style={styles.intro}>Give your local team enough detail to find and fix it.</Text>
    <Text style={styles.label}>Category</Text><View style={styles.grid}>{ISSUE_CATEGORIES.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, item === category && styles.chipActive]}><Text style={[styles.chipText, item === category && styles.chipTextActive]}>{labels[item]}</Text></Pressable>)}</View>
    <Text style={styles.label}>Title</Text><TextInput placeholder="What is happening?" value={title} onChangeText={setTitle} style={styles.input} />
    <Text style={styles.label}>Description</Text><TextInput multiline placeholder="Add useful details..." value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} />
    <Text style={styles.label}>Severity</Text><View style={styles.grid}>{severities.map((item) => <Pressable key={item} onPress={() => setSeverity(item)} style={[styles.chip, item === severity && styles.chipActive]}><Text style={[styles.chipText, item === severity && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={styles.label}>Safety impact</Text><View style={styles.grid}>{safetyImpacts.map((item) => <Pressable key={item} onPress={() => setSafetyImpact(item)} style={[styles.chip, item === safetyImpact && styles.chipActive]}><Text style={[styles.chipText, item === safetyImpact && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={styles.label}>Estimated people affected</Text><TextInput keyboardType="number-pad" placeholder="0" value={affectedPeople} onChangeText={(value) => setAffectedPeople(value.replace(/[^0-9]/g, '').slice(0, 6))} style={styles.input} />
    <Text style={styles.label}>Evidence</Text><View style={styles.photos}>{photos.map((photo, index) => <Pressable key={photo.uri} onPress={() => setPhotos(photos.filter((_, photoIndex) => photoIndex !== index))}><Image source={{ uri: photo.uri }} style={styles.photo} /></Pressable>)}</View><View style={styles.photoActions}><Pressable onPress={() => void addPhoto(true)} style={styles.addPhoto}><Text style={styles.addPhotoText}>Camera</Text></Pressable><Pressable onPress={() => void addPhoto()} style={styles.addPhoto}><Text style={styles.addPhotoText}>Gallery</Text></Pressable></View>
    <Text style={styles.label}>Location</Text><Text style={styles.locationMessage}>{locationMessage}</Text>{coordinate ? <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={{ latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }} onPress={(event) => setCoordinate(event.nativeEvent.coordinate)}><Marker coordinate={coordinate} draggable onDragEnd={(event) => setCoordinate(event.nativeEvent.coordinate)} /></MapView> : <Pressable onPress={() => void locate()}><Text style={styles.retry}>Retry location permission</Text></Pressable>}
    <Pressable onPress={() => void submit()} disabled={loading} style={styles.submit}><Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit report'}</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { padding: 22, paddingBottom: 40, backgroundColor: '#F5F7F2' }, heading: { color: '#15352B', fontSize: 30, fontWeight: '800' }, intro: { color: '#64736B', fontSize: 15, marginBottom: 18, marginTop: 8 }, label: { color: '#2D4A3E', fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 }, chipActive: { backgroundColor: '#28745A', borderColor: '#28745A' }, chipText: { color: '#426057', fontSize: 13 }, chipTextActive: { color: '#FFF', fontWeight: '700' }, input: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 10, borderWidth: 1, padding: 13, fontSize: 16 }, textArea: { minHeight: 100, textAlignVertical: 'top' }, photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 }, photo: { borderRadius: 10, height: 74, width: 74 }, addPhoto: { alignItems: 'center', borderColor: '#B7C8BE', borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, height: 54, justifyContent: 'center', width: 100 }, addPhotoText: { color: '#28745A', fontWeight: '700' }, locationMessage: { color: '#64736B', marginBottom: 8 }, map: { height: 220, borderRadius: 14, overflow: 'hidden' }, retry: { color: '#28745A', fontWeight: '700', paddingVertical: 12 }, submit: { alignItems: 'center', backgroundColor: '#E9774C', borderRadius: 12, marginTop: 22, padding: 16 }, submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' } });
