import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Btn, Input, OtpInput, AlertBox, PasswordStrength } from '../components/UI';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTheme();
  const { sendOtp, resetPassword } = useAuth();
  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [otpCode, setOtpCode]   = useState('');
  const [otpError, setOtpError] = useState('');
  const [sentInfo, setSentInfo] = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [cnfPwd, setCnfPwd]     = useState('');
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [resendCd, setResendCd] = useState(0);

  useEffect(() => {
    if (resendCd <= 0) return;
    const timer = setTimeout(() => setResendCd(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCd]);

  const handleSendOtp = async () => {
    if (!email.includes('@')) { setErrors({ email: 'Enter a valid email' }); return; }
    setLoading(true);
    try {
      const res = await sendOtp(email);
      setSentInfo(res?.message || `Verification code sent to ${email}.`);
      setStep(2);
      setResendCd(60);
    }
    catch (err) { setErrors({ email: err.message }); }
    setLoading(false);
  };

  // The code is verified by the server during the reset call — never on the device.
  const handleOtpComplete = (code) => {
    setOtpCode(code);
    setOtpError('');
    setStep(3);
  };

  const handleReset = async () => {
    const e = {};
    if (newPwd.length < 8) e.pwd = 'Password must be at least 8 characters';
    if (newPwd !== cnfPwd) e.cnf = 'Passwords do not match';
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await resetPassword(email, otpCode, newPwd);
      setStep(4);
    } catch (err) {
      // Wrong or expired code sends the user back to the code entry step
      setOtpError(err.message || 'Could not reset password.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  if (step === 4) return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="checkmark" size={38} color={t.success} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '500', color: t.text, marginBottom: 10, textAlign: 'center' }}>Password reset!</Text>
      <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
        Your password has been updated. Sign in with your new password.
      </Text>
      <Btn label="Back to sign in" onPress={() => navigation.navigate('Login')} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Platform.OS === 'ios' ? 48 : 16, marginBottom: 28 }}>
          <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(s => s - 1)}>
            <Ionicons name="arrow-back" size={24} color={t.textSub} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '500', color: t.text }}>Reset password</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
          {[1,2,3].map(n => <View key={n} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: step >= n ? t.primary : t.border }} />)}
        </View>
        {step === 1 && (<>
          <Text style={{ fontSize: 14, color: t.textSub, marginBottom: 24, lineHeight: 20 }}>
            Enter your registered email and we will send a 6-digit verification code.
          </Text>
          <Input label="Email address" value={email} onChangeText={v => { setEmail(v); setErrors({}); }}
                 placeholder="you@email.com" keyboardType="email-address" error={errors.email} />
          <Btn label={loading ? 'Sending code...' : 'Send code'} onPress={handleSendOtp} loading={loading} />
        </>)}
        {step === 2 && (<>
          <Text style={{ fontSize: 14, color: t.textSub, marginBottom: 6, lineHeight: 20 }}>
            Enter the 6-digit code sent to <Text style={{ fontWeight: '500', color: t.text }}>{email}</Text>
          </Text>
          {!!sentInfo && (
            <View style={{ backgroundColor: t.primaryBg, borderRadius: 10, padding: 10, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, color: t.primary, textAlign: 'center' }}>{sentInfo}</Text>
            </View>
          )}
          <OtpInput onComplete={handleOtpComplete} error={otpError} />
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            {resendCd > 0
              ? <Text style={{ fontSize: 13, color: t.textHint }}>Resend code in {resendCd}s</Text>
              : <TouchableOpacity onPress={handleSendOtp}><Text style={{ fontSize: 13, color: t.primary, fontWeight: '500' }}>Resend code</Text></TouchableOpacity>
            }
          </View>
        </>)}
        {step === 3 && (<>
          <Text style={{ fontSize: 14, color: t.textSub, marginBottom: 24 }}>Create a new password for your account.</Text>
          <Input label="New password" value={newPwd} onChangeText={v=>{setNewPwd(v);setErrors({})}} placeholder="Min 8 characters" secureTextEntry error={errors.pwd} />
          <PasswordStrength password={newPwd} />
          <Input label="Confirm new password" value={cnfPwd} onChangeText={v=>{setCnfPwd(v);setErrors({})}} placeholder="Repeat password" secureTextEntry error={errors.cnf} />
          <Btn label={loading ? 'Resetting...' : 'Reset password'} onPress={handleReset} loading={loading} />
        </>)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
