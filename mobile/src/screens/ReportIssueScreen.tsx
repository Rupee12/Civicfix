import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { apiErrorMessage, isAuthenticationError, logReportApiFailure } from '../api/client';
import { checkDuplicates, createIssue, supportIssue } from '../api/issues';
import { PossibleDuplicatesScreen } from './PossibleDuplicatesScreen';
import type { DuplicateCandidate } from '../types/issue';
import { ISSUE_CATEGORIES, type IssueCategory, type IssueSeverity, type SafetyImpact } from '../types/issue';
import {
  getReportImageResizeAction,
  getSelectedReportAssets,
  isReportImageAsset,
  isValidReportPhotoSize,
  isValidReportPhotoUri,
  MAX_REPORT_IMAGE_DIMENSION,
  MAX_REPORT_PHOTOS,
  MAX_REPORT_PHOTO_BYTES,
  MAX_REPORT_SOURCE_PIXELS,
} from '../utils/reportMedia';

const labels: Record<IssueCategory, string> = { GARBAGE: 'Garbage', ILLEGAL_DUMPING: 'Illegal dumping', BROKEN_STREETLIGHT: 'Streetlight', OPEN_DRAIN: 'Open drain', DAMAGED_ROAD: 'Damaged road', WATER_LEAKAGE: 'Water leakage', PUBLIC_SPACE_DAMAGE: 'Public space', OTHER: 'Other' };
const severities: IssueSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const safetyImpacts: SafetyImpact[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function ReportIssueScreen({ onCreated, onSessionExpired }: { onCreated: (id: string) => void; onSessionExpired: () => void }) {
  const isFocused = useIsFocused();
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
  const [pickerLoading, setPickerLoading] = useState(false);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const photosRef = useRef<ImagePicker.ImagePickerAsset[]>([]);
  const mountedRef = useRef(true);
  const focusedRef = useRef(isFocused);
  const pickerInProgressRef = useRef(false);
  const submissionInProgressRef = useRef(false);
  const locationInProgressRef = useRef(false);
  focusedRef.current = isFocused;

  useEffect(() => {
    mountedRef.current = true;
    void locate();
    void recoverPendingPickerResult();
    return () => { mountedRef.current = false; };
  }, []);

  function reportError(operation: string, error: unknown) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    console.warn(`[CivicFix report] ${operation} failed (${name})`);
  }

  function showReportAlert(title: string, message: string, buttons?: Parameters<typeof Alert.alert>[2]) {
    if (mountedRef.current && focusedRef.current) Alert.alert(title, message, buttons);
  }

  function openSettings() {
    void Linking.openSettings().catch((error: unknown) => {
      reportError('open settings', error);
      showReportAlert('Settings unavailable', 'Open CivicFix permissions from Android settings to continue.');
    });
  }

  function showApiFailure(title: string, error: unknown) {
    logReportApiFailure(error);
    const message = apiErrorMessage(error);
    if (isAuthenticationError(error)) {
      showReportAlert('Session expired', 'Sign in again to continue reporting issues.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', onPress: onSessionExpired },
      ]);
      return;
    }
    showReportAlert(title, message);
  }

  async function locate() {
    if (locationInProgressRef.current) return;
    locationInProgressRef.current = true;
    setLocationMessage('Finding your location...');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (permission.status !== 'granted') {
        setLocationMessage(permission.canAskAgain
          ? 'Location permission is off. Allow access to add the report location.'
          : 'Location access is disabled. Enable it in app settings to report an issue.');
        if (!permission.canAskAgain) {
          showReportAlert('Location permission needed', 'Enable location access for CivicFix in Android settings to attach the required report location.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open settings', onPress: openSettings },
          ]);
        }
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!mountedRef.current) return;
      setCoordinate({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      setLocationMessage('Drag the marker to adjust the report location.');
    } catch (error) {
      reportError('location lookup', error);
      if (mountedRef.current) setLocationMessage(apiErrorMessage(error));
    } finally {
      locationInProgressRef.current = false;
    }
  }

  async function addPickedAssets(assets: ImagePicker.ImagePickerAsset[]) {
    let remaining = MAX_REPORT_PHOTOS - photosRef.current.length;
    if (remaining <= 0) {
      showReportAlert('Photo limit reached', `You can attach up to ${MAX_REPORT_PHOTOS} photos.`);
      return;
    }
    if (assets.length > remaining) {
      showReportAlert('Photo limit reached', `Only ${remaining} more photo${remaining === 1 ? '' : 's'} can be added.`);
    }

    for (const asset of assets.slice(0, remaining)) {
      if (!mountedRef.current) return;
      if (!isValidReportPhotoUri(asset.uri)) {
        showReportAlert('Photo unavailable', 'This photo has an invalid local file reference. Choose another photo.');
        continue;
      }
      if (!isReportImageAsset(asset)) {
        showReportAlert('Unsupported photo', 'Choose an image file that CivicFix can read.');
        continue;
      }
      if (asset.width * asset.height > MAX_REPORT_SOURCE_PIXELS) {
        showReportAlert('Photo is too large', 'Choose an image with fewer pixels so it can be safely processed on this device.');
        continue;
      }

      try {
        const resized = await ImageManipulator.manipulateAsync(
          asset.uri,
          getReportImageResizeAction(asset.width, asset.height),
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: false },
        );
        if (!mountedRef.current) return;
        if (!isValidReportPhotoUri(resized.uri)) throw new Error('Image processing returned an invalid local URI.');

        const fileInfo = await FileSystem.getInfoAsync(resized.uri);
        if (!mountedRef.current) return;
        if (!fileInfo.exists || !('size' in fileInfo) || typeof fileInfo.size !== 'number') {
          throw new Error('Image processing did not return a measurable file.');
        }
        if (!isValidReportPhotoSize(fileInfo.size)) {
          showReportAlert('Photo is too large', 'Each photo must be smaller than 20 MiB after compression. Choose a smaller image.');
          continue;
        }

        const photo: ImagePicker.ImagePickerAsset = {
          ...asset,
          uri: resized.uri,
          width: resized.width,
          height: resized.height,
          fileSize: fileInfo.size,
          fileName: `report-photo-${photosRef.current.length + 1}.jpg`,
          mimeType: 'image/jpeg',
          type: 'image',
          base64: null,
        };
        setPhotos((current) => {
          const next = [...current, photo].slice(0, MAX_REPORT_PHOTOS);
          photosRef.current = next;
          return next;
        });
        remaining -= 1;
      } catch (error) {
        reportError('photo processing', error);
        showReportAlert('Could not use photo', 'This image could not be read or compressed. Choose another photo.');
      }
    }
  }

  async function recoverPendingPickerResult() {
    if (pickerInProgressRef.current) return;
    pickerInProgressRef.current = true;
    try {
      const result = await ImagePicker.getPendingResultAsync();
      if (!mountedRef.current || !result) return;
      if ('code' in result) {
        reportError(`Android pending image picker result (${result.code})`, new Error('Picker result unavailable.'));
        showReportAlert('Could not restore photo', 'Android closed CivicFix while the photo picker was open. Please choose the photo again.');
        return;
      }
      const assets = getSelectedReportAssets(result);
      if (assets.length) await addPickedAssets(assets);
    } catch (error) {
      reportError('Android pending image picker result', error);
      showReportAlert('Could not restore photo', 'The selected photo could not be restored. Please choose it again.');
    } finally {
      pickerInProgressRef.current = false;
    }
  }

  async function addPhoto(useCamera = false) {
    if (pickerInProgressRef.current || submissionInProgressRef.current) return;
    if (photosRef.current.length >= MAX_REPORT_PHOTOS) {
      showReportAlert('Photo limit reached', `You can attach up to ${MAX_REPORT_PHOTOS} photos.`);
      return;
    }

    pickerInProgressRef.current = true;
    setPickerLoading(true);
    try {
      if (useCamera) {
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted) permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          if (!permission.canAskAgain) {
            showReportAlert('Camera permission needed', 'Camera access is disabled for CivicFix. Enable it in Android settings, or choose a photo from the gallery.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open settings', onPress: openSettings },
            ]);
          } else {
            showReportAlert('Camera permission needed', 'Allow camera access to take a report photo, or choose a photo from the gallery.');
          }
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: false });
      if (mountedRef.current) {
        const assets = getSelectedReportAssets(result);
        if (assets.length) await addPickedAssets(assets);
      }
    } catch (error) {
      reportError(useCamera ? 'camera picker' : 'gallery picker', error);
      showReportAlert(
        useCamera ? 'Camera unavailable' : 'Could not open photos',
        useCamera
          ? 'CivicFix could not open the camera. Check camera access or choose a photo from the gallery.'
          : 'CivicFix could not open the photo picker. Please try again.',
      );
    } finally {
      pickerInProgressRef.current = false;
      if (mountedRef.current) setPickerLoading(false);
    }
  }

  async function submit(forceNew = false) {
    if (submissionInProgressRef.current || pickerInProgressRef.current) return;
    if (title.trim().length < 5) { Alert.alert('Title needed', 'Add a short title with at least 5 characters.'); return; }
    if (description.trim().length < 10) { Alert.alert('More detail needed', 'Describe the issue in at least 10 characters.'); return; }
    if (!photos.length) { Alert.alert('Photo needed', 'Add at least one photo so the issue can be verified.'); return; }
    if (photos.some((photo) => !isValidReportPhotoUri(photo.uri) || !isReportImageAsset(photo) || !isValidReportPhotoSize(photo.fileSize ?? 0))) {
      Alert.alert('Photo unavailable', 'Remove the invalid photo and choose a supported image smaller than 20 MiB.');
      return;
    }
    if (!coordinate) { Alert.alert('Location needed', 'Capture your location before submitting.'); return; }
    submissionInProgressRef.current = true;
    setLoading(true);
    try {
      if (!forceNew) {
        const matches = await checkDuplicates({ title, description, category, severity, safetyImpact, affectedPeopleEstimate: Number(affectedPeople), latitude: coordinate.latitude, longitude: coordinate.longitude });
        if (matches.length) {
          if (mountedRef.current) setCandidates(matches);
          return;
        }
      }
      const issue = await createIssue({ title, description, category, severity, safetyImpact, affectedPeopleEstimate: Number(affectedPeople), latitude: coordinate.latitude, longitude: coordinate.longitude, photos: photos.map((photo, index) => ({ uri: photo.uri, name: photo.fileName ?? `photo-${index}.jpg`, type: photo.mimeType ?? 'image/jpeg' })) });
      if (mountedRef.current && focusedRef.current) onCreated(issue.id);
    } catch (error) {
      reportError('report submission', error);
      showApiFailure('Could not submit', error);
    } finally {
      submissionInProgressRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  async function supportCandidate(candidate: DuplicateCandidate) {
    if (submissionInProgressRef.current) return;
    submissionInProgressRef.current = true;
    setLoading(true);
    try {
      const issue = await supportIssue(candidate.issueId, { title, description, category, severity, safetyImpact, affectedPeopleEstimate: Number(affectedPeople), latitude: coordinate?.latitude ?? 0, longitude: coordinate?.longitude ?? 0 });
      if (mountedRef.current && focusedRef.current) onCreated(issue.id);
    } catch (error) {
      reportError('linking report to existing issue', error);
      showApiFailure('Could not link report', error);
    } finally {
      submissionInProgressRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }

  if (candidates.length) return <PossibleDuplicatesScreen candidates={candidates} disabled={loading} onReportNew={() => { if (submissionInProgressRef.current) return; setCandidates([]); void submit(true); }} onSupport={(candidate) => { void supportCandidate(candidate); }} />;

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.heading}>Report an issue</Text><Text style={styles.intro}>Give your local team enough detail to find and fix it.</Text>
    <Text style={styles.label}>Category</Text><View style={styles.grid}>{ISSUE_CATEGORIES.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, item === category && styles.chipActive]}><Text style={[styles.chipText, item === category && styles.chipTextActive]}>{labels[item]}</Text></Pressable>)}</View>
    <Text style={styles.label}>Title</Text><TextInput placeholder="What is happening?" value={title} onChangeText={setTitle} style={styles.input} />
    <Text style={styles.label}>Description</Text><TextInput multiline placeholder="Add useful details..." value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} />
    <Text style={styles.label}>Severity</Text><View style={styles.grid}>{severities.map((item) => <Pressable key={item} onPress={() => setSeverity(item)} style={[styles.chip, item === severity && styles.chipActive]}><Text style={[styles.chipText, item === severity && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={styles.label}>Safety impact</Text><View style={styles.grid}>{safetyImpacts.map((item) => <Pressable key={item} onPress={() => setSafetyImpact(item)} style={[styles.chip, item === safetyImpact && styles.chipActive]}><Text style={[styles.chipText, item === safetyImpact && styles.chipTextActive]}>{item}</Text></Pressable>)}</View>
    <Text style={styles.label}>Estimated people affected</Text><TextInput keyboardType="number-pad" placeholder="0" value={affectedPeople} onChangeText={(value) => setAffectedPeople(value.replace(/[^0-9]/g, '').slice(0, 6))} style={styles.input} />
    <Text style={styles.label}>Evidence</Text><View style={styles.photos}>{photos.map((photo, index) => <Pressable key={photo.uri} disabled={loading || pickerLoading} onPress={() => setPhotos((current) => { const next = current.filter((_, photoIndex) => photoIndex !== index); photosRef.current = next; return next; })}><Image source={{ uri: photo.uri }} style={styles.photo} /></Pressable>)}</View><View style={styles.photoActions}><Pressable onPress={() => void addPhoto(true)} disabled={loading || pickerLoading} style={styles.addPhoto}><Text style={styles.addPhotoText}>{pickerLoading ? 'Opening...' : 'Camera'}</Text></Pressable><Pressable onPress={() => void addPhoto()} disabled={loading || pickerLoading} style={styles.addPhoto}><Text style={styles.addPhotoText}>{pickerLoading ? 'Opening...' : 'Gallery'}</Text></Pressable></View><Text style={styles.photoHint}>Up to {MAX_REPORT_PHOTOS} JPEG photos, compressed to a maximum of {MAX_REPORT_IMAGE_DIMENSION}px and {MAX_REPORT_PHOTO_BYTES / (1024 * 1024)} MiB each.</Text>
    <Text style={styles.label}>Location</Text><Text style={styles.locationMessage}>{locationMessage}</Text>{coordinate ? <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={{ latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }} onPress={(event) => setCoordinate(event.nativeEvent.coordinate)}><Marker coordinate={coordinate} draggable onDragEnd={(event) => setCoordinate(event.nativeEvent.coordinate)} /></MapView> : <Pressable onPress={() => void locate()}><Text style={styles.retry}>Retry location permission</Text></Pressable>}
    <Pressable onPress={() => void submit()} disabled={loading || pickerLoading} style={styles.submit}><Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit report'}</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { padding: 22, paddingBottom: 40, backgroundColor: '#F5F7F2' }, heading: { color: '#15352B', fontSize: 30, fontWeight: '800' }, intro: { color: '#64736B', fontSize: 15, marginBottom: 18, marginTop: 8 }, label: { color: '#2D4A3E', fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 }, chipActive: { backgroundColor: '#28745A', borderColor: '#28745A' }, chipText: { color: '#426057', fontSize: 13 }, chipTextActive: { color: '#FFF', fontWeight: '700' }, input: { backgroundColor: '#FFF', borderColor: '#DCE5DF', borderRadius: 10, borderWidth: 1, padding: 13, fontSize: 16 }, textArea: { minHeight: 100, textAlignVertical: 'top' }, photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 }, photo: { borderRadius: 10, height: 74, width: 74 }, addPhoto: { alignItems: 'center', borderColor: '#B7C8BE', borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, height: 54, justifyContent: 'center', width: 100 }, addPhotoText: { color: '#28745A', fontWeight: '700' }, photoHint: { color: '#64736B', fontSize: 12, marginTop: 8 }, locationMessage: { color: '#64736B', marginBottom: 8 }, map: { height: 220, borderRadius: 14, overflow: 'hidden' }, retry: { color: '#28745A', fontWeight: '700', paddingVertical: 12 }, submit: { alignItems: 'center', backgroundColor: '#E9774C', borderRadius: 12, marginTop: 22, padding: 16 }, submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' } });
