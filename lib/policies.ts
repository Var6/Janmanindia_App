export interface PolicySection {
  title: string;
  body: string;          // Each `\n\n` is a paragraph break.
}

export interface Policy {
  slug: string;          // URL-safe key — used in tabs
  title: string;         // Displayed name
  shortTitle: string;    // For nav / tab pill
  refNo: string;
  date: string;
  intro?: string;        // Optional introductory paragraph
  sections: PolicySection[];
}

export const POLICIES: Policy[] = [
  {
    slug: "hr",
    title: "HR Policy",
    shortTitle: "HR",
    refNo: "Ref. No. 03/08-23",
    date: "29 Aug 2023",
    intro: "At Janman People's Foundation, our mission is to empower and uplift marginalized communities by providing access to essential resources, education, healthcare, and legal assistance. The HR policy provides a clear framework for employee engagement, welfare, and professional growth — ensuring fairness, transparency, and consistency in our practices.",
    sections: [
      {
        title: "Mission and Values",
        body: "We are committed to promoting social justice, human rights, and sustainable development, aiming to create a just and equitable society for all.",
      },
      {
        title: "Scope and Applicability",
        body: "This policy applies to all employees — full-time, part-time, temporary, contract workers, volunteers and interns associated with Janman People's Foundation. It covers every location where the organisation operates and extends to all HR-related matters throughout the employment lifecycle.",
      },
      {
        title: "Diversity and Inclusion",
        body: "We foster an inclusive work environment that respects and appreciates the diverse backgrounds, perspectives, and contributions of our employees and stakeholders. Discrimination, harassment, or any form of bias will not be tolerated.",
      },
      {
        title: "Compliance with Laws",
        body: "Janman is committed to complying with all applicable labour laws and regulations concerning human resources and employment.",
      },
      {
        title: "Confidentiality and Code of Conduct",
        body: "Employees must maintain strict confidentiality regarding sensitive information — proprietary data, donor information, personal records, and any other confidential materials. Breaches may result in disciplinary action.\n\nAll employees represent Janman and are expected to adhere to the highest standards of professional conduct: honesty, integrity, respect, and accountability.",
      },
      {
        title: "1. Employment & Selection",
        body: "Equal Employment Opportunity — Janman is an equal opportunity employer. All applicants are evaluated based on the specific job requirements and qualifications outlined in the job description, regardless of race, colour, religion, gender, national origin, age, disability, sexual orientation or any other legally protected status.\n\nRecruitment Process — Job descriptions are prepared with HR; openings are posted internally and externally (website, social media, job portals). Selection includes application reviews, screening interviews, technical assessments and panel interviews.\n\nJob Offer & Probation — Successful candidates receive a formal offer detailing position, compensation, benefits and terms. New employees undergo a probationary period (duration in the contract) with guidance, feedback and support.",
      },
      {
        title: "2. Onboarding and Orientation",
        body: "New employees go through a comprehensive orientation introducing the mission, values, culture, policies and procedures. They are familiarised with the code of conduct, HR policies, safety guidelines, and have a clear platform to ask questions.\n\nWe provide access to training programs, workshops, and resources to enhance skills and knowledge.",
      },
      {
        title: "3. Compensation and Benefits",
        body: "Payroll is processed on a predetermined schedule by HR; any changes are communicated in advance.\n\nA fair and competitive salary structure is maintained, with periodic revisions based on performance and market trends.\n\nPerformance-based incentives and bonuses may be offered. Benefits may include health insurance, retirement plans, paid time off, maternity/paternity leave and other relevant perks.",
      },
      {
        title: "4. Performance Management",
        body: "Regular performance evaluations assess achievements and growth. Goals are set collaboratively with supervisors and aligned with organisational objectives. Continuous feedback is encouraged.\n\nIf performance issues arise, performance improvement plans outline specific actions, timelines, and support mechanisms.",
      },
      {
        title: "5. Leave and Attendance",
        body: "Various leave types are offered: vacation, sick leave, bereavement leave, parental leave, and statutory leaves per applicable law.\n\nFollow the designated leave approval process and submit appropriate documentation. Punctuality and regular attendance are expected; report unplanned absences promptly.",
      },
      {
        title: "6. Employee Relations & Grievance",
        body: "All employees follow the code of conduct — respect, integrity, ethical behaviour.\n\nZero-tolerance policy for harassment and discrimination of any kind. Report instances promptly; the organisation takes immediate action.\n\nGrievances can be raised through immediate supervisors, HR representatives, or the in-app Grievance box (anonymous option available). Concerns are addressed promptly, impartially and confidentially.",
      },
      {
        title: "7. Training and Development",
        body: "Training needs are assessed regularly to identify skill gaps. Internal and external programs cover technical skills, leadership, cultural competency and other relevant areas.\n\nThe organisation may support certifications, conference/workshop attendance, and access to relevant resources.",
      },
      {
        title: "8. Health and Safety",
        body: "Janman provides a safe and healthy work environment. Follow safety guidelines and report concerns promptly.\n\nEmergency protocols including evacuation procedures and crisis management plans exist — familiarise yourself and participate in drills.\n\nWellness initiatives (health screenings, programs, mental + physical health resources) support overall well-being.",
      },
      {
        title: "9. Termination and Separation",
        body: "Resignations require adequate notice as per the employment contract — this allows smooth transition and handover.\n\nInvoluntary terminations follow fair, transparent procedures aligned with labour laws. Affected employees receive necessary support.\n\nDeparting employees may be invited to exit interviews to share feedback that informs continuous improvement.",
      },
      {
        title: "10. Confidentiality and Data Protection",
        body: "Maintain confidentiality of sensitive information at all times — proprietary data, donor information, financial records and any confidential materials.\n\nJanman complies with data protection laws; handle data responsibly per organisational policies.",
      },
      {
        title: "11. Amendments and Policy Review",
        body: "HR policies are reviewed periodically and updated as needed. Significant changes are communicated through internal channels (emails, newsletters, intranet portals).",
      },
    ],
  },
  {
    slug: "finance",
    title: "Finance Policy",
    shortTitle: "Finance",
    refNo: "Ref. No. 04/08-23",
    date: "29 Aug 2023",
    intro: "The Finance Policy ensures responsible financial management, transparency, and accountability across all financial activities. It applies to every financial transaction — donations, grants, salaries, procurements, investments, and project budget allocations.",
    sections: [
      {
        title: "1. Budgeting and Financial Planning",
        body: "Annual Budget — Janman prepares an annual budget detailing expected income and expenses. The budget is approved by the Board of Directors before the fiscal year begins, and reviewed periodically to ensure alignment with organisational goals.\n\nBudget Allocation — Funds are allocated to projects, programs and administrative functions based on strategic importance and expected outcomes, prioritising impact and cost-effectiveness aligned with the mission.",
      },
      {
        title: "2. Financial Controls",
        body: "Authorization & Approval — All financial transactions must be authorized by designated individuals with the appropriate authority. Expenditures beyond approved project budgets require additional approval.\n\nFinancial Signing Authority — Only designated individuals may sign cheques, approve expenses, and authorize transactions, with reference to project budgets.\n\nSegregation of Duties — Financial recordkeeping, cash handling, and payments are distributed among different individuals to prevent conflicts of interest and ensure checks and balances.",
      },
      {
        title: "3. Expense Management",
        body: "Expense Reimbursements — Employees and volunteers incurring authorised project expenses must submit detailed expense reports with appropriate supporting documentation. Reimbursement is made promptly per the project's process.\n\nProject Budget Adherence — Expenses must adhere to the allocated project budget. Any deviation requires prior approval from the responsible project manager and, when necessary, the Board of Directors.",
      },
      {
        title: "4. Procurement and Vendor Management",
        body: "Procurement Policy — Purchases of goods and services for each project follow a clearly defined procurement policy, conducted in a fair, competitive and transparent manner with adherence to project budgets.\n\nVendor Selection — Vendors are selected based on capability, quality, pricing and track record, in alignment with project-specific requirements and budgets.",
      },
      {
        title: "5. Financial Reporting and Audit",
        body: "Financial Reports — Regular reports are prepared and shared with the Board, project managers and stakeholders, providing a clear overview of each project's financial performance and position.\n\nProject Budget Reports — Project-specific budget reports ensure that each project's financial performance aligns with its allocated budget.\n\nExternal Audit — An external audit is conducted annually for compliance, statement verification and an independent assessment of financial health. Project-specific audits may be conducted as needed.",
      },
    ],
  },
  {
    slug: "harassment",
    title: "Sexual Harassment Policy",
    shortTitle: "POSH",
    refNo: "Ref. No. 02/08-23",
    date: "29 Aug 2023",
    intro: "Janman People's Foundation is committed to providing a safe and respectful work environment that is free from all forms of sexual harassment. We firmly believe in promoting dignity, respect, and equal opportunities for all employees, volunteers, beneficiaries, and stakeholders.",
    sections: [
      {
        title: "Definition of Sexual Harassment",
        body: "Sexual harassment is any unwelcome and offensive conduct of a sexual nature that creates a hostile, intimidating, or uncomfortable working environment.\n\nThis includes — but is not limited to — unwanted advances, comments, jokes, innuendos, requests for sexual favours, or any other verbal, non-verbal or physical conduct of a sexual nature that interferes with an individual's work performance or creates a hostile environment.",
      },
      {
        title: "Prevention",
        body: "1. Regular training and awareness programs on sexual harassment prevention and reporting procedures.\n\n2. A culture of respect and inclusion, where all individuals are treated with dignity and equality.\n\n3. Open communication and dialogue about sexual harassment to raise awareness and understanding.",
      },
      {
        title: "Internal Complaint Committee (ICC)",
        body: "Janman constitutes an Internal Complaint Committee (ICC) responsible for addressing complaints and maintaining confidentiality. The ICC consists of:\n\n• Presiding Officer — a senior woman employee (or a senior lady advocate if no senior woman employee is available)\n• Human Resources Representative — internal or external senior HR professional\n• Legal Advisor — internal or external legal expert\n• Senior Management Representative — senior executive who can authorise corrective action\n• Employee Representative — staff member chosen by employees\n• Gender Sensitivity Trainer — expert in gender sensitivity and harassment prevention",
      },
      {
        title: "Complaint Procedure",
        body: "1. Reporting — report the incident to any ICC member or your immediate supervisor/manager.\n\n2. Confidentiality — the ICC maintains strict confidentiality throughout the process to protect the privacy of all parties involved.\n\n3. Investigation — the committee conducts a fair, impartial investigation, interviewing the complainant, the accused, and any witnesses.\n\n4. Decision and Action — upon completion, the ICC decides on appropriate actions which may include counselling, disciplinary measures, or other corrective actions.\n\n5. No Retaliation — Janman strictly prohibits retaliation against individuals who file complaints or participate in the investigation process.",
      },
      {
        title: "How to Report",
        body: "You can:\n\n• Speak directly to any ICC member listed above.\n• Talk to your immediate supervisor or manager.\n• Use the in-app Grievance box (with the anonymous option) to send a confidential report directly to HR.\n\nYou will not face retaliation for raising a complaint in good faith.",
      },
    ],
  },
];

export function findPolicy(slug: string): Policy | undefined {
  return POLICIES.find((p) => p.slug === slug);
}
