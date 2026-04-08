import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AuthResponse, MeResponse, OnboardingInput } from '@sos/shared';

const palette = {
  background: '#0E0C1E',
  text: '#F4EFE8',
  copper: '#C9A27A',
  surface: '#161422',
  input: '#1E1B30',
  border: '#8E6E52',
  muted: '#9A948C',
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:4000';

type Screen = 'login' | 'signup' | 'onboarding' | 'summary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [onboardingForm, setOnboardingForm] = useState<OnboardingInput>({ birthDate: '', birthTime: '', timeUnknown: false, locationText: '' });

  useEffect(() => {
    AsyncStorage.getItem('sos-token').then(async (stored) => {
      if (!stored) {
        setBooting(false);
        return;
      }
      setToken(stored);
      try {
        const profile = await fetchMe(stored);
        setMe(profile);
        setScreen(profile.user.onboardingComplete ? 'summary' : 'onboarding');
      } catch {
        await AsyncStorage.removeItem('sos-token');
      } finally {
        setBooting(false);
      }
    });
  }, []);

  const title = useMemo(() => {
    if (screen === 'signup') return 'Create your SOS account';
    if (screen === 'onboarding') return 'Enter your birth data';
    if (screen === 'summary') return 'Your natal chart';
    return 'Welcome back';
  }, [screen]);

  async function handleAuth(path: 'signup' | 'login') {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || 'Authentication failed');
      }
      const auth = body as AuthResponse;
      await AsyncStorage.setItem('sos-token', auth.token);
      setToken(auth.token);
      const profile = await fetchMe(auth.token);
      setMe(profile);
      setScreen(profile.user.onboardingComplete ? 'summary' : 'onboarding');
    } catch (error) {
      Alert.alert('Auth failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOnboarding() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(onboardingForm),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message || 'Onboarding failed');
      }
      const profile = await fetchMe(token);
      setMe(profile);
      setScreen('summary');
    } catch (error) {
      Alert.alert('Could not save birth data', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMe(currentToken: string) {
    const response = await fetch(`${apiUrl}/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) throw new Error('Session expired');
    return (await response.json()) as MeResponse;
  }

  async function logout() {
    await AsyncStorage.removeItem('sos-token');
    setToken(null);
    setMe(null);
    setAuthForm({ email: '', password: '' });
    setOnboardingForm({ birthDate: '', birthTime: '', timeUnknown: false, locationText: '' });
    setScreen('login');
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}><ActivityIndicator color={palette.copper} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.wordmark}>SOS</Text>
        <Text style={styles.title}>{title}</Text>

        {(screen === 'login' || screen === 'signup') && (
          <View style={styles.card}>
            <Field label="Email" value={authForm.email} onChangeText={(email) => setAuthForm((current) => ({ ...current, email }))} />
            <Field label="Password" secureTextEntry value={authForm.password} onChangeText={(password) => setAuthForm((current) => ({ ...current, password }))} />
            <Pressable style={styles.button} onPress={() => handleAuth(screen)} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Saving...' : screen === 'signup' ? 'Create account' : 'Log in'}</Text>
            </Pressable>
            <Pressable onPress={() => setScreen(screen === 'signup' ? 'login' : 'signup')}>
              <Text style={styles.link}>{screen === 'signup' ? 'Already have an account? Log in' : 'Need an account? Sign up'}</Text>
            </Pressable>
          </View>
        )}

        {screen === 'onboarding' && (
          <View style={styles.card}>
            <Field label="Birth date" value={onboardingForm.birthDate} onChangeText={(birthDate) => setOnboardingForm((current) => ({ ...current, birthDate }))} placeholder="YYYY-MM-DD" />
            <Field label="Birth time" value={onboardingForm.birthTime ?? ''} onChangeText={(birthTime) => setOnboardingForm((current) => ({ ...current, birthTime }))} placeholder="HH:MM" />
            <Field label="Birth location" value={onboardingForm.locationText} onChangeText={(locationText) => setOnboardingForm((current) => ({ ...current, locationText }))} placeholder="City, state, country" />
            <Pressable style={[styles.button, onboardingForm.timeUnknown && styles.buttonSecondary]} onPress={() => setOnboardingForm((current) => ({ ...current, timeUnknown: !current.timeUnknown }))}>
              <Text style={styles.buttonText}>{onboardingForm.timeUnknown ? 'Exact time unknown' : 'I know the exact time'}</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={handleOnboarding} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Generating...' : 'Generate natal chart'}</Text>
            </Pressable>
          </View>
        )}

        {screen === 'summary' && me && (
          <View style={styles.card}>
            <Text style={styles.summaryLead}>{me.birthData?.normalizedLocation}</Text>
            <Text style={styles.copy}>Sun {me.natalChart?.placements.find((item) => item.key === 'sun')?.sign}, Moon {me.natalChart?.placements.find((item) => item.key === 'moon')?.sign}, Rising {me.natalChart?.angles.ascendant.sign}</Text>
            <View style={styles.summaryList}>
              {me.natalChart?.placements.slice(0, 5).map((placement) => (
                <Text key={placement.key} style={styles.summaryItem}>{placement.label}: {placement.degree}° {placement.sign}</Text>
              ))}
            </View>
            <Pressable style={styles.button} onPress={logout}>
              <Text style={styles.buttonText}>Log out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={palette.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  container: { padding: 24, gap: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  wordmark: { color: palette.copper, fontSize: 48, fontWeight: '700', letterSpacing: 14, textAlign: 'center', marginTop: 24 },
  title: { color: palette.text, fontSize: 28, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 10, padding: 20, gap: 16 },
  field: { gap: 8 },
  label: { color: palette.text, fontSize: 14 },
  input: { minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.input, color: palette.text, paddingHorizontal: 16 },
  button: { minHeight: 52, borderRadius: 10, backgroundColor: palette.copper, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  buttonSecondary: { backgroundColor: palette.input, borderWidth: 1, borderColor: palette.border },
  buttonText: { color: palette.background, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  link: { color: palette.copper, fontSize: 14, textAlign: 'center' },
  summaryLead: { color: palette.copper, fontSize: 18, fontWeight: '600' },
  copy: { color: palette.text, fontSize: 15, lineHeight: 22 },
  summaryList: { gap: 8 },
  summaryItem: { color: palette.text, fontSize: 14 },
});
