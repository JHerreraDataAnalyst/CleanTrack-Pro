import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth();
  const navigationState = useRootNavigationState();

  // Wait for navigation to be ready
  useEffect(() => {
    if (navigationState?.key && user) {
      if (user.role === 'ADMIN') {
        router.replace('/(tabs)/admin');
      } else {
        router.replace('/(tabs)/worker');
      }
    }
  }, [navigationState?.key, user]);

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    setLoading(true);
    try {
      const API_URL = 'http://192.168.1.137:3000/api/auth/login';
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      await login(data.token, data.user);

      // Navigation will happen in the useEffect above
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-primary justify-center items-center p-6"
    >
      <View className="w-full max-w-sm">
        {/* Header Section */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-white rounded-2xl items-center justify-center mb-4 shadow-lg shadow-black/20">
            <Text className="text-brand-primary text-3xl font-black">C</Text>
          </View>
          <Text className="text-3xl font-bold text-white mb-2 tracking-tight">CleanTrack Pro</Text>
          <Text className="text-brand-light/80 text-center text-base">Portal de Operaciones</Text>
        </View>

        {/* Glassmorphism Card */}
        <View className="bg-white/95 p-8 rounded-3xl shadow-xl shadow-black/30 border border-white/20">
          <Text className="text-brand-dark font-semibold text-lg mb-6">Iniciar Sesión</Text>

          <View className="mb-6">
            <Text className="text-gray-500 mb-2 font-medium text-sm">Correo Electrónico</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-brand-dark text-base"
              placeholder="tu@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity
            className={`bg-brand-primary py-4 rounded-xl items-center shadow-md shadow-brand-primary/30 ${loading ? 'opacity-70' : ''}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg tracking-wide">Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-white/60 text-center mt-8 text-sm">
          © 2026 Causa Multiservices
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}