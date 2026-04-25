const SCHEMES = [
  {
    category: "Right to Information",
    title: "RTI Act, 2005",
    description:
      "Every community has the right to request information from public authorities within 30 days. File online at rtionline.gov.in or submit a written application with ₹10 fee.",
    steps: ["Identify the public authority", "Draft your application clearly", "Pay ₹10 fee (BPL applicants exempt)", "Submit and track at rtionline.gov.in"],
    link: "https://rtionline.gov.in",
    color: "blue",
  },
  {
    category: "Employment",
    title: "MGNREGA",
    description:
      "Mahatma Gandhi National Rural Employment Guarantee Act guarantees 100 days of wage employment per year to rural households.",
    steps: ["Register at your local Gram Panchayat", "Get Job Card issued within 15 days", "Apply for work — must be provided within 15 days", "Wages deposited directly to bank account"],
    link: "https://nrega.nic.in",
    color: "green",
  },
  {
    category: "Housing",
    title: "PM Awas Yojana (PMAY)",
    description:
      "Affordable housing for economically weaker sections (EWS), low-income groups (LIG), and middle-income groups (MIG) with interest subsidy.",
    steps: ["Check eligibility on pmaymis.gov.in", "Apply via Common Service Centre (CSC) or online", "Income verification and survey", "Subsidy credited to loan account"],
    link: "https://pmaymis.gov.in",
    color: "amber",
  },
  {
    category: "Health",
    title: "Ayushman Bharat (PMJAY)",
    description:
      "Health insurance cover of ₹5 lakh per family per year for secondary and tertiary hospitalisation. Covers 10.74 crore families.",
    steps: ["Check eligibility at pmjay.gov.in", "Get Ayushman Card at CSC or hospital", "Visit any empanelled hospital", "Cashless treatment up to ₹5 lakh"],
    link: "https://pmjay.gov.in",
    color: "rose",
  },
  {
    category: "Pension",
    title: "PM Shram Yogi Maandhan",
    description:
      "Monthly pension of ₹3000 after age 60 for unorganised workers. Contribution ranges from ₹55–₹200 per month depending on age of entry.",
    steps: ["Visit nearest CSC with Aadhar and savings account", "Enrol and start monthly contribution", "Contribution matched by Central Government", "Receive pension at 60"],
    link: "https://maandhan.in",
    color: "purple",
  },
  {
    category: "Education",
    title: "PM Poshan Shakti Nirman",
    description:
      "Free mid-day meals for students in Classes 1–8 in government schools. Over 11.8 crore children covered.",
    steps: ["Enrol child in government school", "Meals served on all working school days", "Nutritional standards set by government", "Complaints via helpline 1800-180-5500"],
    link: "https://pmposhan.education.gov.in",
    color: "teal",
  },
];

const colorMap: Record<string, { bg: string; badge: string; dot: string }> = {
  blue: { bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  green: { bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  amber: { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  rose: { bg: "bg-rose-50 border-rose-200", badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  purple: { bg: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  teal: { bg: "bg-teal-50 border-teal-200", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
};

export default function RtpsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(text)">Government Schemes &amp; Rights</h1>
        <p className="text-sm text-(muted) mt-1">
          Know your entitlements. Click any scheme to apply on the official government portal.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-(accent)/10 border border-(accent)/30">
        <p className="text-sm text-(text) font-medium">Need help applying?</p>
        <p className="text-xs text-(muted) mt-0.5">
          Your social worker can assist you with the application process. Request an appointment from the Appointments section.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SCHEMES.map((scheme) => {
          const c = colorMap[scheme.color];
          return (
            <div key={scheme.title} className={`rounded-2xl border p-5 ${c.bg} flex flex-col gap-3`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${c.badge}`}>
                    {scheme.category}
                  </span>
                  <h2 className="font-bold text-(text)">{scheme.title}</h2>
                  <p className="text-xs text-(muted) mt-1 leading-relaxed">{scheme.description}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-(text) mb-1.5">How to apply:</p>
                <ol className="space-y-1">
                  {scheme.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-(muted)">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <a
                href={scheme.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto text-xs font-semibold underline text-(text) hover:opacity-70 transition-opacity"
              >
                Apply at {new URL(scheme.link).hostname} →
              </a>
            </div>
          );
        })}
      </div>

      <div className="p-5 rounded-2xl bg-(surface) border border-(border) text-center">
        <p className="text-sm text-(muted)">
          Don't see the scheme you need?{" "}
          <a href="https://services.india.gov.in" target="_blank" rel="noopener noreferrer" className="text-(accent) hover:underline font-medium">
            Browse all schemes on India.gov.in
          </a>
        </p>
      </div>
    </div>
  );
}
