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

export type DrugFormulation =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Eye Drop/Gel"
  | "Eye Ointment"
  | "Topical Ointment/Cream";

export type DrugInstructionConnector = "এবং" | "তারপর";

export interface DrugDosePhase {
  schedule: string;
  durationValue: string;
  durationUnit: "দিন" | "সপ্তাহ" | "মাস";
  amount?: string;
  unit?: string;
  frequency?: string;
  site?: string;
  connector?: DrugInstructionConnector;
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
  formulation?: DrugFormulation;
  dosePhases?: DrugDosePhase[];
}

export type ComplaintLaterality = "R" | "L" | "B";

export interface ChiefComplaintSelection {
  complaint: string;
  laterality?: ComplaintLaterality;
}

export interface PrescriptionSectionConfig {
  id: string;
  title: string;
  enabled: boolean;
  builtIn: boolean;
  options?: string[];
  subsections?: PrescriptionSubsectionConfig[];
}

export interface ConfigurableFieldValue {
  selectedOptions: string[];
  freeText: string;
  optionLateralities?: Record<string, ComplaintLaterality>;
}

export interface PrescriptionSubsectionConfig {
  id: string;
  title: string;
  enabled: boolean;
  builtIn: boolean;
  options: string[];
}

export interface RxPadOverlayField {
  id: string;
  label: string;
  enabled: boolean;
  printMode?: "all" | "selected";
  contentSelection?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export type RxPadImageFit = "fit" | "contain" | "crop";

export interface RxPadOverlayConfig {
  id: string;
  name: string;
  imageUri?: string;
  imageWidthPx?: number;
  imageHeightPx?: number;
  imageFit?: RxPadImageFit;
  paperWidthMm: number;
  paperHeightMm: number;
  fields: RxPadOverlayField[];
}

export interface CustomPrescriptionSection {
  id: string;
  title: string;
  content: string;
  selectedOptions?: string[];
  freeText?: string;
}

export interface PrescriptionConfig {
  version: number;
  categoryTitles?: Record<string, string>;
  rxPadOverlay?: RxPadOverlayConfig;
  rxPadOverlays?: RxPadOverlayConfig[];
  activeRxPadOverlayId?: string;
  chiefComplaints: string[];
  visualAcuity: string[];
  distanceVA: string[];
  nearVA: string[];
  drugRoutes: string[];
  lensUsage: string[];
  lensType: string[];
  lensCoating: string[];
  lensMaterial: string[];
  followUp: string[];
  sections: PrescriptionSectionConfig[];
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: string;
  patientWeight?: string;
  patientPhone?: string;
  patientPuid?: string;
  date: string;

  rightEyeVA: EyeVA;
  leftEyeVA: EyeVA;

  chiefComplaints: string;
  chiefComplaintSelections?: ChiefComplaintSelection[];
  customComplaint?: string;
  pastHistory: PastHistory;
  pastHistoryNotes?: string;
  diagnosis?: string;
  investigations?: string;
  customSections?: CustomPrescriptionSection[];
  sectionFields?: Record<string, ConfigurableFieldValue>;
  sectionTitles?: Record<string, string>;
  subsectionTitles?: Record<string, string>;
  hiddenSections?: string[];

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
