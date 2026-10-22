import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DuplicateCandidate } from '../types/issue';

export function PossibleDuplicatesScreen({ candidates, disabled = false, onSupport, onReportNew }: { candidates: DuplicateCandidate[]; disabled?: boolean; onSupport: (candidate: DuplicateCandidate) => void; onReportNew: () => void }) {
  return <View style={styles.screen}>
    <Text style={styles.eyebrow}>A QUICK CHECK</Text>
    <Text style={styles.heading}>Is this the same problem?</Text>
    <Text style={styles.copy}>We found nearby reports that may describe the same civic issue.</Text>
    {candidates.map((candidate) => <View key={candidate.issueId} style={styles.card}><Text style={styles.title}>{candidate.title}</Text><Text style={styles.category}>{candidate.category.replaceAll('_', ' ')}</Text><View style={styles.meta}><Text>{candidate.distanceMeters} m away</Text><Text>{candidate.confidence === 'HIGH' ? 'Strong match' : 'Possible match'}</Text></View><Text style={styles.counts}>{candidate.supportCount} supporters · {candidate.reportCount} reports</Text><Pressable onPress={() => onSupport(candidate)} disabled={disabled} style={styles.support}><Text style={styles.supportText}>{disabled ? 'Please wait...' : 'Support existing issue'}</Text></Pressable></View>)}
    <Pressable onPress={onReportNew} disabled={disabled} style={styles.newIssue}><Text style={styles.newIssueText}>{disabled ? 'Please wait...' : 'Report a new issue'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: '#F5F7F2', flex: 1, padding: 22 }, eyebrow: { color: '#28745A', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, heading: { color: '#15352B', fontSize: 30, fontWeight: '800', marginTop: 8 }, copy: { color: '#64736B', fontSize: 15, lineHeight: 22, marginVertical: 12 }, card: { backgroundColor: '#FFF', borderRadius: 14, marginTop: 12, padding: 16 }, title: { color: '#15352B', fontSize: 18, fontWeight: '800' }, category: { color: '#28745A', fontSize: 12, fontWeight: '700', marginTop: 8 }, meta: { color: '#64736B', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }, counts: { color: '#64736B', marginTop: 10 }, support: { backgroundColor: '#28745A', borderRadius: 10, marginTop: 14, padding: 13 }, supportText: { color: '#FFF', fontWeight: '800', textAlign: 'center' }, newIssue: { borderColor: '#28745A', borderRadius: 10, borderWidth: 1, marginTop: 18, padding: 13 }, newIssueText: { color: '#28745A', fontWeight: '800', textAlign: 'center' } });