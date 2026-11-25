import type { TroubleshootingGuide } from "@/lib/types";

export const GUIDES: Record<"no_cooling" | "thermostat" | "frozen_coil", TroubleshootingGuide> = {
  no_cooling: {
    id: "no_cooling",
    title: "AC is running, but the house is not cooling",
    steps: [
      {
        title: "Set the thermostat to Cool",
        detail:
          "The mode should say Cool, not Fan or Off. Set the fan to Auto. Put the setpoint a few degrees below the room temperature and wait 10 minutes.",
      },
      {
        title: "Check the filter",
        detail:
          "A filter you cannot see light through will choke the coil. Replace a dirty 1-inch filter and give the system 15 minutes. Skip this if the filter door is screwed shut.",
      },
      {
        title: "Look at the outdoor unit",
        detail:
          "The condenser fan should be spinning and the big copper line should feel cold, not frosty. If a breaker tripped, reset it once. If it trips again, leave it off.",
      },
    ],
    stopIf:
      "Stop if you see ice, smell burning, or the breaker will not stay on. Those need a technician, not another reset.",
  },
  thermostat: {
    id: "thermostat",
    title: "Thermostat blank, wrong, or ignoring the setting",
    steps: [
      {
        title: "Power and batteries",
        detail:
          "A blank screen is often two AA batteries or the furnace door switch not fully closed. Replace the batteries if the model takes them, and seat the blower door.",
      },
      {
        title: "Mode and schedule",
        detail:
          "Set the mode to Heat or Cool yourself, then turn the schedule off for an hour. A schedule can put the system back to the old setpoint as soon as you walk away.",
      },
      {
        title: "One-degree test",
        detail:
          "Change the setpoint by at least 3 degrees. You should hear a click, then the equipment within a couple of minutes. No click usually means the thermostat or the control board.",
      },
    ],
    stopIf:
      "Stop if the thermostat or the wire nuts are hot, discolored, or smell like hot plastic. Do not keep power on a scorched stat.",
  },
  frozen_coil: {
    id: "frozen_coil",
    title: "Ice on the coil or the copper line",
    steps: [
      {
        title: "Turn cooling off",
        detail:
          "Set the thermostat to Off. Leave the fan On if the indoor blower still runs. Ice needs to melt before the system can cool, often one to three hours.",
      },
      {
        title: "Do not chip the ice",
        detail:
          "Do not scrape the coil or pour hot water on it. Bent fins and a cracked coil cost more than the visit.",
      },
      {
        title: "Replace a clogged filter once it is safe",
        detail:
          "A packed filter is the most common cause. After the ice is gone, put in a clean filter. If it freezes again the same day, stop and book a visit. Low refrigerant and a failed blower do the same thing.",
      },
    ],
    stopIf:
      "Stop and call us if water is coming through the ceiling, the breaker keeps tripping, or the ice comes back after a full melt.",
  },
};

export function guideForText(text: string): TroubleshootingGuide | null {
  const value = text.toLowerCase();
  if (/\b(ice|frozen|frost|icy)\b/.test(value) && /\b(coil|line|copper|ac|a\/c|air)\b/.test(value)) {
    return GUIDES.frozen_coil;
  }
  if (/frozen coil|ice on the/.test(value)) return GUIDES.frozen_coil;
  if (/thermostat|blank screen|won't click|will not click/.test(value)) return GUIDES.thermostat;
  if (/not cooling|won't cool|will not cool|isn't cooling|is not cooling|no cool|warm air|blowing warm|house is hot/.test(value)) {
    return GUIDES.no_cooling;
  }
  if (/\bac\b|a\/c|air condition/.test(value) && /cool|hot|warm/.test(value)) return GUIDES.no_cooling;
  return null;
}
