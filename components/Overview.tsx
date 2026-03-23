'use client';

import React from 'react';
import { Users, Calendar, ClipboardList, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface OverviewProps {
  stats: {
    patients: number;
    appointments: number;
    consultations: number;
  };
}

export default function Overview({ stats }: OverviewProps) {
  const statCards = [
    { 
      label: 'Patients Total', 
      value: stats.patients.toLocaleString(), 
      change: '+0%', 
      color: 'bg-blue-500', 
      icon: Users,
      description: 'Total des patients enregistrés'
    },
    { 
      label: 'Rendez-vous', 
      value: stats.appointments.toLocaleString(), 
      change: '+0%', 
      color: 'bg-emerald-500', 
      icon: Calendar,
      description: 'Rendez-vous prévus'
    },
    { 
      label: 'Consultations', 
      value: stats.consultations.toLocaleString(), 
      change: '+0%', 
      color: 'bg-amber-500', 
      icon: ClipboardList,
      description: 'Consultations effectuées'
    },
  ];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {statCards.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                <stat.icon size={28} />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">
                <TrendingUp size={14} />
                {stat.change}
              </div>
            </div>
            <p className="text-slate-500 font-medium">{stat.label}</p>
            <h3 className="text-4xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            <p className="text-slate-400 text-sm mt-4">{stat.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity or Quick Actions could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Activités Récentes</h3>
          <div className="space-y-6">
            <p className="text-slate-500 text-center py-12 italic">Aucune activité récente à afficher.</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Prochains Rendez-vous</h3>
          <div className="space-y-6">
            <p className="text-slate-500 text-center py-12 italic">Aucun rendez-vous prévu pour le moment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
