export interface EyeVA {
  ua: string;
  wa: string;
  ph: string;
  bcva: string;
}

export interface EyeSpectacleRx {
  dsp: string;
  dcyl: string;
  axis: string;
  va: string;
}

export interface PastHistory {
  dm: boolean;
  htn: boolean;
  ihd: boolean;
  ckd: boolean;
  ba: boolean;
  thyDs: boolean;
  uromax: boolean;
  others: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: string;
  date: string;

  rightEyeVA: EyeVA;
  leftEyeVA: EyeVA;

  chiefComplaints: string;
  pastHistory: PastHistory;

  adnexa: string;
  anteriorSegment: string;
  posteriorSegment: string;

  gatRight: string;
  gatLeft: string;

  rightEyeDistance: EyeSpectacleRx;
  leftEyeDistance: EyeSpectacleRx;
  rightEyeNear: EyeSpectacleRx;
  leftEyeNear: EyeSpectacleRx;

  ipd: string;

  lensUsage: string;
  lensType: string;
  lensCoating: string[];
  lensMaterial: string;

  advice: string;
  followUp: string;

  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  phone: string;
  email: string;
  gender: "Male" | "Female" | "Other" | "";
  createdAt: string;
}

export interface DoctorProfile {
  nameBn: string;
  nameEn: string;
  qualificationBn: string;
  qualificationEn: string;
  designationBn: string;
  designationEn: string;
  phone: string;
  email: string;
  institutionBn: string;
  institutionEn: string;
  regNumber: string;
  chamberName: string;
  chamberAddress: string;
  chamberPhone: string;
}
