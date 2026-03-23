'use client';

import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Globe, 
  Mail, 
  Lock,
  Save,
  Hospital
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Dr. Khadim',
    email: 'keurkhadimmultiservice@gmail.com',
    bio: 'Médecin principal à la Clinique TOUBA.'
  });

  const sections = [
    { id: 'profile', name: 'Profil', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'clinic', name: 'Clinique', icon: Hospital },
    { id: 'data', name: 'Données', icon: Database },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // In a real app, we would update the backend here
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Paramètres</h2>
          <p className="text-slate-500 mt-1">Gérez vos préférences de compte et les configurations de la clinique.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="md:w-64 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeSection === section.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              <section.icon size={18} />
              {section.name}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">
              {sections.find(s => s.id === activeSection)?.name}
            </h3>
          </div>

          <div className="p-8 space-y-8">
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 border-2 border-emerald-200">
                    <User size={32} />
                  </div>
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Changer la photo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nom complet</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Adresse e-mail</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Bio / Description</label>
                  <textarea 
                    rows={3}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                    placeholder="Parlez-nous de vous..."
                  ></textarea>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                {[
                  { title: 'Rappels de rendez-vous', desc: 'Recevoir des notifications pour les rendez-vous à venir.' },
                  { title: 'Nouveaux messages', desc: 'Être alerté lors de la réception de nouveaux messages patients.' },
                  { title: 'Rapports hebdomadaires', desc: 'Recevoir un résumé des activités de la clinique par e-mail.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-emerald-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <Lock size={18} />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Changer le mot de passe</h4>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="password" 
                      placeholder="Mot de passe actuel"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                    <input 
                      type="password" 
                      placeholder="Nouveau mot de passe"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'clinic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nom de la clinique</label>
                    <input 
                      type="text" 
                      defaultValue="Clinique TOUBA"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Téléphone</label>
                    <input 
                      type="tel" 
                      defaultValue="+221 33 800 00 00"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Adresse</label>
                  <input 
                    type="text" 
                    defaultValue="Dakar, Sénégal"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                  />
                </div>
              </div>
            )}

            {activeSection === 'data' && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-sm font-bold text-amber-800">Zone de danger</p>
                  <p className="text-xs text-amber-600 mt-1">L&apos;exportation ou la suppression de données sont des actions irréversibles.</p>
                </div>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900">Exporter toutes les données</p>
                      <p className="text-xs text-slate-500">Télécharger une archive de tous les dossiers patients.</p>
                    </div>
                    <Database size={18} className="text-slate-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl hover:bg-red-100 transition-all group">
                    <div className="text-left">
                      <p className="text-sm font-bold text-red-600">Supprimer le compte</p>
                      <p className="text-xs text-red-400">Toutes vos données seront définitivement effacées.</p>
                    </div>
                    <Shield size={18} className="text-red-400 group-hover:text-red-600" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <p className="text-xs text-slate-400 italic">Dernière mise à jour : Aujourd&apos;hui à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
