'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  FileText, 
  CreditCard, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Hospital
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Rendez-vous', href: '/appointments', icon: Calendar },
  { name: 'Médecins', href: '/doctors', icon: Stethoscope },
  { name: 'Dossiers médicaux', href: '/records', icon: FileText },
  { name: 'Facturation', href: '/billing', icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 shadow-sm lg:static lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                  <Hospital size={20} />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 text-base leading-tight">TOUBA</h1>
                  <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Clinique</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm",
                        isActive 
                          ? "bg-emerald-50 text-emerald-700 font-semibold" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <item.icon 
                        size={18} 
                        className={cn(
                          "transition-colors",
                          isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                        )} 
                      />
                      <span>{item.name}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="active-pill"
                          className="ml-auto w-1 h-1 rounded-full bg-emerald-600"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="p-3 border-t border-slate-100 space-y-0.5">
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                    pathname === '/settings' ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Settings size={18} className={pathname === '/settings' ? "text-emerald-600" : "text-slate-400"} />
                  <span>Paramètres</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-all text-sm"
                >
                  <LogOut size={18} className="text-red-400" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
