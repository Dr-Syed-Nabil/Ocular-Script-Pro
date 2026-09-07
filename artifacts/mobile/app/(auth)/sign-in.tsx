import { useBiometricCredentials, useSSO, useSignIn } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import { AuthShell, authStyles } from "@/components/AuthShell";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

const REMEMBERED_EMAIL_KEY = "@optiscript/remembered-sign-in-email";

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const s = authStyles(colors);
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { getAvailability, list, enroll, signIn: signInWithBiometrics } = useBiometricCredentials();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStep, setVerificationStep] = useState<"password" | "client-trust">("password");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const finish = useCallback(() => router.replace("/"), [router]);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).then((savedEmail) => {
      if (mounted && savedEmail) {
        setEmailAddress(savedEmail);
        setRememberMe(true);
      }
    });
    if (Platform.OS !== "web") {
      void Promise.all([getAvailability(), list()]).then(([availability, credentials]) => {
        if (mounted) {
          setBiometricAvailable(availability.isAvailable);
          setBiometricEnrolled(credentials.some((credential) => credential.status === "active"));
        }
      }).catch(() => {
        if (mounted) setBiometricAvailable(false);
      });
    }
    return () => { mounted = false; };
  }, [getAvailability, list]);

  const persistRememberedEmail = async () => {
    if (rememberMe) {
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, emailAddress.trim());
    } else {
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  };

  const completePasswordSignIn = async () => {
    await persistRememberedEmail();
    // Activate the session before enrolling a biometric credential. Clerk
    // associates the credential with the active account.
    await signIn.finalize();
    if (enableBiometrics && biometricAvailable && !biometricEnrolled) {
      try {
        await enroll({
          name: "OptiScript on this device",
          identifierHint: emailAddress.trim(),
          reason: "Use biometrics for faster, secure sign-in",
          policy: "biometry_or_device_passcode",
        });
      } catch {
        setNotice("Signed in successfully. Biometric setup was skipped.");
      }
    }
    finish();
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setNotice("");
    const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
        setErrorMessage("Unable to sign in. Please check your details.");
      return;
    }
    if (signIn.status === "complete") {
      await completePasswordSignIn();
    } else if (signIn.status === "needs_client_trust") {
      const { error: codeError } = await signIn.mfa.sendEmailCode();
      if (codeError) {
        setErrorMessage(codeError.message || "We couldn't send the device verification code.");
        return;
      }
      setVerificationStep("client-trust");
      setVerificationCode("");
      setNotice(`We sent a verification code to ${emailAddress.trim()}.`);
    } else if (signIn.status === "needs_second_factor") {
      setErrorMessage("This account requires multi-factor authentication, which is not supported in this screen yet.");
    }
  };

  const handleVerifyDevice = async () => {
    setErrorMessage("");
    setNotice("");
    if (!verificationCode.trim()) {
      setErrorMessage("Enter the verification code from your email.");
      return;
    }
    const { error } = await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() });
    if (error) {
      setErrorMessage("That verification code is invalid or expired.");
      return;
    }
    if (signIn.status === "complete") {
      await completePasswordSignIn();
    } else {
      setErrorMessage("Device verification needs another step. Please try signing in again.");
    }
  };

  const resendDeviceCode = async () => {
    setErrorMessage("");
    setNotice("");
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) {
      setErrorMessage("We couldn't resend the verification code.");
      return;
    }
    setNotice(`A new verification code was sent to ${emailAddress.trim()}.`);
  };

  const startOver = async () => {
    setErrorMessage("");
    setNotice("");
    setVerificationCode("");
    setVerificationStep("password");
    await signIn.reset();
  };

  const handleBiometricSignIn = async () => {
    setErrorMessage("");
    setNotice("");
    setBiometricLoading(true);
    try {
      const result = await signInWithBiometrics({
        identifierHint: emailAddress.trim() || undefined,
        reason: "Sign in securely to OptiScript",
      });
      if (result.status === "complete" && result.createdSessionId) {
        await result.setActive({ session: result.createdSessionId, navigate: finish });
      } else {
        setErrorMessage("Biometric sign-in needs another verification step. Use your password instead.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Biometric sign-in was not completed.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMessage("");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: Platform.OS === "web" ? AuthSession.makeRedirectUri() : AuthSession.makeRedirectUri({ scheme: "mobile" }),
      });
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId, navigate: finish });
      } else {
        setErrorMessage("Google sign-in needs another verification step.");
      }
    } catch (error) {
      setErrorMessage("Google sign-in was not completed.");
    }
  };

  const loading = fetchStatus === "fetching";
  return (
    <AuthShell>
      {verificationStep === "client-trust" ? (
        <>
          <Text style={s.title}>Verify your device</Text>
          <Text style={s.subtitle}>Enter the code Clerk sent to {emailAddress.trim()}</Text>
          {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
          <Text style={s.label}>Verification code</Text>
          <TextInput
            style={s.input}
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="Enter your 6-digit code"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            autoFocus
          />
          <Pressable
            style={({ pressed }) => [s.button, (!verificationCode.trim() || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleVerifyDevice}
            disabled={!verificationCode.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Verify and sign in</Text>}
          </Pressable>
          <Pressable style={s.secondaryButton} onPress={resendDeviceCode} disabled={loading}>
            <Text style={s.secondaryButtonText}>Resend code</Text>
          </Pressable>
          {notice ? <Text style={[s.notice, { marginTop: 14 }]}>{notice}</Text> : null}
          <View style={s.footer}>
            <Pressable onPress={startOver}>
              <Text style={s.footerLink}>Use a different account</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to continue to your practice</Text>
          {(errorMessage || errors.fields.identifier?.message || errors.fields.password?.message) ? (
            <Text style={s.error}>{errorMessage || errors.fields.identifier?.message || errors.fields.password?.message}</Text>
          ) : null}
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
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -2, marginBottom: 10 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>Remember me on this device</Text>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: colors.border, true: colors.primary + "70" }}
              thumbColor={rememberMe ? colors.primary : "#f4f4f5"}
            />
          </View>
          <Link href="/forgot-password" asChild>
            <Pressable style={{ alignSelf: "flex-end", marginTop: -5, marginBottom: 10 }}>
              <Text style={s.footerLink}>Forgot password?</Text>
            </Pressable>
          </Link>
          <Pressable
            style={({ pressed }) => [s.button, (!emailAddress || !password || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]}
            onPress={handleSubmit}
            disabled={!emailAddress || !password || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign in</Text>}
          </Pressable>
          {biometricAvailable ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 4 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 }}>
                  {biometricEnrolled ? "Use biometrics for faster sign-ins" : "Remember this device with biometrics"}
                </Text>
                {!biometricEnrolled ? (
                  <Switch
                    value={enableBiometrics}
                    onValueChange={setEnableBiometrics}
                    trackColor={{ false: colors.border, true: colors.primary + "70" }}
                    thumbColor={enableBiometrics ? colors.primary : "#f4f4f5"}
                  />
                ) : null}
              </View>
              {biometricEnrolled ? (
                <Pressable
                  style={({ pressed }) => [s.secondaryButton, { marginTop: 4, borderColor: colors.primary + "55" }, pressed && { opacity: 0.8 }]}
                  onPress={handleBiometricSignIn}
                  disabled={loading || biometricLoading}
                >
                  {biometricLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[s.secondaryButtonText, { color: colors.primary }]}>Sign in with biometrics</Text>}
                </Pressable>
              ) : null}
            </>
          ) : null}
          {notice ? <Text style={s.notice}>{notice}</Text> : null}
          <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>OR</Text><View style={s.dividerLine} /></View>
          <Pressable style={({ pressed }) => [s.secondaryButton, pressed && { opacity: 0.8 }]} onPress={handleGoogle}>
            <Text style={s.secondaryButtonText}>Continue with Google</Text>
          </Pressable>
          <View style={s.footer}>
            <Text style={s.footerText}>New to OptiScript? </Text>
            <Link href={"/sign-up" as never}><Text style={s.footerLink}>Create an account</Text></Link>
          </View>
        </>
      )}
    </AuthShell>
  );
}