import React, { createContext, useContext, useState } from 'react';

export const LIGHT = {
  mode: 'light',
  bg:         '#F9FAFB',
  surface:    '#FFFFFF',
  surface2:   '#F2F4F7',
  border:     '#E4E7EC',
  primary:    '#4F3FD4',
  primaryBg:  '#EEF0FF',
  primaryMid: '#7B6FE8',
  text:       '#101828',
  textSub:    '#475467',
  textHint:   '#98A2B3',
  success:    '#12B76A',
  successBg:  '#ECFDF3',
  danger:     '#F04438',
  dangerBg:   '#FEF3F2',
  warning:    '#F79009',
  warningBg:  '#FFFAEB',
  inputBg:    '#F9FAFB',
  card:       '#FFFFFF',
  overlay:    'rgba(0,0,0,0.45)',
};

export const DARK = {
  mode: 'dark',
  bg:         '#0F1117',
  surface:    '#1A1D2E',
  surface2:   '#252837',
  border:     '#2E3150',
  primary:    '#7B6FE8',
  primaryBg:  '#26215C',
  primaryMid: '#9D94F0',
  text:       '#F2F4F7',
  textSub:    '#98A2B3',
  textHint:   '#475467',
  success:    '#12B76A',
  successBg:  '#054325',
  danger:     '#F97066',
  dangerBg:   '#3B1212',
  warning:    '#FDB022',
  warningBg:  '#3B2000',
  inputBg:    '#252837',
  card:       '#1A1D2E',
  overlay:    'rgba(0,0,0,0.7)',
};

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const t = mode === 'dark' ? DARK : LIGHT;
  const toggle = () => setMode(m => m === 'light' ? 'dark' : 'light');
  return (
    <ThemeContext.Provider value={{ t, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
