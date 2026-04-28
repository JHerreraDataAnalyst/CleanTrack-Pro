import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SitesScreen() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const API_URL = 'http://192.168.1.137:3000/api/workers/my-sites';

  useEffect(() => {
    const fetchSites = async () => {
      if (!user) return;
      try {
        const response = await fetch(`${API_URL}?workerId=${user.id}`);
        const data = await response.json();
        setSites(data);
      } catch (error) {
        console.error('Error fetching sites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [user]);

  const openGoogleMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir Google Maps');
      }
    });
  };

  return (
    <ScrollView className="flex-1 bg-brand-light p-4">
      <Text className="text-2xl font-bold text-brand-dark mb-2 mt-2">Mis Sedes</Text>
      <Text className="text-gray-500 mb-6 text-sm">Estas son las ubicaciones a las que has sido asignado.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
      ) : sites.length === 0 ? (
        <View className="items-center justify-center p-10">
          <Text className="text-gray-500 text-center">No tienes sedes asignadas aún.</Text>
        </View>
      ) : (
        sites.map((site) => (
          <View key={site.id} className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-xl font-bold text-brand-dark">{site.street}</Text>
                <Text className="text-gray-500 mt-1">{site.city}{site.zipCode ? `, ${site.zipCode}` : ''}</Text>
              </View>
              <View className="bg-blue-50 p-3 rounded-full">
                <IconSymbol name="house.fill" size={24} color="#0066FF" />
              </View>
            </View>

            {site.contactPhone && (
              <View className="flex-row items-center mb-3">
                <IconSymbol name="bell.fill" size={16} color="#4B5563" />
                <Text className="text-gray-600 ml-2 font-medium">Contacto: {site.contactPhone}</Text>
              </View>
            )}

            {site.instructions && (
              <View className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-4">
                <Text className="text-yellow-800 font-semibold mb-1">Instrucciones Especiales:</Text>
                <Text className="text-yellow-700 leading-5">{site.instructions}</Text>
              </View>
            )}

            <TouchableOpacity 
              className="bg-brand-primary py-3 rounded-xl flex-row justify-center items-center mt-2 shadow-sm"
              onPress={() => openGoogleMaps(site.street, site.city)}
            >
              <IconSymbol name="map.fill" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Cómo llegar</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
