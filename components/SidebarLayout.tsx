import { usePathname, useRouter } from 'expo-router';
import { BarChart2, Briefcase, History, Home, Settings, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const MENU_ITEMS = [
  { name: 'ホーム', path: '/', icon: Home },
  { name: 'プロジェクト', path: '/projects', icon: Briefcase },
  { name: 'メンバー', path: '/members', icon: Users },
  { name: '履歴', path: '/history', icon: History },
  { name: 'サマリー', path: '/summary', icon: BarChart2 },
  { name: '設定', path: '/settings', icon: Settings },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; // 768px as breakpoint for iPad/Desktop
  const router = useRouter();
  const pathname = usePathname();

  if (!isDesktop) {
    // Mobile mode: render children (Tabs) normally
    return <View style={styles.mobileContainer}>{children}</View>;
  }

  // Desktop mode: render Sidebar + Children side-by-side
  return (
    <View style={styles.desktopContainer}>
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Protoduct</Text>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            const isActive =
              pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <TouchableOpacity
                key={item.path}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => router.navigate(item.path as any)}
              >
                <Icon size={24} color={isActive ? '#16a34a' : '#64748b'} />
                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* We wrap the inner content to center it max-width like standard SaaS */}
        <View style={styles.innerContent}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 40,
    paddingHorizontal: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  menuItemActive: {
    backgroundColor: '#f0fdf4',
  },
  menuText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  menuTextActive: {
    color: '#16a34a',
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  innerContent: {
    flex: 1,
  },
});
