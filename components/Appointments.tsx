'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { Search, Plus, Calendar as CalendarIcon, Clock, User, MoreVertical, Filter, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    status: 'scheduled',
    notes: ''
  });

  useEffect(() => {
    // Fetch appointments
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppointments(appointmentData);
      setLoading(false);
    });

    // Fetch patients for selection
    const fetchPatients = async () => {
      const snapshot = await getDocs(collection(db, 'patients'));
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    // Fetch doctors for selection
    const fetchDoctors = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setDoctors(snapshot.docs.filter(doc => doc.data().role === 'doctor').map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchPatients();
    fetchDoctors();

    return () => unsubscribe();
  }, []);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const appointmentDateTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
      await addDoc(collection(db, 'appointments'), {
        patientId: newAppointment.patientId,
        doctorId: newAppointment.doctorId,
        date: Timestamp.fromDate(appointmentDateTime),
        status: newAppointment.status,
        notes: newAppointment.notes,
        createdAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewAppointment({
        patientId: '',
        doctorId: '',
        date: '',
        time: '',
        status: 'scheduled',
        notes: ''
      });
    } catch (error) {
      console.error("Error adding appointment:", error);
    }
  };

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'Patient Inconnu';
  const getDoctorName = (id: string) => doctors.find(d => d.id === id)?.name || 'Docteur Inconnu';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold"><AlertCircle size={14} /> Prévu</span>;
      case 'completed': return <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold"><CheckCircle2 size={14} /> Terminé</span>;
      case 'cancelled': return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold"><XCircle size={14} /> Annulé</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h2 className="text-2xl font-bold text-slate-900">Gestion des Rendez-vous</h2>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={20} />
            Filtrer
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <CalendarIcon size={20} />
            Prendre Rendez-vous
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border border-slate-200 text-center">
            <CalendarIcon size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 italic">Aucun rendez-vous enregistré.</p>
          </div>
        ) : (
          appointments.map((apt) => (
            <motion.div 
              key={apt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-slate-900 border border-slate-100">
                  <span className="text-xs font-bold uppercase text-slate-400">{apt.date ? format(apt.date.toDate(), 'MMM', { locale: fr }) : ''}</span>
                  <span className="text-2xl font-black">{apt.date ? format(apt.date.toDate(), 'dd') : ''}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg text-slate-900">{getPatientName(apt.patientId)}</h4>
                    {getStatusBadge(apt.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {apt.date ? format(apt.date.toDate(), 'HH:mm') : ''}</span>
                    <span className="flex items-center gap-1.5"><User size={14} /> Dr. {getDoctorName(apt.doctorId)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Détails</button>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Prendre Rendez-vous</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>
              <form onSubmit={handleAddAppointment} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Patient</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    value={newAppointment.patientId}
                    onChange={(e) => setNewAppointment({...newAppointment, patientId: e.target.value})}
                  >
                    <option value="">Sélectionner un patient</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Docteur</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    value={newAppointment.doctorId}
                    onChange={(e) => setNewAppointment({...newAppointment, doctorId: e.target.value})}
                  >
                    <option value="">Sélectionner un docteur</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Heure</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={newAppointment.time}
                      onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Notes (Optionnel)</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    rows={3}
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Confirmer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
