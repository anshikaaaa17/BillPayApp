import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen          from "./src/screens/LoginScreen";
import RegisterScreen       from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen           from "./src/screens/HomeScreen";
import PayScreen            from "./src/screens/PayScreen";
import ConfirmScreen        from "./src/screens/ConfirmScreen";
import InsightsScreen       from "./src/screens/InsightsScreen";
import HistoryScreen        from "./src/screens/HistoryScreen";
import ProfileScreen        from "./src/screens/ProfileScreen";
import TopUpScreen          from "./src/screens/TopUpScreen";
import LinkBillerScreen     from "./src/screens/LinkBillerScreen";
import PersonalDetailsScreen from "./src/screens/PersonalDetailsScreen";
import ChangePasswordScreen  from "./src/screens/ChangePasswordScreen";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = {
  Home:     { active:"home",      inactive:"home-outline"      },
  Pay:      { active:"card",      inactive:"card-outline"      },
  Insights: { active:"bar-chart", inactive:"bar-chart-outline" },
  History:  { active:"time",      inactive:"time-outline"      },
  Profile:  { active:"person",    inactive:"person-outline"    },
};

function MainTabs() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: t.primary,
      tabBarInactiveTintColor: t.textHint,
      tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginBottom: 2 },
      // Add the device's bottom inset so the Android nav bar / iOS home indicator
      // doesn't sit on top of the tabs and swallow taps.
      tabBarStyle: {
        backgroundColor: t.surface,
        borderTopColor: t.border,
        borderTopWidth: 0.5,
        paddingTop: 4,
        paddingBottom: insets.bottom,
        height: 60 + insets.bottom,
      },
      tabBarIcon: ({ focused, color }) => {
        const icons = TAB_ICONS[route.name];
        return <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />;
      },
    })}>
      <Tab.Screen name="Home"     component={HomeScreen}     />
      <Tab.Screen name="Pay"      component={PayScreen}      />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="History"  component={HistoryScreen}  />
      <Tab.Screen name="Profile"  component={ProfileScreen}  />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"        component={MainTabs}        />
      <Stack.Screen name="Confirm"     component={ConfirmScreen}    options={{ presentation: "modal" }} />
      <Stack.Screen name="TopUp"       component={TopUpScreen}      options={{ presentation: "modal" }} />
      <Stack.Screen name="LinkBiller"  component={LinkBillerScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="ChangePassword"  component={ChangePasswordScreen} />
      <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen}          />
      <Stack.Screen name="Register"       component={RegisterScreen}       />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
