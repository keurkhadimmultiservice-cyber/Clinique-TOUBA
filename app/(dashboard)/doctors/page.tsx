'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Stethoscope, 
  Phone, 
  Mail, 
  Calendar, 
  MoreVertical, 
  Star,
  Clock,
  MapPin,
  Award,
  X,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
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

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<string | null>(null);

  useEffect(() => {
    const path = 'doctors';
    let unsubscribe: (() => void) | null = null;
    
    // Wait for auth to be ready
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, path), orderBy('name', 'asc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setDoctors(docs);
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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    speciality: '',
    phone: '',
    email: '',
    experience: '',
    availability: [] as string[],
    image: ''
  });

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.speciality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (doctor: any = null) => {
    if (doctor) {
      setSelectedDoctor(doctor);
      setFormData({
        name: doctor.name,
        speciality: doctor.speciality,
        phone: doctor.phone,
        email: doctor.email,
        experience: doctor.experience,
        availability: doctor.availability,
        image: doctor.image || ''
      });
    } else {
      setSelectedDoctor(null);
      setFormData({
        name: '',
        speciality: '',
        phone: '',
        email: '',
        experience: '',
        availability: ['Lun', 'Mer', 'Ven'],
        image: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = selectedDoctor ? `doctors/${selectedDoctor.id}` : 'doctors';
    try {
      if (selectedDoctor) {
        // Update
        await updateDoc(doc(db, 'doctors', selectedDoctor.id), {
          ...formData,
          updatedAt: Timestamp.now()
        });
      } else {
        // Create
        const newDoctor = {
          ...formData,
          rating: 5.0,
          patients: '0',
          createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'doctors'), newDoctor);
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, selectedDoctor ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const deleteDoctor = async (id: string) => {
    setDoctorToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!doctorToDelete) return;
    const path = `doctors/${doctorToDelete}`;
    try {
      await deleteDoc(doc(db, 'doctors', doctorToDelete));
      setDoctorToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Nos Médecins</h2>
          <p className="text-slate-500 mt-1">Gérez le personnel médical, les spécialités et les horaires.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={18} />
          <span>Ajouter un nouveau médecin</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou spécialité..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-slate-50 border-none rounded-xl text-sm font-medium px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option>Toutes les spécialités</option>
            <option>Cardiologie</option>
            <option>Pédiatrie</option>
            <option>Dermatologie</option>
            <option>Médecine Générale</option>
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDoctors.map((doctor, index) => (
          <motion.div
            key={doctor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
          >
            {/* Top Banner */}
            <div className="h-24 bg-emerald-600 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
            </div>

            <div className="px-8 pb-8 -mt-12 relative">
              {/* Profile Image Placeholder */}
              <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg mb-4">
                <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors overflow-hidden">
                  {doctor.image ? (
                    <Image 
                      src={doctor.image}
                      alt={doctor.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Stethoscope size={40} />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{doctor.name}</h3>
                  <p className="text-emerald-600 font-semibold text-sm">{doctor.speciality}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                  <Star size={14} fill="currentColor" />
                  {doctor.rating}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expérience</p>
                  <p className="text-sm font-bold text-slate-900">{doctor.experience}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
                  <p className="text-sm font-bold text-slate-900">{doctor.patients}</p>
                </div>
              </div>

              {/* Contact & Schedule */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400" />
                  <span>{doctor.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400" />
                  <span>{doctor.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Calendar size={16} className="text-slate-400" />
                  <div className="flex gap-1">
                    {doctor.availability.map((day: string) => (
                      <span key={day} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => handleOpenModal(doctor)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Modifier
                </button>
                <button 
                  onClick={() => deleteDoctor(doctor.id)}
                  className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                  title="Supprimer le médecin"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedDoctor ? 'Modifier le médecin' : 'Ajouter un nouveau médecin'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nom complet</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="Dr. Nom Prénom" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Spécialité</label>
                    <input 
                      type="text" 
                      required
                      value={formData.speciality}
                      onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="ex: Cardiologue" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Numéro de téléphone</label>
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="+221 ..." 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">E-mail professionnel</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="nom@touba.com" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Expérience</label>
                    <input 
                      type="text" 
                      required
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                      placeholder="ex: 10 ans" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Disponibilité</label>
                    <div className="flex flex-wrap gap-2">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const newAvailability = formData.availability.includes(day)
                              ? formData.availability.filter(d => d !== day)
                              : [...formData.availability, day];
                            setFormData({ ...formData, availability: newAvailability });
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            formData.availability.includes(day)
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Photo du médecin</label>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                        {formData.image ? (
                          <>
                            <Image 
                              src={formData.image} 
                              alt="Preview" 
                              fill 
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, image: '' })}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                              <X size={20} />
                            </button>
                          </>
                        ) : (
                          <ImageIcon size={32} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all">
                            <Upload size={16} />
                            <span>Télécharger une image</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                            />
                          </label>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Plus size={14} className="text-slate-400" />
                          </div>
                          <input 
                            type="url" 
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                            placeholder="Ou collez l'URL d'une image ici..." 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
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
                    {selectedDoctor ? 'Mettre à jour' : 'Enregistrer'}
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
        title="Supprimer le médecin"
        message="Êtes-vous sûr de vouloir supprimer ce médecin ? Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
}
