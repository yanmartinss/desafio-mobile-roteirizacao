import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { meterConnectColors as c } from "../theme/meterConnectColors";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export function ReadingInput({ value, onChangeText, error, disabled }: Props) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? "#ba1a1a"
    : focused
      ? c.secondary
      : c.outlineVariant;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nova leitura</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor },
          focused && styles.inputFocused,
          disabled && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        placeholder="Ex.: 12932"
        placeholderTextColor={c.outlineVariant}
        editable={!disabled}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: c.onSurfaceVariant,
  },
  input: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: c.inputBackground,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.28,
    color: c.primary,
  },
  inputFocused: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: c.surfaceContainer,
    color: c.onSurfaceVariant,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ba1a1a",
  },
});
