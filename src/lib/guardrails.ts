const HVAC =
  /\b(ac|a\/c|air|heat|heater|heating|furnace|thermostat|duct|filter|refrigerant|freon|coil|compressor|warranty|financ\w*|comfort|quote|repair|install|austin|zip|appointment|cool\w*|condenser|blower|maintenance|emergency|gas|carbon|seasonal|hvac|northwind|visit|technician|tune)\b/i;

const INJECTION =
  /ignore (all |any |previous |your )?instructions|system prompt|you are now|jailbreak|reveal (your |the )?(hidden )?(prompt|instructions)|developer message|do not follow the (desk|rules)/i;

const FRUSTRATION =
  /this is useless|you('re| are) useless|terrible (bot|service)|worst (bot|chat)|stupid bot|waste of (my )?time|this (sucks|is ridiculous)|so frustrated|not helping|give up/i;

const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
const CARD = /\b(?:\d[ -]?){13,16}\b/;

export function detectInjection(text: string): boolean {
  return INJECTION.test(text);
}

export function detectFrustration(text: string): boolean {
  return FRUSTRATION.test(text);
}

export function detectSensitivePii(text: string): boolean {
  return SSN.test(text) || CARD.test(text) || /\b(ssn|social security|credit card number)\b/i.test(text);
}

export function isHvacDomain(text: string): boolean {
  return HVAC.test(text);
}

export function maskPii(text: string): string {
  return text
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, "[email]")
    .replace(SSN, "[ssn]")
    .replace(CARD, "[card]")
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "[phone]");
}

export const OFF_TOPIC_REPLY =
  "I only help with Northwind Comfort heating and air in Austin: repairs, installs, quotes, and visits. I can't help with that.";

export const INJECTION_REPLY =
  "I can't follow instructions to ignore the Northwind desk rules or reveal a hidden prompt. Ask me about heating and air.";

export const PII_REPLY =
  "Don't send a social security number or a card number in chat. I didn't save those digits. A coordinator can take payment on a phone call, not in this demo.";
