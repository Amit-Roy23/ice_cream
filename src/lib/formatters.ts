/**
 * Formats a number to Indian Rupee (INR) format (e.g., ₹1,25,000.00)
 */
export function formatINR(amount: number | null | undefined, includeDecimals = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeDecimals ? "₹0.00" : "₹0";
  }

  const rounded = Math.round(amount * 100) / 100;
  const parts = rounded.toFixed(includeDecimals ? 2 : 0).split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  const isNegative = integerPart.startsWith("-");
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }

  // Indian number formatting: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formattedInteger =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

  const result = `${isNegative ? "-" : ""}₹${formattedInteger}${
    includeDecimals ? "." + decimalPart : ""
  }`;

  return result;
}

/**
 * Formats a number into Indian comma separated string (e.g. 1,00,000)
 */
export function formatIndianNumber(val: number): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("en-IN").format(val);
}

/**
 * Formats Date to Indian standard DD/MM/YYYY format
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

/**
 * Formats Date to Indian standard DD/MM/YYYY hh:mm A format
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "-";
    const dateStr = formatDate(d);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 is 12
    const strHours = String(hours).padStart(2, "0");
    return `${dateStr} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return "-";
  }
}

/**
 * Converts a number to Indian Rupee in Words (e.g. "Five Thousand Four Hundred Only")
 */
export function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertLessThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let words = "";

  const crore = Math.floor(intPart / 10000000);
  let remainder = intPart % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    words += convertLessThousand(crore) + " Crore ";
  }
  if (lakh > 0) {
    words += convertLessThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += convertLessThousand(thousand) + " Thousand ";
  }
  if (remainder > 0) {
    words += convertLessThousand(remainder);
  }

  words = words.trim() + " Rupees";
  if (decPart > 0) {
    words += " and " + convertLessThousand(decPart) + " Paise";
  }
  words += " Only";

  return words;
}
