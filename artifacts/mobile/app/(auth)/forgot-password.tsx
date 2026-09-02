import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { AuthShell, authStyles } from "@/components/AuthShell";
import { useColors } from "@/hooks/useColors";

type ForgotPasswordStep = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const s = authStyles(colors);
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const loading = fetchStatus === "fetching";

  const showError = (error: unknown, fallback: string) => {
    setErrorMessage(error instanceof Error ? error.message : fallback);
  };

  const sendCode = async () => {
    setErrorMessage("");
    setNotice("");
    const identifier = emailAddress.trim();
    if (!identifier) {
      setErrorMessage("Enter the email address for your OptiScript account.");
      return;
    }

    const { error: createError } = await signIn.create({ identifier });
    if (createError) {
      showError(createError, "We couldn't find an account with that email address.");
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      showError(error, "We couldn't send the reset code. Please try again.");
      return;
    }

    setStep("code");
    setNotice("A verification code was sent to your email.");
  };

  const verifyCode = async () => {
    setErrorMessage("");
    setNotice("");
    if (!code.trim()) {
      setErrorMessage("Enter the verification code from your email.");
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
    if (error) {
      showError(error, "That code is invalid or expired.");
      return;
    }

    setStep("password");
  };

  const submitPassword = async () => {
    setErrorMessage("");
    setNotice("");
    if (password.length < 9) {
      setErrorMessage("Password must be at least 9 characters.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (error) {
      showError(error, "We couldn't reset your password. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: () => router.replace("/"),
      });
    } else {
      setErrorMessage("Your password could not be reset yet. Please start again.");
    }
  };

  const goBackToEmail = () => {
    setErrorMessage("");
    setNotice("");
    setCode("");
    setPassword("");
    setConfirmation("");
    setStep("email");
    void signIn.reset();
  };

  return (
    <AuthShell>
      <Text style={s.title}>
        {step === "email" ? "Forgot password?" : step === "code" ? "Check your email" : "Create a new password"}
      </Text>
      <Text style={s.subtitle}>
        {step === "email"
          ? "We'll send you a code to reset your password"
          : step === "code"
            ? "Enter the verification code we sent you"
            : "Choose a new password for your OptiScript account"}
      </Text>

      {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
      {notice ? <Text style={s.notice}>{notice}</Text> : null}

      {step === "email" ? (
        <>
          <Text style={s.label}>Email address</Text>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={emailAddress}
            onChangeText={setEmailAddress}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
          />
          <Pressable
            style={({ pressed }) => [s.button, (!emailAddress.trim() || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]}
            onPress={sendCode}
            disabled={!emailAddress.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send reset code</Text>}
          </Pressable>
        </>
      ) : null}

      {step === "code" ? (
        <>
          <Text style={s.label}>Verification code</Text>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter your code"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
          <Pressable
            style={({ pressed }) => [s.button, (!code.trim() || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]}
            onPress={verifyCode}
            disabled={!code.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Verify code</Text>}
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.secondaryButton, pressed && { opacity: 0.8 }]}
            onPress={sendCode}
            disabled={loading}
          >
            <Text style={s.secondaryButtonText}>Resend code</Text>
          </Pressable>
        </>
      ) : null}

      {step === "password" ? (
        <>
          <Text style={s.label}>New password</Text>
          <TextInput
            style={s.input}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 9 characters"
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={s.label}>Confirm new password</Text>
          <TextInput
            style={s.input}
            secureTextEntry
            autoComplete="new-password"
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Re-enter your password"
            placeholderTextColor={colors.mutedForeground}
          />
          <Pressable
            style={({ pressed }) => [s.button, (!password || !confirmation || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]}
            onPress={submitPassword}
            disabled={!password || !confirmation || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Reset password</Text>}
          </Pressable>
        </>
      ) : null}

      <View style={s.footer}>
        <Link href="/sign-in" asChild>
          <Pressable>
            <Text style={s.footerLink}>Back to sign in</Text>
          </Pressable>
        </Link>
        {step !== "email" ? (
          <Pressable onPress={goBackToEmail} style={{ marginLeft: 18 }}>
            <Text style={s.footerLink}>Start over</Text>
          </Pressable>
        ) : null}
      </View>
    </AuthShell>
  );
}