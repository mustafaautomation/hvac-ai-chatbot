export type EmergencyKind = "gas" | "carbon_monoxide";

export function detectEmergency(text: string): EmergencyKind | null {
  const value = text.toLowerCase();
  if (/carbon monoxide|\bco alarm\b|\bco detector\b/.test(value)) {
    return "carbon_monoxide";
  }
  if (/rotten egg|mercaptan|gas leak/.test(value)) return "gas";
  if (/smell(?:s|ing)?(?:\s+\w+){0,4}\sgas\b/.test(value)) return "gas";
  if (/\bgas\b[\w\s,]{0,40}\bsmell/.test(value)) return "gas";
  return null;
}

export function safetyCopy(kind: EmergencyKind): { title: string; steps: string[]; message: string } {
  if (kind === "gas") {
    const steps = [
      "Get everyone out of the house, including pets.",
      "Do not flip switches, light anything, or start a car in the garage.",
      "Do not look for the leak.",
      "From outside, call 911.",
    ];
    return {
      title: "Leave the house. This is a gas emergency.",
      steps,
      message:
        "Get everyone out of the house, including pets. Do not flip switches, light anything, or start a car in the garage, and do not look for the leak. From outside, call 911. I will not walk through furnace checks on a gas smell.",
    };
  }
  const steps = [
    "Get everyone into fresh air, including pets.",
    "A sounding carbon monoxide alarm is an emergency, even if nobody feels sick.",
    "Call 911 from outside.",
    "Do not open the furnace or try to reset it.",
  ];
  return {
    title: "Get to fresh air. This is a carbon monoxide emergency.",
    steps,
    message:
      "Get everyone into fresh air. A carbon monoxide alarm, or a sudden headache or dizziness while the heat is running, is an emergency. Call 911 from outside. Do not open the furnace or try to reset it.",
  };
}
