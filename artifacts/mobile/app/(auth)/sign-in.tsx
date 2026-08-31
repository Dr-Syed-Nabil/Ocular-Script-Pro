import { useSSO, useSignIn } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { AuthShell, authStyles } from "@/components/AuthShell";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
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
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const finish = useCallback(() => router.replace("/"), [router]);

  const handleSubmit = async () => {
    setErrorMessage("");
    const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
      setErrorMessage(error.message || "Unable to sign in. Please check your details.");
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: finish });
    } else if (signIn.status === "needs_client_trust") {
      setErrorMessage("This account needs an additional verification step. Use the email code sent by Clerk.");
    } else if (signIn.status === "needs_second_factor") {
      setErrorMessage("This account requires multi-factor authentication, which is not supported in this screen yet.");
    }
  };

  const handleGoogle = async () => {
    setErrorMessage("");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "mobile" }),
      });
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId, navigate: finish });
      } else {
        setErrorMessage("Google sign-in needs another verification step.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in was not completed.");
    }
  };

  const loading = fetchStatus === "fetching";
  return (
    <AuthShell>
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
      <Pressable
        style={({ pressed }) => [s.button, (!emailAddress || !password || loading) && s.buttonDisabled, pressed && { opacity: 0.85 }]}
        onPress={handleSubmit}
        disabled={!emailAddress || !password || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign in</Text>}
      </Pressable>
      <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>OR</Text><View style={s.dividerLine} /></View>
      <Pressable style={({ pressed }) => [s.secondaryButton, pressed && { opacity: 0.8 }]} onPress={handleGoogle}>
        <Text style={s.secondaryButtonText}>Continue with Google</Text>
      </Pressable>
      <View style={s.footer}>
        <Text style={s.footerText}>New to OptiScript? </Text>
        <Link href={"/(auth)/sign-up" as never}><Text style={s.footerLink}>Create an account</Text></Link>
      </View>
    </AuthShell>
  );
}