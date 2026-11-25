export const STARTER_PROMPTS = [
  {
    id: "ac",
    label: "The AC isn't cooling",
    icon: "snowflake",
    text: "The AC is not cooling. About 2,200 sq ft, the system is 12 years old, and the house is in 78704.",
  },
  {
    id: "heat-pump",
    label: "What does a heat-pump install run?",
    icon: "thermometer",
    text: "What would a heat pump install cost for an 1,800 sq ft home in 78703? The old system is 16 years old. No rush.",
  },
  {
    id: "gas",
    label: "I smell gas",
    icon: "flame",
    text: "I smell gas by the furnace.",
  },
  {
    id: "human",
    label: "Talk to dispatch",
    icon: "headphones",
    text: "Talk to a person at dispatch.",
  },
] as const;

export const NUDGE_PROMPTS = [
  {
    id: "quote",
    label: "Get a visit quote",
    text: STARTER_PROMPTS[1].text,
  },
  {
    id: "book",
    label: "Book a tech",
    text: STARTER_PROMPTS[0].text,
  },
] as const;

export const GREETING =
  "I can walk a safe check, price the visit, and put a tech on the board. Gas or a carbon monoxide alarm skips the troubleshooting and opens a handoff.";

export const COMPOSER_PLACEHOLDER = "Ask about hours, a visit, or a quote…";
