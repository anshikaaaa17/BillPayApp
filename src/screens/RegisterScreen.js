import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Btn, Input, AlertBox, PasswordStrength } from '../components/UI';

export default function RegisterScreen({ navigation }) {
  const { t } = useTheme();
  const { register, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' });
  const [errors, setErrors] = useState({});
  const [formErr, setFormErr] = useState('');

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: '' })); setFormErr(''); };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (!/^\+?[0-9\s]{8,}$/.test(form.phone)) e.phone = 'Enter a valid mobile number';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    const checks = [form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[^a-zA-Z0-9]/.test(form.password)];
    if (checks.filter(Boolean).length < 2) e.password = 'Password is too weak';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step === 1) { if (validateStep1()) setStep(2); }
    else {
      if (!validateStep2()) return;
      try { await register(form); }
      catch (err) { setFormErr(err.message); }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Platform.OS === 'ios' ? 48 : 16, marginBottom: 28 }}>
          <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
            <Ionicons name="arrow-back" size={24} color={t.textSub} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '500', color: t.text }}>Create account</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
          {[1,2].map(n => <View key={n} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: step >= n ? t.primary : t.border }} />)}
        </View>
        <AlertBox message={formErr} />
        {step === 1 ? (<>
          <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>Step 1 of 2 — Personal details</Text>
          <Input label="Full name" value={form.name} onChangeText={v=>set('name',v)} placeholder="Anshika Uppal" autoCapitalize="words" error={errors.name} />
          <Input label="Email address" value={form.email} onChangeText={v=>set('email',v)} placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
          <Input label="Mobile number" value={form.phone} onChangeText={v=>set('phone',v)} placeholder="+65 9123 4567" keyboardType="phone-pad" error={errors.phone} hint="Used for OTP verification" />
        </>) : (<>
          <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>Step 2 of 2 — Set your password</Text>
          <Input label="Password" value={form.password} onChangeText={v=>set('password',v)} placeholder="Min 8 characters" secureTextEntry error={errors.password} />
          <PasswordStrength password={form.password} />
          <Input label="Confirm password" value={form.confirm} onChangeText={v=>set('confirm',v)} placeholder="Repeat your password" secureTextEntry error={errors.confirm} />
        </>)}
        <View style={{ marginTop: 8 }}>
          <Btn label={step === 1 ? 'Continue' : loading ? 'Creating account...' : 'Create account'} onPress={handleNext} loading={step === 2 && loading} />
        </View>
        {step === 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ fontSize: 14, color: t.textSub }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ fontSize: 14, color: t.primary, fontWeight: '500' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
