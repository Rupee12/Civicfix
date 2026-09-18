import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { getSession, saveSession } from './src/api/client';
import { LoginScreen } from './src/screens/LoginScreen';
import { ReportIssueScreen } from './src/screens/ReportIssueScreen';
import { NearbyIssuesScreen } from './src/screens/NearbyIssuesScreen';
import { IssueDetailsScreen } from './src/screens/IssueDetailsScreen';
import { AuthorityQueueScreen } from './src/screens/AuthorityQueueScreen';
import { ResolutionScreen } from './src/screens/ResolutionScreen';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
export default function App() {
  const [session, setSession] = useState<{ token: string; role: string } | null>();
  useEffect(() => { void getSession().then((value) => setSession(value.token ? { token: value.token, role: value.role ?? 'CITIZEN' } : null)); }, []);
  if (session === undefined) return null;
  const isAuthority = session?.role === 'AUTHORITY';
  return <NavigationContainer><Stack.Navigator screenOptions={{ headerTintColor: '#15352B', headerTitleStyle: { fontWeight: '700' } }}>{session?.token ? isAuthority ? <><Stack.Screen name="AuthorityQueue" options={{ title: 'Assigned work' }}>{({ navigation }) => <AuthorityQueueScreen onSelect={(issueId) => navigation.navigate('Details', { issueId })} />}</Stack.Screen><Stack.Screen name="Details" options={{ title: 'Issue details' }}>{({ navigation, route }) => <IssueDetailsScreen issueId={route.params.issueId} canResolve onResolve={() => navigation.navigate('Resolution', { issueId: route.params.issueId })} canSupport={false} />}</Stack.Screen><Stack.Screen name="Resolution" options={{ title: 'Submit resolution' }}>{({ navigation, route }) => <ResolutionScreen issueId={route.params.issueId} onSubmitted={() => navigation.replace('Details', { issueId: route.params.issueId })} />}</Stack.Screen></> : <><Stack.Screen name="Nearby" options={{ title: 'CivicFix' }}>{({ navigation }) => <NearbyIssuesScreen onReport={() => navigation.navigate('Report')} onSelect={(issueId) => navigation.navigate('Details', { issueId })} />}</Stack.Screen><Stack.Screen name="Report" options={{ title: 'New report' }}>{({ navigation }) => <ReportIssueScreen onCreated={(issueId) => navigation.replace('Details', { issueId })} />}</Stack.Screen><Stack.Screen name="Details" options={{ title: 'Issue details' }}>{({ route }) => <IssueDetailsScreen issueId={route.params.issueId} />}</Stack.Screen></> : <Stack.Screen name="Login" options={{ headerShown: false }}>{() => <LoginScreen onLoggedIn={async (token, role) => { await saveSession(token, role); setSession({ token, role }); }} />}</Stack.Screen>}</Stack.Navigator></NavigationContainer>;
}
