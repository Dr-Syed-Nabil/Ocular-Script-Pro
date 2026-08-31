import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { AuthShell, authStyles } from "@/components/AuthShell";
import { useColors } from "@/hooks/useColors";

export default function SignUpScreen() {
  const colors = useColors();
  const s = authStyles(colors);
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    setErrorMessage("");
    const { error } = await signUp.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
      setErrorMessage(error.message || "Unable to create your account.");
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    setErrorMessage("");
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (error) {
      setErrorMessage(error.message || "That verification code is not valid.");
      return;
    }
    if (signUp.status === "complete") {
      await signUp.finalize({ navigate: ({ decorateUrl }) => router.replace(decorateUrl("/") as never) });
    }
  };

  const loading = fetchStatus === "fetching";
  const verifying = signUp.status === "missing_requirements" && signUp.unverifiedFields.includes("email_address");
  return (
    <AuthShell>
      {verifying ? (
        <>
          <Text style={s.title}>Verify your email</Text>
          <Text style={s.subtitle}>We sent a verification code to {emailAddress}</Text>
          {errorMessage || errors.fields.code?.message ? <Text style={s.error}>{errorMessage || errors.fields.code?.message}</Text> : null}
          <Text style={s.label}>Verification code</Text>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="Enter your 6-digit code"
            placeholderTextColor={colors.mutedForeground}
          />
          <Pressable style={({ pressed }) => [s.button, (!code || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]} onPress={handleVerify} disabled={!code || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Verify email</Text>}
          </Pressable>
          <Pressable style={s.secondaryButton} onPress={() => signUp.verifications.sendEmailCode()} disabled={loading}>
            <Text style={s.secondaryButtonText}>Send a new code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Set up OptiScript for your ophthalmology practice</Text>
          {errorMessage || errors.fields.emailAddress?.message || errors.fields.password?.message ? (
            <Text style={s.error}>{errorMessage || errors.fields.emailAddress?.message || errors.fields.password?.message}</Text>
          ) : null}
          <Text style={s.label}>Email address</Text>
          <TextInput style={s.input} autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={emailAddress} onChangeText={setEmailAddress} placeholder="you@example.com" placeholderTextColor={colors.mutedForeground} />
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="Create a password" placeholderTextColor={colors.mutedForeground} />
          <Text style={s.notice}>You’ll receive a verification code by email before your account is activated.</Text>
          <Pressable style={({ pressed }) => [s.button, (!emailAddress || !password || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]} onPress={handleSubmit} disabled={!emailAddress || !password || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create account</Text>}
          </Pressable>
        </>
      )}
      <View style={s.footer}>
        <Text style={s.footerText}>Already have an account? </Text>
        <Link href={"/sign-in" as never}><Text style={s.footerLink}>Sign in</Text></Link>
      </View>
      <View nativeID="clerk-captcha" />
    </AuthShell>
  );
}