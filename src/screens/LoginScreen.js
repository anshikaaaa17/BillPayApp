import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Btn, Input, Divider, AlertBox } from '../components/UI';

export default function LoginScreen({ navigation }) {
  const { t } = useTheme();
  const { loginWithEmail, loginWithGoogle, loading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked]     = useState(false);
  const [formErr, setFormErr]   = useState('');

  const validate = () => {
    const e = {};
    if (!email.includes('@')) e.email    = 'Enter a valid email address';
    if (password.length < 6)  e.password = 'Password is too short';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (locked || !validate()) return;
    setFormErr('');
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 3) { setLocked(true); setFormErr('Account locked after 3 failed attempts. Reset your password.'); }
      else setFormErr(`${err.message}. ${3 - next} attempt(s) remaining.`);
    }
  };

  const handleGoogle = async () => {
    try { await loginWithGoogle(); }
    catch (err) { setFormErr('Google sign in failed. Please try again.'); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: t.primary,
                         alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Ionicons name="card" size={32} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '500', color: t.text, marginBottom: 4 }}>BillPay</Text>
          <Text style={{ fontSize: 14, color: t.textSub }}>Integrated Bill Payment App</Text>
        </View>
        <AlertBox message={formErr} type="danger" />
        <Input label="Email address" value={email} onChangeText={v => { setEmail(v); setFormErr(''); setErrors({}); }}
               placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
        <Input label="Password" value={password} onChangeText={v => { setPassword(v); setFormErr(''); setErrors({}); }}
               placeholder="Enter your password" secureTextEntry error={errors.password} />
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}
          style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -6 }}>
          <Text style={{ fontSize: 13, color: t.primary, fontWeight: '500' }}>Forgot password?</Text>
        </TouchableOpacity>
        <Btn label={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} loading={loading} disabled={locked} />
        {/* Google sign-in intentionally hidden: /auth/google does not verify the
            token server-side yet, so it cannot be treated as real authentication.
            Documented as future work. */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 4 }}>
          <Text style={{ fontSize: 14, color: t.textSub }}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ fontSize: 14, color: t.primary, fontWeight: '500' }}>Sign up</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, color: t.textHint, textAlign: 'center', marginTop: 24, lineHeight: 17 }}>
          By signing in, you agree to our Terms of Service and Privacy Policy.{'\n'}Your data is encrypted end-to-end.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
