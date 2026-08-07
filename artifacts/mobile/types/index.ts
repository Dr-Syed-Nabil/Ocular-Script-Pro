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

export interface Drug {
  id: string;
  name: string;
  schedule: string;
  scheduleBn: string;
  duration: string;
  durationBn: string;
  route: string;
  notes: string;
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

  drugs: Drug[];

  rightEyeDistance: EyeSpectacleRx;
  leftEyeDistance: EyeSpectacleRx;
  rightEyeNear: EyeSpectacleRx;
  leftEyeNear: EyeSpectacleRx;

  ipd: string;
  nearIPD: string;
  addValue: string;

  lensUsage: string;
  lensType: string;
  lensCoating: string[];
  lensMaterial: string;

  advice: string;
  adviceBn: string;
  followUp: string;
  followUpBn: string;

  createdAt: string;
}

export interface Patient {
  id: string;
  /** Generated on enrollment; always set after creation */
  puid?: string;
  name: string;
  dob: string;
  phone: string;
  email: string;
  gender: "Male" | "Female" | "Other" | "";
  /** Age string at enrollment, e.g. "41 yrs" — used to build the PUID */
  ageAtEnrollment?: string;
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
