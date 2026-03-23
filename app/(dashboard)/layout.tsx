'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';
import { UserCircle, Bell } from 'lucide-react';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Fetch user profile
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            // Fallback
            setUserProfile({
              name: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
              role: 'Personnel',
              email: user.email
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-slate-900">
              {pathname === '/dashboard' ? 'Tableau de bord' : 
               pathname === '/patients' ? 'Patients' :
               pathname === '/appointments' ? 'Rendez-vous' :
               pathname === '/doctors' ? 'Médecins' :
               pathname === '/records' ? 'Dossiers médicaux' :
               pathname === '/billing' ? 'Facturation' :
               pathname === '/settings' ? 'Paramètres' : 'Clinique TOUBA'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-2.5 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{userProfile?.name || user?.displayName || 'Utilisateur'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{userProfile?.role || 'Personnel'}</p>
              </div>
              <div className="w-8 h-8 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400 relative">
                {user?.photoURL ? (
                  <Image 
                    src={user.photoURL} 
                    alt="Profile" 
                    fill 
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCircle size={20} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
