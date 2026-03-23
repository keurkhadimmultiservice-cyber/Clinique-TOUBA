'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  getCountFromServer,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { Users, Calendar, Stethoscope, Activity, TrendingUp, ArrowUpRight, DollarSign, RefreshCw, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    consultations: 0,
    revenue: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch Basic Counts
      const collections = ['patients', 'appointments', 'consultations'];
      const countResults = await Promise.all(
        collections.map(col => getCountFromServer(collection(db, col)))
      );
      
      const newStats: any = {};
      collections.forEach((col, index) => {
        newStats[col] = countResults[index].data().count;
      });

      // 2. Fetch Revenue (from invoices)
      const invoicesSnap = await getDocs(collection(db, 'invoices'));
      let totalRevenue = 0;
      invoicesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'Payé') {
          totalRevenue += (data.amount || 0);
        }
      });
      newStats.revenue = totalRevenue;
      setStats(newStats);

      // 3. Fetch Recent Activity (Patients & Appointments)
      const patientsQuery = query(collection(db, 'patients'), orderBy('createdAt', 'desc'), limit(3));
      const appointmentsQuery = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'), limit(3));
      
      const [patientsSnap, appointmentsSnap] = await Promise.all([
        getDocs(patientsQuery),
        getDocs(appointmentsQuery)
      ]);

      const activity: any[] = [];
      patientsSnap.docs.forEach(doc => {
        const data = doc.data();
        activity.push({
          id: doc.id,
          type: 'patient',
          title: 'Nouveau patient',
          description: data.name,
          time: data.createdAt,
          icon: Users,
          color: 'text-blue-500'
        });
      });

      appointmentsSnap.docs.forEach(doc => {
        const data = doc.data();
        activity.push({
          id: doc.id,
          type: 'appointment',
          title: 'Nouveau rendez-vous',
          description: `${data.patient} avec ${data.doctor}`,
          time: data.createdAt,
          icon: Calendar,
          color: 'text-emerald-500'
        });
      });

      // Sort by time
      activity.sort((a, b) => {
        const timeA = a.time instanceof Timestamp ? a.time.toMillis() : new Date(a.time).getTime();
        const timeB = b.time instanceof Timestamp ? b.time.toMillis() : new Date(b.time).getTime();
        return timeB - timeA;
      });

      setRecentActivity(activity.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Mock data for the chart (would ideally be aggregated from DB)
  const chartData = useMemo(() => [
    { name: 'Jan', patients: 40, appointments: 24 },
    { name: 'Fév', patients: 30, appointments: 13 },
    { name: 'Mar', patients: 20, appointments: 98 },
    { name: 'Avr', patients: 27, appointments: 39 },
    { name: 'Mai', patients: 18, appointments: 48 },
    { name: 'Juin', patients: 23, appointments: 38 },
    { name: 'Juil', patients: 34, appointments: 43 },
  ], []);

  const formatTime = (time: any) => {
    if (!time) return 'À l\'instant';
    const date = time instanceof Timestamp ? time.toDate() : new Date(time);
    return format(date, 'HH:mm', { locale: fr });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aperçu général</h1>
          <p className="text-slate-500 text-sm">Bienvenue sur votre tableau de bord de gestion.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Patients Total', value: stats.patients.toLocaleString(), change: '+12%', color: 'bg-blue-500', icon: Users },
          { label: 'Rendez-vous', value: stats.appointments.toLocaleString(), change: '+5%', color: 'bg-emerald-500', icon: Calendar },
          { label: 'Consultations', value: stats.consultations.toLocaleString(), change: '+8%', color: 'bg-amber-500', icon: Stethoscope },
          { label: 'Revenus (CFA)', value: stats.revenue.toLocaleString(), change: '+15%', color: 'bg-indigo-500', icon: DollarSign },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                <ArrowUpRight size={14} />
                {stat.change}
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Fréquentation</h3>
              <p className="text-slate-500 text-sm">Évolution des patients et rendez-vous</p>
            </div>
            <select className="bg-slate-50 border-none text-sm font-bold text-slate-600 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20">
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="patients" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPatients)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="appointments" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorApps)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Activité récente</h3>
            <Clock size={20} className="text-slate-400" />
          </div>
          
          <div className="space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.map((item, i) => (
                <div key={item.id} className="flex items-start gap-4 relative">
                  {i !== recentActivity.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-100"></div>
                  )}
                  <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${item.color} flex-shrink-0 z-10`}>
                    <item.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate">{item.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      {formatTime(item.time)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Activity size={24} />
                </div>
                <p className="text-sm text-slate-500">Aucune activité récente</p>
              </div>
            )}
          </div>

          <button className="w-full mt-8 py-3 rounded-2xl bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all">
            Voir tout le journal
          </button>
        </div>
      </div>

      {/* Performance Summary Card */}
      <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold mb-6 border border-emerald-500/20">
              <TrendingUp size={14} />
              Performance Optimale
            </div>
            <h3 className="text-3xl font-bold mb-4 leading-tight">Croissance de la clinique</h3>
            <p className="text-slate-400 text-lg mb-8 max-w-md">
              Votre clinique a connu une croissance de 15% ce mois-ci. Continuez ainsi pour atteindre vos objectifs.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                <p className="text-slate-400 text-xs font-medium mb-1">Satisfaction</p>
                <p className="text-2xl font-bold text-emerald-400">98%</p>
              </div>
              <div className="px-6 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                <p className="text-slate-400 text-xs font-medium mb-1">Nouveaux Patients</p>
                <p className="text-2xl font-bold text-blue-400">+124</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="w-full aspect-video bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
              <div className="relative z-10 space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="h-4 bg-white/10 rounded-full w-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${80 - i * 15}%` }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
      </div>
    </div>
  );
}
