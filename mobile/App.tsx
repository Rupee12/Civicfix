import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { clearToken, getCurrentUser, getSession, saveSession } from './src/api/client';
import { AuthorityQueueScreen } from './src/screens/AuthorityQueueScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { IssueDetailsScreen } from './src/screens/IssueDetailsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { MyReportsScreen } from './src/screens/MyReportsScreen';
import { NearbyIssuesScreen } from './src/screens/NearbyIssuesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReportIssueScreen } from './src/screens/ReportIssueScreen';
import { ResolutionScreen } from './src/screens/ResolutionScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function CitizenTabs({ onSignOut }: { onSignOut: () => void }) {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#28745A', tabBarInactiveTintColor: '#8A9890', tabBarLabelStyle: { fontWeight: '700' } }}>
    <Tabs.Screen name="Home">{({ navigation }) => <HomeScreen onReport={() => navigation.navigate('Report')} onExplore={() => navigation.navigate('Explore')} onReports={() => navigation.navigate('My Reports')} onProfile={() => navigation.navigate('Profile')} onSelect={(issueId) => navigation.getParent()?.navigate('Details' as never, { issueId } as never)} />}</Tabs.Screen>
    <Tabs.Screen name="Explore">{({ navigation }) => <NearbyIssuesScreen onReport={() => navigation.navigate('Report')} onSelect={(issueId) => navigation.getParent()?.navigate('Details' as never, { issueId } as never)} />}</Tabs.Screen>
    <Tabs.Screen name="Report">{({ navigation }) => <ReportIssueScreen onSessionExpired={onSignOut} onCreated={(issueId) => navigation.getParent()?.navigate('Details' as never, { issueId } as never)} />}</Tabs.Screen>
    <Tabs.Screen name="My Reports">{({ navigation }) => <MyReportsScreen onSelect={(issueId) => navigation.getParent()?.navigate('Details' as never, { issueId } as never)} />}</Tabs.Screen>
    <Tabs.Screen name="Profile">{() => <ProfileScreen role="CITIZEN" onSignOut={onSignOut} />}</Tabs.Screen>
    <Tabs.Screen name="Notifications">{() => <NotificationsScreen />}</Tabs.Screen>
  </Tabs.Navigator>;
}

export default function App() {
  const [session, setSession] = useState<{ token: string; role: string } | null>();
  useEffect(() => {
    void getSession().then(async (stored) => {
      if (!stored.token) { setSession(null); return; }
      try {
        const user = await getCurrentUser();
        setSession({ token: stored.token!, role: user.role });
        await saveSession(stored.token, user.role);
      } catch {
        await clearToken();
        setSession(null);
      }
    });
  }, []);
  if (session === undefined) return null;
  const signOut = () => { void clearToken().then(() => setSession(null)); };
  return <NavigationContainer><Stack.Navigator screenOptions={{ headerTintColor: '#15352B', headerTitleStyle: { fontWeight: '700' } }}>
    {!session ? <>
      <Stack.Screen name="Welcome" options={{ headerShown: false }}>{({ navigation }) => <WelcomeScreen onSignIn={() => navigation.navigate('Login')} onSignUp={() => navigation.navigate('SignUp')} />}</Stack.Screen>
      <Stack.Screen name="Login" options={{ headerShown: false }}>{() => <LoginScreen onLoggedIn={async (token, role) => { await saveSession(token, role); setSession({ token, role }); }} />}</Stack.Screen>
      <Stack.Screen name="SignUp" options={{ headerShown: false }}>{({ navigation }) => <SignUpScreen onRegistered={() => navigation.replace('Login')} onBack={() => navigation.replace('Login')} />}</Stack.Screen>
    </> : session.role === 'AUTHORITY' ? <>
      <Stack.Screen name="AuthorityQueue" options={{ title: 'Assigned work' }}>{({ navigation }) => <AuthorityQueueScreen onSelect={(issueId) => navigation.navigate('Details', { issueId })} />}</Stack.Screen>
      <Stack.Screen name="Details" options={{ title: 'Issue details' }}>{({ navigation, route }) => <IssueDetailsScreen issueId={route.params.issueId} canResolve onResolve={() => navigation.navigate('Resolution', { issueId: route.params.issueId })} canSupport={false} />}</Stack.Screen>
      <Stack.Screen name="Resolution" options={{ title: 'Submit resolution' }}>{({ navigation, route }) => <ResolutionScreen issueId={route.params.issueId} onSubmitted={() => navigation.replace('Details', { issueId: route.params.issueId })} />}</Stack.Screen>
      <Stack.Screen name="Profile" options={{ title: 'Profile' }}>{() => <ProfileScreen role={session.role} onSignOut={signOut} />}</Stack.Screen>
      <Stack.Screen name="Notifications" options={{ title: 'Notifications' }}>{() => <NotificationsScreen />}</Stack.Screen>
    </> : <>
      <Stack.Screen name="Tabs" options={{ headerShown: false }}>{() => <CitizenTabs onSignOut={signOut} />}</Stack.Screen>
      <Stack.Screen name="Details" options={{ title: 'Issue details' }}>{({ route }) => <IssueDetailsScreen issueId={route.params.issueId} />}</Stack.Screen>
      <Stack.Screen name="Resolution" options={{ title: 'Submit resolution' }}>{({ route }) => <ResolutionScreen issueId={route.params.issueId} onSubmitted={() => undefined} />}</Stack.Screen>
    </>}
  </Stack.Navigator></NavigationContainer>;
}
