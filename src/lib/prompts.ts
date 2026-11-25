export const STARTER_PROMPTS = [
  {
    id: "ac",
    label: "AC won't cool",
    text: "The AC is on but the house will not cool down. About 2,200 sq ft, the system is 12 years old, and the house is in 78704.",
  },
  {
    id: "heat-pump",
    label: "Heat pump price",
    text: "What would a heat pump cost for an 1,800 sq ft home in 78703? The old system is 16 years old. No rush.",
  },
  {
    id: "frozen",
    label: "Frozen coil",
    text: "There is ice on the copper line outside and the AC is not cooling. The home is 1,600 sq ft in 78745.",
  },
  {
    id: "zip",
    label: "Cedar Park?",
    text: "Do you service 78613?",
  },
  {
    id: "gas",
    label: "Gas smell",
    text: "I smell gas by the furnace.",
  },
] as const;

export const GREETING =
  "I'm the desk at Northwind Comfort. Tell me what's going on with the heat or the air, and I can walk through a safe check, price a visit, and put you on the board. If you smell gas or a carbon monoxide alarm is sounding, say so and get outside before anything else.";
