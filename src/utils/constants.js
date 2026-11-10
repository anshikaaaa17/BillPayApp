import { Ionicons } from "@expo/vector-icons";

export const BILLERS = [
  { id:"SP_POWER",  name:"SP Power",       category:"Utilities",     icon:"flash",          color:"#3B82F6", bg:"#EFF6FF", dbg:"#1E3A5F" },
  { id:"PUB_WATER", name:"PUB Water",      category:"Utilities",     icon:"water",          color:"#0EA5E9", bg:"#F0F9FF", dbg:"#0C2D48" },
  { id:"SINGTEL",   name:"Singtel",        category:"Telecoms",      icon:"cellular",       color:"#8B5CF6", bg:"#F5F3FF", dbg:"#2E1065" },
  { id:"STARHUB",   name:"StarHub",        category:"Telecoms",      icon:"wifi",           color:"#7C3AED", bg:"#EDE9FE", dbg:"#2E1065" },
  { id:"M1_MOBILE", name:"M1 Mobile",      category:"Telecoms",      icon:"phone-portrait", color:"#6D28D9", bg:"#EDE9FE", dbg:"#2E1065" },
  { id:"HDB_RENT",  name:"HDB Rent",       category:"Housing",       icon:"home",           color:"#F59E0B", bg:"#FFFBEB", dbg:"#451A03" },
  { id:"DBS_LOAN",  name:"DBS Home Loan",  category:"Finance",       icon:"business",       color:"#10B981", bg:"#ECFDF5", dbg:"#064E3B" },
  { id:"UOB_CARD",  name:"UOB Credit Card",category:"Finance",       icon:"card",           color:"#059669", bg:"#ECFDF5", dbg:"#064E3B" },
  { id:"NTUC_INS",  name:"NTUC Income",    category:"Insurance",     icon:"shield",         color:"#EF4444", bg:"#FEF2F2", dbg:"#450A0A" },
  { id:"NETFLIX",   name:"Netflix",        category:"Entertainment", icon:"tv",             color:"#DC2626", bg:"#FEF2F2", dbg:"#450A0A" },
  { id:"SPOTIFY",   name:"Spotify",        category:"Entertainment", icon:"musical-notes",  color:"#16A34A", bg:"#F0FDF4", dbg:"#052E16" },
  { id:"NUS_FEES",  name:"NUS Tuition",    category:"Education",     icon:"school",         color:"#D97706", bg:"#FFFBEB", dbg:"#451A03" },
  { id:"SBS",       name:"SBS Transit",    category:"Transport",     icon:"bus",            color:"#0284C7", bg:"#F0F9FF", dbg:"#0C2D48" },
  { id:"GRAB",      name:"Grab Transport", category:"Transport",     icon:"car",            color:"#16A34A", bg:"#F0FDF4", dbg:"#052E16" },
];

export const CAT_COLORS = {
  Utilities:     { light:{bg:"#EFF6FF",text:"#1D4ED8"}, dark:{bg:"#1E3A5F",text:"#93C5FD"} },
  Telecoms:      { light:{bg:"#F5F3FF",text:"#6D28D9"}, dark:{bg:"#2E1065",text:"#C4B5FD"} },
  Housing:       { light:{bg:"#FFFBEB",text:"#B45309"}, dark:{bg:"#451A03",text:"#FCD34D"} },
  Finance:       { light:{bg:"#ECFDF5",text:"#065F46"}, dark:{bg:"#064E3B",text:"#6EE7B7"} },
  Insurance:     { light:{bg:"#FEF2F2",text:"#991B1B"}, dark:{bg:"#450A0A",text:"#FCA5A5"} },
  Entertainment: { light:{bg:"#FFF1F2",text:"#9F1239"}, dark:{bg:"#4C0519",text:"#FDA4AF"} },
  Education:     { light:{bg:"#FFFBEB",text:"#92400E"}, dark:{bg:"#451A03",text:"#FCD34D"} },
  Transport:     { light:{bg:"#F0F9FF",text:"#0369A1"}, dark:{bg:"#0C2D48",text:"#7DD3FC"} },
  "Food & Dining": { light:{bg:"#FFF7ED",text:"#C2410C"}, dark:{bg:"#431407",text:"#FDBA74"} },
  Travel:        { light:{bg:"#ECFEFF",text:"#0E7490"}, dark:{bg:"#083344",text:"#67E8F9"} },
  "Needs review": { light:{bg:"#F3F4F6",text:"#4B5563"}, dark:{bg:"#1F2937",text:"#D1D5DB"} },
};

export const getCat = (cat, mode) =>
  (CAT_COLORS[cat] || CAT_COLORS.Utilities)[mode];

export const TRANSACTIONS_SEED = [
  { id:1, billerId:"SP_POWER",  biller:"SP Power",      category:"Utilities",     amount:87.40,   date:"11 May 2026", icon:"flash",         iconColor:"#3B82F6", bg:"#EFF6FF", dbg:"#1E3A5F" },
  { id:2, billerId:"SINGTEL",   biller:"Singtel",        category:"Telecoms",      amount:43.00,   date:"9 May 2026",  icon:"cellular",      iconColor:"#8B5CF6", bg:"#F5F3FF", dbg:"#2E1065" },
  { id:3, billerId:"NETFLIX",   biller:"Netflix",        category:"Entertainment", amount:18.90,   date:"7 May 2026",  icon:"tv",            iconColor:"#DC2626", bg:"#FEF2F2", dbg:"#450A0A" },
  { id:4, billerId:"DBS_LOAN",  biller:"DBS Home Loan",  category:"Finance",       amount:1200.00, date:"1 May 2026",  icon:"business",      iconColor:"#10B981", bg:"#ECFDF5", dbg:"#064E3B" },
  { id:5, billerId:"NTUC_INS",  biller:"NTUC Income",    category:"Insurance",     amount:155.00,  date:"28 Apr 2026", icon:"shield",        iconColor:"#EF4444", bg:"#FEF2F2", dbg:"#450A0A" },
  { id:6, billerId:"PUB_WATER", biller:"PUB Water",      category:"Utilities",     amount:34.20,   date:"25 Apr 2026", icon:"water",         iconColor:"#0EA5E9", bg:"#F0F9FF", dbg:"#0C2D48" },
];

export const TOPUP_METHODS = [
  { id:"paynow", label:"PayNow QR",      icon:"qr-code",  description:"Instant - Free" },
  { id:"card",   label:"Credit / Debit", icon:"card",     description:"Visa, Mastercard - Free" },
  { id:"bank",   label:"Bank Transfer",  icon:"business", description:"FAST transfer - Free" },
  { id:"nets",   label:"NETS",           icon:"wallet",   description:"Singapore debit - Free" },
];

export const TOPUP_AMOUNTS = [10, 20, 50, 100, 200, 500];

// Helper component to render biller icons consistently
export function BillerIcon({ icon, color, size = 20 }) {
  return <Ionicons name={icon} size={size} color={color} />;
}