import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getCat } from '../utils/constants';

export function Badge({ cat }) {
  const { t, mode } = useTheme();
  const c = getCat(cat, mode);
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '500', color: c.text }}>{cat}</Text>
    </View>
  );
}

export function Btn({ label, onPress, variant = 'primary', disabled = false, loading = false, full = true, size = 'md' }) {
  const { t } = useTheme();
  const variants = {
    primary: { bg: disabled ? t.textHint : t.primary, text: '#FFFFFF', border: 'transparent' },
    outline: { bg: 'transparent', text: t.primary, border: t.primary },
    ghost:   { bg: 'transparent', text: t.textSub, border: t.border },
    danger:  { bg: t.danger, text: '#FFFFFF', border: 'transparent' },
    google:  { bg: '#FFFFFF', text: '#3C4043', border: '#DADCE0' },
  };
  const v = variants[variant] || variants.primary;
  const py = size === 'sm' ? 9 : size === 'lg' ? 15 : 13;
  return (
    <TouchableOpacity onPress={disabled || loading ? undefined : onPress} activeOpacity={0.8}
      style={{ backgroundColor: v.bg, borderRadius: 12, paddingVertical: py, paddingHorizontal: 20,
               borderWidth: 1, borderColor: v.border, flexDirection: 'row', alignItems: 'center',
               justifyContent: 'center', gap: 8, width: full ? '100%' : undefined, opacity: disabled ? 0.6 : 1 }}>
      {loading && <ActivityIndicator size="small" color={v.text} />}
      <Text style={{ fontSize: size === 'sm' ? 13 : 15, fontWeight: '500', color: v.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Input({ label, value, onChangeText, placeholder, secureTextEntry,
                        keyboardType = 'default', error, hint, autoCapitalize = 'none',
                        rightElement, editable = true }) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={{ fontSize: 13, fontWeight: '500', color: t.textSub, marginBottom: 5 }}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
                     borderColor: error ? t.danger : focused ? t.primary : t.border,
                     borderRadius: 10, backgroundColor: t.inputBg }}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={t.textHint} secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType} autoCapitalize={autoCapitalize} editable={editable}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
                   paddingHorizontal: 14, fontSize: 14, color: t.text }} />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} style={{ paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 12, color: t.textHint }}>{visible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
        {rightElement && <View style={{ paddingRight: 12 }}>{rightElement}</View>}
      </View>
      {error && <Text style={{ fontSize: 12, color: t.danger, marginTop: 4 }}>{error}</Text>}
      {hint && !error && <Text style={{ fontSize: 12, color: t.textHint, marginTop: 4 }}>{hint}</Text>}
    </View>
  );
}

export function OtpInput({ onComplete, error }) {
  const { t } = useTheme();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const refs = Array(6).fill(null).map(() => React.createRef());
  const handleChange = (val, idx) => {
    const newOtp = [...otp];
    newOtp[idx] = val.replace(/[^0-9]/g, '').slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) refs[idx + 1].current?.focus();
    if (newOtp.every(v => v)) onComplete(newOtp.join(''));
  };
  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      const newOtp = [...otp]; newOtp[idx - 1] = '';
      setOtp(newOtp); refs[idx - 1].current?.focus();
    }
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {otp.map((v, i) => (
          <TextInput key={i} ref={refs[i]} value={v} onChangeText={val => handleChange(val, i)}
            onKeyPress={e => handleKeyPress(e, i)} keyboardType="number-pad" maxLength={1}
            style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: '500',
                     borderRadius: 10, borderWidth: 2,
                     borderColor: error ? t.danger : v ? t.primary : t.border,
                     backgroundColor: t.inputBg, color: t.text }} />
        ))}
      </View>
      {error && <Text style={{ fontSize: 13, color: t.danger, textAlign: 'center', marginTop: 8 }}>{error}</Text>}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const { t } = useTheme();
  const s = { backgroundColor: t.surface, borderRadius: 14, borderWidth: 0.5, borderColor: t.border, ...style };
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s}>{children}</TouchableOpacity>;
  return <View style={s}>{children}</View>;
}

export function SectionLabel({ text }) {
  const { t } = useTheme();
  return <Text style={{ fontSize: 11, fontWeight: '500', color: t.textHint, letterSpacing: 0.5,
                        textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>{text}</Text>;
}

export function Divider() {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
      <View style={{ flex: 1, height: 0.5, backgroundColor: t.border }} />
      <Text style={{ fontSize: 12, color: t.textHint }}>or</Text>
      <View style={{ flex: 1, height: 0.5, backgroundColor: t.border }} />
    </View>
  );
}

export function PasswordStrength({ password }) {
  const { t } = useTheme();
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['', t.danger, t.warning, t.warning, t.success];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(n => (
          <View key={n} style={{ flex: 1, height: 3, borderRadius: 99,
            backgroundColor: score >= n ? colors[score] : t.border }} />
        ))}
      </View>
      <Text style={{ fontSize: 12, color: colors[score], marginBottom: 8 }}>{labels[score]}</Text>
      {checks.map(c => (
        <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Ionicons name={c.ok ? 'checkmark-circle' : 'ellipse-outline'} size={14}
                    color={c.ok ? t.success : t.textHint} />
          <Text style={{ fontSize: 12, color: c.ok ? t.success : t.textHint }}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function AlertBox({ message, type = 'danger' }) {
  const { t } = useTheme();
  const colors = {
    danger:  { bg: t.dangerBg,  text: t.danger  },
    success: { bg: t.successBg, text: t.success },
    warning: { bg: t.warningBg, text: t.warning },
    info:    { bg: t.primaryBg, text: t.primary },
  };
  const c = colors[type];
  if (!message) return null;
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 10, padding: 12, marginBottom: 14 }}>
      <Text style={{ fontSize: 13, color: c.text, lineHeight: 18 }}>{message}</Text>
    </View>
  );
}
