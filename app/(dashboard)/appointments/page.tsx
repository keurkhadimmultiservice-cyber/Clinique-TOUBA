'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Stethoscope, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  addWeeks, 
  subWeeks, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import ConfirmationModal from '@/components/ConfirmationModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const path = 'appointments';
    let unsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, path), orderBy('date', 'desc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
            };
          });
          setAppointments(docs);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        });
      } else {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const calendarDays = React.useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    });
  }, [currentDate]);

  // Form state
  const [formData, setFormData] = useState({
    patient: '',
    doctor: 'Dr. Khadim',
    type: 'Consultation',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    notes: ''
  });

  const filteredAppointments = React.useMemo(() => {
    return appointments.filter(apt => 
      apt.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [appointments, searchTerm]);

  const appointmentStats = React.useMemo(() => {
    const todayApts = appointments.filter(apt => isSameDay(apt.date, new Date()));
    const confirmedToday = todayApts.filter(apt => apt.status === 'Confirmé').length;
    const pendingToday = todayApts.filter(apt => apt.status === 'En attente').length;
    const totalToday = todayApts.length;
    return { totalToday, confirmedToday, pendingToday };
  }, [appointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'appointments';
    try {
      const appointmentDate = new Date(`${formData.date}T${formData.time}`);
      const newApt = {
        patient: formData.patient,
        doctor: formData.doctor,
        date: Timestamp.fromDate(appointmentDate),
        time: format(new Date(`2000-01-01T${formData.time}`), 'hh:mm a'),
        status: 'En attente',
        type: formData.type,
        notes: formData.notes,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'appointments'), newApt);
      
      setIsModalOpen(false);
      setFormData({
        patient: '',
        doctor: 'Dr. Khadim',
        type: 'Consultation',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        notes: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteAppointment = async (id: string) => {
    setAppointmentToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    const path = `appointments/${appointmentToDelete}`;
    try {
      await deleteDoc(doc(db, 'appointments', appointmentToDelete));
      setAppointmentToDelete(null);
      setIsConfirmOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const path = `appointments/${id}`;
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmé': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'En attente': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Terminé': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Annulé': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmé': return <CheckCircle2 size={14} />;
      case 'En attente': return <AlertCircle size={14} />;
      case 'Terminé': return <CheckCircle2 size={14} />;
      case 'Annulé': return <XCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Rendez-vous</h2>
          <p className="text-slate-500 mt-1">Planifiez et gérez les consultations des patients.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
            <button 
              onClick={() => setView('list')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'list' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Liste
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'calendar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Calendrier
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10"
          >
            <Plus size={16} />
            <span>Prendre rendez-vous</span>
          </button>
        </div>
      </div>

      {/* Calendar Navigation (Only for Calendar View) */}
      {view === 'calendar' && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-slate-900 text-capitalize">{currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                AUJOURD&apos;HUI
              </button>
              <button 
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {weekDays.map((day) => (
              <div 
                key={day.toString()} 
                className={`flex flex-col items-center min-w-[80px] p-2 rounded-xl transition-all ${
                  isSameDay(day, new Date()) ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                <span className="text-lg font-bold">{format(day, 'd')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher des rendez-vous..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none"
                />
              </div>
              <select className="bg-slate-50 border-none rounded-xl text-sm font-medium px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option>Tous les statuts</option>
                <option>Confirmé</option>
                <option>En attente</option>
                <option>Terminé</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredAppointments.map((apt) => (
                <motion.div 
                  key={apt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 text-center border-r border-slate-100 pr-6">
                      <p className="text-xs font-bold text-slate-400 uppercase">{apt.time.split(' ')[1]}</p>
                      <p className="text-lg font-bold text-slate-900">{apt.time.split(' ')[0]}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          {apt.patient}
                          <span className="text-xs font-medium text-slate-400">• {apt.type}</span>
                        </h4>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(apt.status)}`}>
                          {getStatusIcon(apt.status)}
                          {apt.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope size={14} className="text-slate-400" />
                          {apt.doctor}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon size={14} className="text-slate-400" />
                          {apt.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.status === 'En attente' && (
                        <button 
                          onClick={() => updateStatus(apt.id, 'Confirmé')}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Confirmer le rendez-vous"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      {apt.status === 'Confirmé' && (
                        <button 
                          onClick={() => updateStatus(apt.id, 'Terminé')}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Marquer comme terminé"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteAppointment(apt.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Supprimer le rendez-vous"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Side Info / Quick Stats */}
          <div className="space-y-6">
            <div className="bg-amber-500 rounded-3xl p-8 text-slate-900 shadow-xl shadow-amber-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Résumé d&apos;aujourd&apos;hui</h3>
                <p className="text-slate-800 text-sm mb-6 font-medium">
                  Il vous reste {appointmentStats.totalToday} rendez-vous pour aujourd&apos;hui.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <span className="text-sm font-bold">Confirmé</span>
                    <span className="text-xl font-black">{appointmentStats.confirmedToday}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <span className="text-sm font-bold">En attente</span>
                    <span className="text-xl font-black">{appointmentStats.pendingToday}</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Rappels à venir</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Suivi requis</p>
                    <p className="text-xs text-amber-700 mt-0.5">Moussa Sarr a besoin d&apos;un appel de suivi pour ses résultats de laboratoire.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold text-slate-900 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={prevMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={nextMonth}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all"
            >
              Nouveau rendez-vous
            </button>
          </div>
          
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-100 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[120px]">
            {calendarDays.map((day, i) => {
              const dayAppointments = appointments.filter(app => {
                const appDate = new Date(app.date);
                return isSameDay(appDate, day);
              });

              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div 
                  key={i} 
                  className={`p-2 border-r border-b border-slate-100 last:border-r-0 group hover:bg-slate-50/50 transition-colors relative ${!isCurrentMonth ? 'bg-slate-50/30' : ''}`}
                >
                  <span className={`text-sm font-bold ${isToday ? 'w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center' : isCurrentMonth ? 'text-slate-900' : 'text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-2 space-y-1 overflow-y-auto max-h-[70px] scrollbar-hide">
                    {dayAppointments.slice(0, 3).map((app, idx) => (
                      <div 
                        key={idx} 
                        className={`px-2 py-1 rounded text-[10px] font-bold truncate ${
                          app.status === 'Confirmé' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          app.status === 'En attente' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}
                      >
                        {app.time} - {app.patient}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-[10px] text-slate-400 font-medium pl-1">
                        + {dayAppointments.length - 3} de plus
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Modal (Placeholder) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Prendre rendez-vous</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Sélectionner le patient</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      required
                      value={formData.patient}
                      onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="Entrez le nom du patient" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Médecin</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select 
                        value={formData.doctor}
                        onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none"
                      >
                        <option>Dr. Khadim</option>
                        <option>Dr. Fall</option>
                        <option>Dr. Sy</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="Consultation">Consultation</option>
                      <option value="Bilan">Bilan</option>
                      <option value="Suivi">Suivi</option>
                      <option value="Urgence">Urgence</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Date</label>
                    <input 
                      type="date" 
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Heure</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="time" 
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Notes (Optionnel)</label>
                  <textarea 
                    rows={2} 
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none" 
                    placeholder="Motif de la visite..."
                  ></textarea>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Confirmer la réservation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer le rendez-vous"
        message="Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
}

function X({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
