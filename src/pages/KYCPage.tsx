import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cimbApi } from '../api/cimbApi';
import { StandalonePage } from '../components/layout/StandalonePage';
import { ShieldAlert, CheckCircle2, Clock3, FileText, Upload, AlertTriangle } from 'lucide-react';
import { SelectField } from '../components/common/SelectBottomSheet';
import { isKycVerified } from '../utils/businessRules';

const STATES = [
  'Wilayah Persekutuan Kuala Lumpur','Selangor','Johor','Penang','Perak','Kedah','Kelantan','Terengganu',
  'Pahang','Negeri Sembilan','Melaka','Sabah','Sarawak','Perlis','Wilayah Persekutuan Putrajaya','Wilayah Persekutuan Labuan',
];

const STATUS_LABEL: Record<string,string> = {
  unverified:'Belum Bermula', draft:'Draf', submitted:'Dihantar', under_review:'Dalam Semakan',
  verified:'Disahkan', rejected:'Ditolak',
};

export const KYCPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, updateUserData } = useAuth();
  const status = user?.kyc_status || 'unverified';
  const locked = status === 'submitted' || status === 'under_review';
  const verified = isKycVerified(user);

  const [fullName,setFullName]=useState(user?.kyc_identity_full_name || '');
  const [mykad,setMykad]=useState(user?.kyc_identity_mykad_number || '');
  const [dob,setDob]=useState(user?.kyc_identity_date_of_birth || '');
  const [gender,setGender]=useState(user?.kyc_identity_gender || '');
  const [nationality,setNationality]=useState(user?.kyc_identity_nationality || '');
  const [idType,setIdType]=useState(user?.kyc_identity_id_type || '');
  const [address,setAddress]=useState(user?.kyc_address_line || '');
  const [city,setCity]=useState(user?.kyc_city || '');
  const [postcode,setPostcode]=useState(user?.kyc_postcode || '');
  const [state,setState]=useState(user?.kyc_state || '');
  const [country,setCountry]=useState(user?.kyc_country || '');
  const [emergencyName,setEmergencyName]=useState(user?.kyc_emergency_contact_name || '');
  const [emergencyPhone,setEmergencyPhone]=useState(user?.kyc_emergency_contact_phone || '');
  const [emergencyRelation,setEmergencyRelation]=useState(user?.kyc_emergency_contact_relationship || '');
  const [files,setFiles]=useState<{id?:File;face?:File;selfie?:File}>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const idRef=useRef<HTMLInputElement>(null);
  const faceRef=useRef<HTMLInputElement>(null);
  const selfieRef=useRef<HTMLInputElement>(null);

  const existingDocs=useMemo(()=>({
    id:Boolean(user?.kyc_documents_id_image_url),
    face:Boolean(user?.kyc_documents_face_image_url),
    selfie:Boolean(user?.kyc_documents_selfie_image_url),
  }),[user]);

  if (verified) return <StandalonePage title="KYC Disahkan" subtitle="Identiti anda telah disahkan." fallbackBackUrl="/loan" bottomAction={<button type="button" onClick={()=>navigate('/loan',{replace:true})} className="w-full h-[52px] bg-[#E31B23] text-white font-bold rounded-[12px]">Teruskan ke Pinjaman</button>}><div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" />KYC telah disahkan oleh Admin.</div></StandalonePage>;

  if (locked) return <StandalonePage title="KYC Dalam Semakan" subtitle="Permohonan anda sedang diproses." fallbackBackUrl="/"><div className="space-y-3"><div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-sm text-amber-900"><Clock3 className="w-5 h-5 shrink-0" />Status: <strong>{STATUS_LABEL[status]}</strong></div><p className="text-xs text-slate-500">Anda akan melihat status baharu secara automatik selepas Admin selesai membuat semakan.</p></div></StandalonePage>;

  const validateFile=(file?:File)=>{if(!file)return null;if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Format fail mesti JPG, PNG atau WEBP.';if(file.size<1||file.size>10*1024*1024)return 'Saiz fail mesti antara 1 byte dan 10 MB.';return null;};
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError(null);
    if(!session||!user)return;
    if(!fullName.trim()||!mykad.trim()||!dob||!gender||!nationality||!idType||!address.trim()||!city.trim()||!postcode.trim()||!state||!country.trim()||!emergencyName.trim()||!emergencyPhone.trim()||!emergencyRelation){setError('Lengkapkan semua maklumat KYC yang diperlukan.');return;}
    for(const file of [files.id,files.face,files.selfie]){const validation=validateFile(file);if(validation){setError(validation);return;}}
    if(!files.id && !existingDocs.id){setError('Dokumen ID diperlukan.');return;}
    if(!files.face && !existingDocs.face){setError('Foto muka diperlukan.');return;}
    if(!files.selfie && !existingDocs.selfie){setError('Selfie diperlukan.');return;}
    setBusy(true);
    try{
      const uploads:[keyof typeof files,'kyc_id'|'kyc_face'|'kyc_selfie'][]=[['id','kyc_id'],['face','kyc_face'],['selfie','kyc_selfie']];
      for(const [key,field] of uploads){const file=files[key];if(!file)continue;const r=await cimbApi.upload({phone:session.phone,password:session.password,field,file});if(!r.success)throw new Error(r.error);}
      const r=await updateUserData({
        kyc_status:'submitted',kyc_identity_full_name:fullName.trim(),
        kyc_identity_mykad_number:mykad.trim(),kyc_identity_date_of_birth:dob,kyc_identity_gender:gender,
        kyc_identity_nationality:nationality,kyc_identity_id_type:idType,kyc_address_line:address.trim(),
        kyc_city:city.trim(),kyc_postcode:postcode.trim(),kyc_state:state,kyc_country:country.trim(),
        kyc_emergency_contact_name:emergencyName.trim(),kyc_emergency_contact_phone:emergencyPhone.trim(),
        kyc_emergency_contact_relationship:emergencyRelation,
      });
      if(!r.success)throw new Error(r.error);
    }catch(err){setError(err instanceof Error?err.message:'Gagal menghantar KYC.');setBusy(false);return;}
    setBusy(false);
  };

  const FileCard=({label,file,existing,onPick}:{label:string;file?:File;existing:boolean;onPick:()=>void})=><button type="button" onClick={onPick} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-left flex items-center gap-3"><FileText className="w-5 h-5 text-[#E31B23] shrink-0"/><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{label}</span><span className="block text-[11px] text-slate-500 truncate">{file?.name || (existing?'Dokumen telah dimuat naik':'Pilih fail imej')}</span></span><Upload className="w-4 h-4 text-slate-500"/></button>;

  return <StandalonePage title="Pengesahan Identiti (KYC)" subtitle="Lengkapkan maklumat dan dokumen untuk semakan Admin." fallbackBackUrl="/" bottomAction={<button type="button" onClick={submit} disabled={busy} className="w-full h-[52px] bg-[#E31B23] text-white font-bold rounded-[12px] disabled:opacity-50">{busy?'Menghantar KYC...':'Hantar KYC untuk Semakan'}</button>}>
    <form onSubmit={submit} className="space-y-4 pb-4">
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5 text-xs text-amber-900"><ShieldAlert className="w-5 h-5 text-amber-600 shrink-0"/><span>Status: <strong>{STATUS_LABEL[status]}</strong>. Pengesahan hanya boleh dilakukan oleh Admin.</span></div>
      {status==='rejected'&&<div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/><span>KYC sebelum ini ditolak. Periksa semula maklumat dan hantar semula.</span></div>}
      {error&&<div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">{error}</div>}
      <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider">1. Maklumat Pengenalan</h3>
        <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nama penuh seperti dalam MyKad" className="w-full h-[50px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
        <div className="grid grid-cols-2 gap-3"><SelectField id="kyc-id-type" label="Jenis Dokumen" value={idType} onChange={setIdType} options={['MyKad','MyTentera','MyPolis']} title="Pilih Jenis Dokumen"/><input value={mykad} onChange={e=>setMykad(e.target.value)} placeholder="Nombor MyKad" className="w-full h-[50px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"/></div>
        <div className="grid grid-cols-2 gap-3"><input type="date" value={dob} onChange={e=>setDob(e.target.value)} className="w-full h-[50px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"/><SelectField id="kyc-gender" label="Jantina" value={gender} onChange={setGender} options={['Lelaki','Perempuan']} title="Pilih Jantina"/></div>
        <div className="grid grid-cols-2 gap-3"><SelectField id="kyc-nationality" label="Kewarganegaraan" value={nationality} onChange={setNationality} options={['Warganegara Malaysia','Pemastautin Tetap','Lain-lain']} title="Pilih Kewarganegaraan"/><SelectField id="kyc-id-nationality" label="Negara" value={country} onChange={setCountry} options={['Malaysia']} title="Pilih Negara"/></div>
      </section>
      <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5"><h3 className="text-xs font-bold uppercase tracking-wider">2. Alamat</h3><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Alamat lengkap" className="w-full h-[50px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"/><div className="grid grid-cols-2 gap-3"><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Bandar" className="w-full h-[50px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"/><input value={postcode} onChange={e=>setPostcode(e.target.value)} placeholder="Poskod" className="w-full h-[50px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"/></div><SelectField id="kyc-state" label="Negeri" value={state} onChange={setState} options={STATES} title="Pilih Negeri" searchable searchPlaceholder="Cari negeri..."/></section>
      <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5"><h3 className="text-xs font-bold uppercase tracking-wider">3. Waris / Kecemasan</h3><input value={emergencyName} onChange={e=>setEmergencyName(e.target.value)} placeholder="Nama waris" className="w-full h-[50px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"/><div className="grid grid-cols-2 gap-3"><input value={emergencyPhone} onChange={e=>setEmergencyPhone(e.target.value)} placeholder="Nombor telefon" className="w-full h-[50px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"/><SelectField id="kyc-emergency-relation" label="Hubungan" value={emergencyRelation} onChange={setEmergencyRelation} options={['Ibu Bapa','Pasangan','Adik Beradik','Saudara Mara']} title="Pilih Hubungan"/></div></section>
      <section className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3.5"><h3 className="text-xs font-bold uppercase tracking-wider">4. Dokumen KYC</h3><input ref={idRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>setFiles(v=>({...v,id:e.target.files?.[0]}))}/><input ref={faceRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>setFiles(v=>({...v,face:e.target.files?.[0]}))}/><input ref={selfieRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>setFiles(v=>({...v,selfie:e.target.files?.[0]}))}/><FileCard label="Dokumen ID" file={files.id} existing={existingDocs.id} onPick={()=>idRef.current?.click()}/><FileCard label="Foto muka" file={files.face} existing={existingDocs.face} onPick={()=>faceRef.current?.click()}/><FileCard label="Selfie" file={files.selfie} existing={existingDocs.selfie} onPick={()=>selfieRef.current?.click()}/><p className="text-[10px] text-slate-500">Format: JPG, PNG atau WEBP. Maksimum 10 MB setiap fail.</p></section>
    </form>
  </StandalonePage>;
};
