import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { SidebarLayout } from '@/components/SidebarLayout';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <SidebarLayout>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarStyle: isDesktop ? { display: 'none' } : undefined, // Hide bottom tabs on PC
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'ホーム',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'プロジェクト',
            tabBarIcon: ({ color }) => <TabBarIcon name="briefcase" color={color} />,
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'メンバー',
            tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: '履歴',
            tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
          }}
        />
        <Tabs.Screen
          name="summary"
          options={{
            title: 'サマリー',
            tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: '設定',
            tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          }}
        />
      </Tabs>
    </SidebarLayout>
  );
}
