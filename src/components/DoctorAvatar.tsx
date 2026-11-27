import React, { useState } from 'react';
import sarahImg from '../assets/images/doctor_sarah_jenkins_1795788400582.jpg';
import davidImg from '../assets/images/doctor_david_chen_1795788401681.jpg';
import jessicaImg from '../assets/images/doctor_jessica_taylor_1795788401131.jpg';
import marcusImg from '../assets/images/doctor_marcus_vance_1795788402229.jpg';
import chloeImg from '../assets/images/doctor_chloe_bennett_1795788402357.jpg';

const LOCAL_PORTRAITS_BY_EMAIL: Record<string, string> = {
  'sarah.jenkins@mediconnect.pro': sarahImg,
  'doctor@mediconnect.pro': sarahImg,
  'david.chen@mediconnect.pro': davidImg,
  'jessica.taylor@mediconnect.pro': jessicaImg,
  'marcus.vance@mediconnect.pro': marcusImg,
  'chloe.bennett@mediconnect.pro': chloeImg,
};

const LOCAL_PORTRAITS_BY_ID: Record<number, string> = {
  1: sarahImg,
  2: davidImg,
  3: jessicaImg,
  4: marcusImg,
  5: chloeImg,
};

interface DoctorAvatarProps {
  doctorId?: number;
  email?: string;
  name: string;
  profileImageUrl?: string;
  sizeClass?: string;
}

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  doctorId,
  email,
  name,
  profileImageUrl,
  sizeClass = 'w-12 h-12',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const normalizedEmail = email?.trim().toLowerCase() || '';
  const resolvedSrc =
    LOCAL_PORTRAITS_BY_EMAIL[normalizedEmail] ||
    (doctorId ? LOCAL_PORTRAITS_BY_ID[doctorId] : undefined) ||
    (profileImageUrl && !profileImageUrl.includes('unsplash.com') ? profileImageUrl : undefined);

  const initials = name
    .replace(/^Dr\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'DR';

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-semibold text-xs shrink-0 select-none`}
    >
      {initials}
    </div>
  );
};
