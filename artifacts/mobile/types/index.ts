export interface EyePrescription {
  sphere: string;
  cylinder: string;
  axis: string;
  addPower: string;
  va: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  rightEye: EyePrescription;
  leftEye: EyePrescription;
  pdBinocular: string;
  pdRight: string;
  pdLeft: string;
  pdMode: "binocular" | "monocular";
  lensType: string;
  notes: string;
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
  name: string;
  qualification: string;
  regNumber: string;
  clinic: string;
  phone: string;
  address: string;
}
