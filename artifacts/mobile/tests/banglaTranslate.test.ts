import assert from "node:assert/strict";
import test from "node:test";

import {
  getUntranslatedEnglishWords,
  isAlreadyBangla,
  tobnDigits,
  translateDosingSchedule,
  translateToBangla,
} from "@/utils/banglaTranslate";
import { getBanglaPrintReviewDecision, getBanglaPrintWarnings } from "@/utils/generatePrescriptionHTML";
import type { Prescription } from "@/types";

test("translates dosing schedules with captured numeric replacements", () => {
  assert.equal(translateToBangla("Take 2 + 1 + 0"), "Take ২+১+০");
  assert.equal(translateToBangla("Take 1 + 0 + 1"), "Take ১+০+১");
  assert.equal(translateDosingSchedule("0+12+3"), "০+১২+৩");
});

test("translates frequency and drop-count phrases", () => {
  assert.equal(translateToBangla("twice daily"), "দিনে ২ বার");
  assert.equal(translateToBangla("QID"), "দিনে ৪ বার");
  assert.equal(translateToBangla("one drop"), "১ ফোটা");
  assert.equal(translateToBangla("2 drops"), "২ ফোটা");
  assert.equal(translateToBangla("at bedtime"), "রাতে ঘুমানোর আগে");
});

test("translates callback-based duration replacements", () => {
  assert.equal(translateToBangla("for 14 days"), "১৪ দিন পর্যন্ত");
  assert.equal(translateToBangla("for 3 weeks"), "৩ সপ্তাহ পর্যন্ত");
  assert.equal(translateToBangla("for 6 months"), "৬ মাস পর্যন্ত");
  assert.equal(translateToBangla("for 2 years"), "২ বছর পর্যন্ত");
  assert.equal(translateToBangla("Review after 10 days"), "Review after ১০ দিন");
});

test("translates eye laterality phrases and abbreviations", () => {
  assert.equal(translateToBangla("in both eyes"), "উভয় চোখে");
  assert.equal(translateToBangla("in the right eye"), "ডান চোখে");
  assert.equal(translateToBangla("in left eye"), "বাম চোখে");
  assert.equal(translateToBangla("in the affected eye"), "আক্রান্ত চোখে");
  assert.equal(translateToBangla("RE / LE / BE"), "ডান চোখে / বাম চোখে / উভয় চোখে");
});

test("converts every remaining English digit and identifies Bangla text", () => {
  assert.equal(tobnDigits("0123456789"), "০১২৩৪৫৬৭৮৯");
  assert.equal(translateToBangla("IPD 64, age 41"), "IPD ৬৪, age ৪১");
  assert.equal(isAlreadyBangla("চোখে দিন"), true);
  assert.equal(isAlreadyBangla("Apply twice daily"), false);
});

test("translates multiline advice without changing medication names or line breaks", () => {
  const advice = [
    "Timolol: one drop in both eyes.",
    "Latanoprost: at night; continue medication.",
    "Moxifloxacin: use as directed!",
  ].join("\n");

  assert.equal(
    translateToBangla(advice),
    [
      "Timolol: ১ ফোটা উভয় চোখে.",
      "Latanoprost: রাতে; ওষুধ চালিয়ে যান.",
      "Moxifloxacin: নির্দেশমতো ব্যবহার করুন!",
    ].join("\n"),
  );
});

test("translates English phrases around existing Bangla text without altering it", () => {
  const advice = "চোখ ঘষবেন না। Wash your hands, then apply ointment (Chloramphenicol).";

  assert.equal(
    translateToBangla(advice),
    "চোখ ঘষবেন না। হাত ধুয়ে নিন, then মলম লাগান (Chloramphenicol).",
  );
});

test("finds meaningful untranslated instructions without flagging medicines or abbreviations", () => {
  assert.deepEqual(
    getUntranslatedEnglishWords("Timolol: apply gently BD, then wash.", ["Timolol"]),
    ["apply", "gently", "then", "wash"],
  );
  assert.deepEqual(
    getUntranslatedEnglishWords("Timolol OD / Moxifloxacin QID", ["Timolol", "Moxifloxacin"]),
    [],
  );
});

test("reviews only Bangla patient instruction fields and identifies their source", () => {
  const rx = {
    advice: "Wash your hands",
    adviceBn: "হাত ধুয়ে নিন, then wait",
    followUp: "Review in one week",
    followUpBn: "১ সপ্তাহ",
    drugs: [{
      id: "drug-1",
      name: "Timolol",
      route: "Eye Drop",
      schedule: "BD",
      scheduleBn: "Timolol BD",
      duration: "7 days",
      durationBn: "৭ দিন",
      notes: "",
    }],
  } as Prescription;

  assert.deepEqual(getBanglaPrintWarnings(rx), [
    { field: "Advice", words: ["then", "wait"] },
  ]);

  for (const printPath of ["web", "native"] as const) {
    assert.deepEqual(getBanglaPrintReviewDecision(rx, printPath, false), {
      action: "review",
      printPath,
      warnings: [{ field: "Advice", words: ["then", "wait"] }],
    });
    assert.deepEqual(getBanglaPrintReviewDecision(rx, printPath, true), {
      action: "print",
      printPath,
    });
  }
});