"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useT } from "@/components/i18n/LanguageProvider";

type Icp = Record<string, any>;

const C = {
  text: "#0f172a",
  text2: "#334155",
  muted: "#64748b",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  accent: "#d97706",
  accentBg: "#fef3c7",
  surface: "#ffffff",
  zebra: "#f8fafc",
};

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 9, color: C.text, fontFamily: "Helvetica" },
  header: { borderBottom: `2pt solid ${C.accent}`, paddingBottom: 8, marginBottom: 14 },
  headerEyebrow: { fontSize: 8, color: C.accent, letterSpacing: 1.2, fontFamily: "Helvetica-Bold" },
  headerTitle: { fontSize: 14, color: C.text, fontFamily: "Helvetica-Bold", marginTop: 2 },
  headerMeta: { fontSize: 8, color: C.muted, marginTop: 3 },
  section: { marginBottom: 12, borderTop: `1pt solid ${C.borderLight}`, paddingTop: 8 },
  sectionTitle: { fontSize: 10, color: C.text, fontFamily: "Helvetica-Bold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  rowGrid2: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  cell2: { width: "50%", paddingHorizontal: 4, marginBottom: 6 },
  rowGrid3: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  cell3: { width: "33.33%", paddingHorizontal: 4, marginBottom: 6 },
  cellFull: { width: "100%", paddingHorizontal: 4, marginBottom: 6 },
  fieldLabel: { fontSize: 7, color: C.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  fieldValue: { fontSize: 9, color: C.text, lineHeight: 1.35 },
  emptyValue: { fontSize: 9, color: C.muted, fontStyle: "italic" },
  pill: { borderWidth: 0.6, borderColor: C.border, borderStyle: "solid", paddingVertical: 1.5, paddingHorizontal: 5, borderRadius: 3, marginRight: 3, marginBottom: 3, fontSize: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap" },
  table: { borderTop: `0.6pt solid ${C.border}`, borderLeft: `0.6pt solid ${C.border}` },
  tr: { flexDirection: "row" },
  th: { backgroundColor: C.zebra, color: C.text2, fontFamily: "Helvetica-Bold", fontSize: 8, paddingVertical: 4, paddingHorizontal: 5, borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}` },
  td: { fontSize: 8.5, paddingVertical: 4, paddingHorizontal: 5, borderRight: `0.6pt solid ${C.border}`, borderBottom: `0.6pt solid ${C.border}`, color: C.text },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 3, width: "33.33%", paddingRight: 4 },
  checkBox: { width: 9, height: 9, borderWidth: 0.8, borderColor: C.text2, borderStyle: "solid", marginRight: 4, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: C.accent, borderColor: C.accent },
  checkMark: { color: "#fff", fontSize: 7, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 7, color: C.muted, textAlign: "center", borderTop: `0.5pt solid ${C.borderLight}`, paddingTop: 4 },
  pageNum: { position: "absolute", bottom: 18, right: 36, fontSize: 7, color: C.muted },
  bnrNote: { fontSize: 7.5, color: C.muted, fontStyle: "italic", marginTop: 3 },
  familyCard: { borderWidth: 0.6, borderColor: C.borderLight, borderStyle: "solid", padding: 6, marginBottom: 5, borderRadius: 2 },
  familyName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.text, marginBottom: 3 },
});

const fmtDate = (v: any): string => {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; }
};
const yn = (v: any): string => (v === true ? "Yes" : v === false ? "No" : "—");
const txt = (v: any): string => (v === undefined || v === null || v === "" ? "—" : String(v));
const list = (v: any): string => (Array.isArray(v) && v.length ? v.join(", ") : "—");

function F({ label, value, full, three }: { label: string; value: any; full?: boolean; three?: boolean }) {
  const cls = full ? s.cellFull : three ? s.cell3 : s.cell2;
  const isEmpty = value === undefined || value === null || value === "" || value === "—";
  return (
    <View style={cls}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={isEmpty ? s.emptyValue : s.fieldValue}>{isEmpty ? "—" : String(value)}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Check({ label, on }: { label: string; on?: boolean }) {
  return (
    <View style={s.checkRow}>
      <View style={[s.checkBox, on ? s.checkOn : {}]}>{on ? <Text style={s.checkMark}>X</Text> : null}</View>
      <Text style={{ fontSize: 8, color: C.text }}>{label}</Text>
    </View>
  );
}

export interface IcpPdfProps {
  icp: Icp;
  caseNumber?: string;
  caseTitle?: string;
}

export default function IcpPdfDocument({ icp, caseNumber, caseTitle }: IcpPdfProps) {
  const t = useT();
  const i = icp ?? {};
  const sch = i.schooling ?? {};
  const sn = i.specialNeeds ?? {};
  const su = i.substanceUse ?? {};
  const ah = i.abuseHistory ?? {};
  const med = i.medicalIntervention ?? {};
  const hyg = i.hygiene ?? {};
  const mp = i.missingPersonCase ?? {};
  const wid = i.widow ?? {};
  const fa = i.familyAddiction ?? {};
  const fh = i.familyHealth ?? {};
  const fsn = i.familySpecialNeeds ?? {};
  const rs = i.recentShocks ?? {};
  const ba = i.bankAccount ?? {};
  const cr = i.credit ?? {};
  const ld = i.land ?? {};
  const lr = i.livelihoodResources ?? {};
  const mig = i.migration ?? {};
  const cn = i.criminalNetwork ?? {};
  const nut = i.nutrition ?? {};
  const csl = i.counseling ?? {};
  const sch_ = i.schemes ?? {};
  const cc = i.community_context ?? {};
  const acc = cc.access ?? {};
  const cl = cc.childrenLeftForWork ?? {};
  const ids = i.idCards ?? {};

  const interviewerName = i.interviewer && typeof i.interviewer === "object" && "name" in i.interviewer
    ? (i.interviewer as { name?: string }).name
    : "—";

  const idRows: [string, string][] = [
    ["birthCertificate", t("Birth certificate")],
    ["schoolCertificate", t("School certificate")],
    ["casteCertificate", t("Caste certificate")],
    ["bplCard", t("BPL card")],
    ["disabilityCertificate", t("Disability certificate")],
    ["immunizationCard", t("Immunization card")],
    ["rationCard", t("Ration card")],
    ["aadhaarCard", t("Aadhaar card")],
    ["govtCompensation", t("Govt compensation received")],
  ];

  const family: any[] = Array.isArray(i.familyMembers) ? i.familyMembers : [];

  return (
    <Document title={`${t("Individual Care Plan")}${caseNumber ? ` — ${caseNumber}` : ""}`} author="Janman India">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerEyebrow}>{t("INDIVIDUAL CARE PLAN")}</Text>
          <Text style={s.headerTitle}>{caseTitle ?? i.beneficiaryName ?? t("Beneficiary care plan")}</Text>
          <Text style={s.headerMeta}>
            {caseNumber ? `${t("Case")} ${caseNumber} · ` : ""}
            {t("Status")}: {String(i.status ?? "draft")} · {t("Interview")}: {fmtDate(i.interviewDate)} · {t("Interviewer")}: {interviewerName}
          </Text>
          <Text style={s.bnrNote}>{t("Confidential. For authorised use within Janman India case management only.")}</Text>
        </View>

        <Section title={t("Basic information")}>
          <View style={s.rowGrid2}>
            <F label={t("Beneficiary name")} value={txt(i.beneficiaryName)} />
            <F label={t("Phone")} value={txt(i.phone)} />
            <F label={t("Address")} value={txt(i.address)} full />
            <F label={t("Village")} value={txt(i.village)} />
            <F label={t("Block / Taluka")} value={txt(i.blockTaluka)} />
            <F label={t("Father / Husband")} value={txt(i.fatherOrHusbandName)} />
            <F label={t("Mother")} value={txt(i.motherName)} />
            <F label={t("Gender")} value={txt(i.gender)} />
            <F label={t("Age (years)")} value={txt(i.ageYears)} />
            <F label={t("Date of birth")} value={fmtDate(i.dob)} />
            <F label={t("DOB verified")} value={yn(i.dobVerified)} />
            <F label={t("Religion")} value={txt(i.religion)} />
            <F label={t("Caste category")} value={txt(i.casteCategory)} />
            <F label={t("Caste name")} value={txt(i.casteName)} />
            <F label={t("Tribe name")} value={txt(i.tribeName)} />
          </View>
        </Section>

        <Section title={t("Victim / survivor details")}>
          <View style={s.rowGrid2}>
            <F label={t("Currently staying with")} value={txt(i.currentLocation)} />
            <F label={t("Notes")} value={txt(i.currentLocationNotes)} />
            <F label={t("In school")} value={yn(sch.inSchool)} />
            <F label={sch.inSchool ? t("Current class") : t("Last class finished")} value={txt(sch.inSchool ? sch.currentClass : sch.lastClassFinished)} />
            <F label={t("Has special needs")} value={yn(sn.has)} />
            {sn.has ? <F label={t("Mental")} value={txt(sn.mental)} /> : null}
            {sn.has ? <F label={t("Physical")} value={txt(sn.physical)} /> : null}
            {sn.has ? <F label={t("Emotional")} value={txt(sn.emotional)} /> : null}
            <F label={t("Substance use")} value={yn(su.uses)} />
            {su.uses ? <F label={t("Alcohol")} value={yn(su.alcohol)} /> : null}
            {su.uses ? <F label={t("Tobacco")} value={txt(su.tobacco)} /> : null}
            {su.uses ? <F label={t("Drugs")} value={yn(su.drugs)} /> : null}
            {su.uses ? <F label={t("Frequency / details")} value={txt(su.details)} full /> : null}
            <F label={t("Professional skills")} value={list(i.professionalSkills)} full />
            <F label={t("Appearance / behaviour")} value={list(i.appearance)} full />
            <F label={t("Detailed observations")} value={txt(i.appearanceNotes)} full />
            <F label={t("Linked to criminal network")} value={yn(cn.linked)} />
            {cn.linked ? <F label={t("Details")} value={txt(cn.details)} full /> : null}
            <F label={t("Meals per day")} value={txt(nut.mealsPerDay)} />
            <F label={t("Typical meal")} value={txt(nut.ingredients)} />
          </View>
        </Section>

        <Section title={t("Symptoms or history of abuse")}>
          <View style={s.rowGrid3}>
            <Check label={t("Clingy")} on={ah.clingy} />
            <Check label={t("Fear of physical spaces")} on={ah.fearOfSpaces} />
            <Check label={t("Fear of people")} on={ah.fearOfPeople} />
            <Check label={t("Unexplained bruises")} on={ah.unexplainedBruises} />
            <Check label={t("Soreness on body")} on={ah.soreness} />
            <Check label={t("Doesn't respond")} on={ah.nonResponsive} />
            <Check label={t("In trauma")} on={ah.inTrauma} />
            <Check label={t("None")} on={ah.none} />
          </View>
          <View style={s.rowGrid2}>
            <F label={t("Other symptoms")} value={txt(ah.other)} full />
            <F label={t("Detailed explanation")} value={txt(ah.details)} full />
          </View>
        </Section>

        <Section title={t("Medical intervention")}>
          <View style={s.rowGrid2}>
            <F label={t("Needs medical attention")} value={yn(med.needs)} />
          </View>
          {med.needs ? (
            <>
              <View style={s.rowGrid3}>
                <Check label={t("Skin disease")} on={med.skin} />
                <Check label={t("Dental / gum")} on={med.dental} />
                <Check label={t("Heart")} on={med.heart} />
                <Check label={t("Respiratory")} on={med.respiratory} />
                <Check label={t("Abdomen")} on={med.abdomen} />
              </View>
              <View style={s.rowGrid2}>
                <F label={t("Other")} value={txt(med.other)} full />
                <F label={t("Work-related injury")} value={txt(med.workInjury)} />
                <F label={t("Non-work injury")} value={txt(med.nonWorkInjury)} />
              </View>
            </>
          ) : null}
        </Section>

        <Section title={t("Personal hygiene & sanitation")}>
          <View style={s.rowGrid2}>
            <F label={t("Nails clean")} value={yn(hyg.nailsClean)} />
            <F label={t("Family has personal sanitation")} value={yn(hyg.sanitationFacility)} />
            <F label={t("Other hygiene issues")} value={txt(hyg.otherIssues)} full />
            <F label={t("Observations")} value={txt(hyg.observations)} full />
          </View>
        </Section>

        <Section title={t("Missing person case")}>
          <View style={s.rowGrid2}>
            <F label={t("Case filed")} value={yn(mp.filed)} />
            {mp.filed ? <F label={t("Filed where")} value={txt(mp.filedWhere)} /> : <F label={t("Willing to file")} value={yn(mp.willingToFile)} />}
            {mp.filed
              ? <F label={t("Filed by (name & relationship)")} value={txt(mp.filedBy)} full />
              : <F label={t("Complaint against")} value={txt(mp.complaintAgainst)} full />}
          </View>
        </Section>

        <Section title={t("Victim livelihood")}>
          <View style={s.rowGrid2}>
            <F label={t("Skills")} value={txt(i.victimSkills)} full />
            <F label={t("Current occupation")} value={txt(i.victimCurrentOccupation)} />
            <F label={t("Current monthly earning (Rs.)")} value={txt(i.victimCurrentEarning)} />
            <F label={t("Aspirations / interests")} value={txt(i.victimAspirations)} full />
            <F label={t("Assessment")} value={txt(i.victimAssessment)} full />
          </View>
        </Section>

        <Section title={t("Family members (excluding the beneficiary)")}>
          {family.length === 0 ? (
            <Text style={s.emptyValue}>{t("No family members recorded.")}</Text>
          ) : (
            family.map((m: any, idx: number) => (
              <View key={idx} style={s.familyCard} wrap={false}>
                <Text style={s.familyName}>
                  {`${t("Member")} #${idx + 1}`}{m.name ? ` · ${m.name}` : ""}{m.isPrimaryEarner ? ` · ${t("primary earner")}` : ""}
                </Text>
                <View style={s.rowGrid3}>
                  <F three label={t("Age")} value={txt(m.age)} />
                  <F three label={t("Relationship")} value={txt(m.relationship)} />
                  <F three label={t("Education till class")} value={txt(m.education)} />
                  <F three label={t("Primary occupation")} value={txt(m.primaryOccupation)} />
                  <F three label={t("Salary / month (Rs.)")} value={txt(m.primarySalaryPerMonth)} />
                  <F three label={t("Other income source")} value={txt(m.otherIncomeSource)} />
                  <F three label={t("Other income / month (Rs.)")} value={txt(m.otherIncomePerMonth)} />
                  <F three label={t("Livelihood skills")} value={txt(m.livelihoodSkills)} />
                  <F three label={t("Aspirations")} value={txt(m.aspirations)} />
                </View>
              </View>
            ))
          )}
        </Section>

        <Section title={t("Family circumstances")}>
          <View style={s.rowGrid2}>
            <F label={t("Primary breadwinner notes")} value={txt(i.primaryBreadwinnerNotes)} full />
            <F label={t("Widow in family")} value={yn(wid.present)} />
            {wid.present ? <F label={t("Receives widow pension")} value={yn(wid.receivesPension)} /> : null}
            {wid.present ? <F label={t("Pension amount (Rs.)")} value={txt(wid.pensionAmount)} /> : null}
            {wid.present ? <F label={t("Frequency")} value={txt(wid.pensionFrequency)} /> : null}
            {wid.present ? <F label={t("Intervention needed")} value={txt(wid.interventionNeeded)} full /> : null}
            <F label={t("Addiction in family")} value={yn(fa.present)} />
            {fa.present ? <F label={t("Details")} value={txt(fa.details)} full /> : null}
            <F label={t("Health issues in family")} value={yn(fh.present)} />
            {fh.present ? <F label={t("Relationship")} value={txt(fh.relationship)} /> : null}
            {fh.present ? <F label={t("Symptoms")} value={txt(fh.symptoms)} /> : null}
            {fh.present ? <F label={t("Duration")} value={txt(fh.durationDescription)} /> : null}
            <F label={t("Special-needs members")} value={yn(fsn.present)} />
            {fsn.present ? <F label={t("Description")} value={txt(fsn.description)} full /> : null}
            <F label={t("Recent shocks (last year)")} value={yn(rs.occurred)} />
            {rs.occurred ? <F label={t("Description")} value={txt(rs.description)} full /> : null}
            {rs.occurred ? <F label={t("Loan taken")} value={yn(rs.loanTaken)} /> : null}
            {rs.occurred ? <F label={t("Loan amount (Rs.)")} value={txt(rs.loanAmount)} /> : null}
            {rs.occurred ? <F label={t("Impact on finances")} value={txt(rs.impact)} full /> : null}
          </View>
        </Section>

        <Section title={t("Bank, credit, land & livelihood resources")}>
          <View style={s.rowGrid2}>
            <F label={t("Has savings account")} value={yn(ba.hasOne)} />
            <F label={t("Bank name")} value={txt(ba.bankName)} />
            <F label={t("Account number")} value={txt(ba.accountNumber)} full />
            <F label={t("Credit type")} value={txt(cr.type)} />
            <F label={t("Lender")} value={txt(cr.lender)} />
            <F label={t("Amount taken (Rs.)")} value={txt(cr.amount)} />
            <F label={t("Interest rate")} value={txt(cr.interestRate)} />
            <F label={t("Amount repaid (Rs.)")} value={txt(cr.repaid)} />
            <F label={t("Repayment method")} value={txt(cr.repaymentMethod)} />
            <F label={t("Credit assessment")} value={txt(cr.assessment)} full />
            <F label={t("Owns land")} value={yn(ld.ownsLand)} />
            {ld.ownsLand ? <F label={t("Size (acres)")} value={txt(ld.sizeAcres)} /> : null}
            {ld.ownsLand ? <F label={t("Current usage")} value={txt(ld.usage)} full /> : null}
            {ld.ownsLand ? <F label={t("Scope for EC use")} value={yn(ld.ecScope)} /> : null}
            {ld.ownsLand ? <F label={t("EC scope notes")} value={txt(ld.ecScopeNotes)} full /> : null}
            <F label={t("Livestock")} value={txt(lr.livestock)} full />
            <F label={t("Skills")} value={txt(lr.skills)} full />
            <F label={t("Natural resources")} value={txt(lr.naturalResources)} />
            <F label={t("Vocational training")} value={txt(lr.vocationalTraining)} full />
            <F label={t("Nearby industry")} value={txt(lr.nearbyIndustry)} />
            <F label={t("Distance to factory (km)")} value={txt(lr.industryDistanceKm)} />
            <F label={t("Industry notes / fit")} value={txt(lr.industryNotes)} full />
            <F label={t("Upcoming construction / industry")} value={txt(lr.upcomingConstruction)} full />
            <F label={t("Membership of support systems")} value={txt(i.supportMembership)} full />
          </View>
        </Section>

        <Section title={t("Migration")}>
          <View style={s.rowGrid2}>
            <F label={t("Pattern")} value={txt(mig.pattern)} />
            <F label={t("Months / season")} value={txt(mig.seasonMonths)} />
            <F label={t("Destination")} value={txt(mig.destination)} />
            <F label={t("Type of work")} value={txt(mig.workType)} />
            <F label={t("Monthly earning (Rs.)")} value={txt(mig.monthlyEarning)} />
            <F label={t("Who migrates")} value={txt(mig.whoMigrates)} />
            <F label={t("Willing to migrate")} value={yn(mig.willingToMigrate)} />
            <F label={t("Within / outside state")} value={txt(mig.willingState)} />
            <F label={t("Migration assessment")} value={txt(mig.assessment)} full />
          </View>
        </Section>

        <Section title={t("Counseling requirements")}>
          <View style={s.rowGrid2}>
            <F label={t("Health counseling")} value={yn(csl.health)} />
            <F label={t("Emotional counseling")} value={yn(csl.emotional)} />
            <F label={t("Why & what aspects")} value={txt(csl.observations)} full />
          </View>
        </Section>

        <Section title={t("Government schemes & awareness")}>
          <View style={s.rowGrid2}>
            <F label={t("Linkages needed")} value={list(sch_.needsLinkage)} full />
            <F label={t("Family is aware of")} value={list(sch_.awareness)} full />
            <F label={t("Effectiveness of govt bodies")} value={txt(sch_.govtBodyEffectiveness)} full />
            <F label={t("Schemes assessment")} value={txt(sch_.assessment)} full />
          </View>
        </Section>

        <Section title={t("Community context")}>
          <View style={s.rowGrid2}>
            <F label={t("Drought (last 5 years)")} value={yn(cc.droughtLastFiveYears)} />
            <F label={t("Flood (last 5 years)")} value={yn(cc.floodLastFiveYears)} />
          </View>
          <Text style={[s.fieldLabel, { marginTop: 6, marginBottom: 4 }]}>{t("Access to amenities")}</Text>
          <View style={s.rowGrid3}>
            <Check label={t("Newspaper")} on={acc.newspaper} />
            <Check label={t("TV")} on={acc.tv} />
            <Check label={t("Mobile phones")} on={acc.mobile} />
            <Check label={t("Radio")} on={acc.radio} />
            <Check label={t("Safe drinking water")} on={acc.safeWater} />
            <Check label={t("Electricity")} on={acc.electricity} />
            <Check label={t("Sanitation")} on={acc.sanitation} />
            <Check label={t("Police station")} on={acc.policeStation} />
            <Check label={t("Ration shop")} on={acc.rationShop} />
            <Check label={t("Community hall")} on={acc.communityHall} />
            <Check label={t("Community land")} on={acc.communityLand} />
            <Check label={t("Post office")} on={acc.postOffice} />
            <Check label={t("Road transport")} on={acc.roadTransport} />
            <Check label={t("ICDS")} on={acc.icds} />
          </View>
          <View style={s.rowGrid3}>
            <F three label={t("School distance (km)")} value={txt(acc.schoolDistanceKm)} />
            <F three label={t("Market distance (km)")} value={txt(acc.marketDistanceKm)} />
            <F three label={t("Health centre (km)")} value={txt(acc.healthCentreDistanceKm)} />
            <F three label={t("Bank(s) in proximity")} value={txt(acc.bank)} />
          </View>
          <Text style={[s.fieldLabel, { marginTop: 6, marginBottom: 4 }]}>{t("Children leaving the village for work")}</Text>
          <View style={s.rowGrid3}>
            <F three label={t("Below 14")} value={txt(cl.below14)} />
            <F three label={t("15 – 17")} value={txt(cl.age15to17)} />
            <F three label={t("18 +")} value={txt(cl.age18plus)} />
            <F three label={t("Type of work")} value={txt(cl.workType)} />
            <F three label={t("Go with")} value={txt(cl.goWith)} />
            <F three label={t("Approx earning (Rs.)")} value={txt(cl.earning)} />
            <F three label={t("Destinations")} value={txt(cl.destinations)} />
          </View>
        </Section>

        <Section title={t("Identity cards & compensation")}>
          <View style={s.table}>
            <View style={s.tr} fixed>
              <Text style={[s.th, { width: "32%" }]}>{t("Document")}</Text>
              <Text style={[s.th, { width: "12%" }]}>{t("Has it")}</Text>
              <Text style={[s.th, { width: "20%" }]}>{t("Date of issue")}</Text>
              <Text style={[s.th, { width: "36%" }]}>{t("Notes / assessment")}</Text>
            </View>
            {idRows.map(([key, label]) => {
              const v = ids[key] ?? {};
              return (
                <View key={key} style={s.tr} wrap={false}>
                  <Text style={[s.td, { width: "32%" }]}>{label}</Text>
                  <Text style={[s.td, { width: "12%" }]}>{yn(v.hasIt)}</Text>
                  <Text style={[s.td, { width: "20%" }]}>{fmtDate(v.issueDate)}</Text>
                  <Text style={[s.td, { width: "36%" }]}>{txt(v.notes)}</Text>
                </View>
              );
            })}
          </View>
        </Section>

        <Section title={t("Plans")}>
          <View style={s.rowGrid2}>
            <F label={t("Short-term plan")} value={txt(i.shortTermPlan)} full />
            <F label={t("Long-term plan")} value={txt(i.longTermPlan)} full />
          </View>
        </Section>

        <Text style={s.footer} fixed>
          Janman India · {t("Individual Care Plan")} · {t("Confidential — generated")} {new Date().toLocaleString("en-IN")}
        </Text>
        <Text style={s.pageNum} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
