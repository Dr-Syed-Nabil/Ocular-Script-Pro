import assert from "node:assert/strict";
import test from "node:test";

import {
  isAlreadyBangla,
  tobnDigits,
  translateDosingSchedule,
  translateToBangla,
} from "@/utils/banglaTranslate";

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