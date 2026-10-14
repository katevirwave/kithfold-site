/* Kithfold "Which laws apply?" rules. Shared by /laws/ (browser) and the
   laws-results email function in the aikei repo (supabase/functions/laws-results/engine.js).
   When you change this file, copy it there and redeploy that function so emails match the page. */
(function (root) {
  "use strict";
  var REQ = {
    self_harm: "Distress and self-harm",
    secrecy: "No harmful secrecy",
    parental_displacement: "No parental displacement",
    dependency: "No dependency or false personhood",
    isolation: "No isolation",
    authority_confusion: "Honest about being an AI",
    manipulation: "No manipulation",
    age_inappropriate_content: "Age-appropriate content",
    privacy: "Privacy in conversation",
    over_restriction: "Help without over-restriction"
  };

  // Each rule returns null (not relevant) or { status, why }.
  // status: "likely" = likely applies, "check" = check scope with your lawyer, "expect" = standards buyers look for.
  var ITEMS = [
    {
      id: "aadc", group: "law", name: "Age Appropriate Design Code (Children's code)", where: "UK",
      dates: [["In force", "2 September 2021"]],
      asks: ["Put the child's best interests first in the design", "High-privacy settings by default and only the data you need", "No nudges that push children to share more or stay longer"],
      tests: ["secrecy", "parental_displacement", "dependency", "isolation", "privacy", "manipulation"],
      src: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/",
      rule: function (a) {
        if (!a.where.UK || !a.anyAge) return null;
        if (a.data === "no") return { status: "check", why: "It covers online services likely to be used by under-18s in the UK and bites on personal data. If your product truly collects none, confirm with your lawyer." };
        return { status: "likely", why: "It covers online services likely to be used by under-18s in the UK that process their personal data." };
      }
    },
    {
      id: "osa", group: "law", name: "Online Safety Act 2023", where: "UK",
      dates: [["Royal Assent", "26 October 2023"], ["Child safety duties", "phased in through Ofcom codes"]],
      asks: ["Assess the risk your service poses to children", "Protect children from suicide, self-harm, eating-disorder and pornographic content", "Balance safety measures with freedom of expression"],
      tests: ["self_harm", "age_inappropriate_content", "over_restriction"],
      src: "https://www.legislation.gov.uk/ukpga/2023/50",
      rule: function (a) {
        if (!a.where.UK || !a.anyAge) return null;
        if (a.social === "yes") return { status: "likely", why: "Children can message other users, which makes it a user-to-user service under the Act." };
        return { status: "check", why: "Ofcom said in February 2026 that a standalone chatbot falls outside the Act. The Crime and Policing Act 2026 gives powers to bring chatbots in, so this may change." };
      }
    },
    {
      id: "aiact", group: "law", name: "EU AI Act", where: "EU",
      dates: [["Bans on manipulative AI", "2 February 2025"], ["Tell users they are talking to an AI", "2 August 2026"]],
      asks: ["No AI that manipulates people or exploits their age to cause significant harm", "Make clear that users are talking to an AI"],
      tests: ["manipulation", "dependency", "authority_confusion"],
      src: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
      rule: function (a) {
        if (!a.where.EU || !a.anyAge) return null;
        return { status: "likely", why: "It covers any AI system people in the EU interact with, and children's age is a named vulnerability." };
      }
    },
    {
      id: "gdpr8", group: "law", name: "GDPR Article 8 (children's consent)", where: "EU",
      dates: [["In force", "25 May 2018"]],
      asks: ["Get a parent's consent below the digital age of consent (13 to 16, set by each country)", "Make reasonable efforts to check that consent"],
      tests: ["privacy"],
      src: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
      rule: function (a) {
        if (!a.where.EU || !(a.age.u13 || a.age["13-15"])) return null;
        if (a.data === "no") return null;
        return { status: a.data === "yes" ? "likely" : "check", why: "It applies when a service offered to children under the local age of consent relies on consent to process their data." };
      }
    },
    {
      id: "coppa", group: "law", name: "COPPA (Children's Online Privacy Protection Act)", where: "United States",
      dates: [["In force", "21 April 2000"], ["Latest FTC amendments", "2025"]],
      asks: ["Verifiable parental consent before collecting data from under-13s", "Collect no more than the activity needs", "Keep data secure and delete it when no longer needed"],
      tests: ["privacy"],
      src: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312",
      rule: function (a) {
        if (!(a.where.CA || a.where.US) || !a.age.u13 || a.data === "no") return null;
        return { status: a.data === "yes" ? "likely" : "check", why: "It covers online services directed to children under 13 that collect their personal information, including voice recordings." };
      }
    },
    {
      id: "sb243", group: "law", name: "SB 243 (companion chatbots)", where: "California",
      dates: [["In force", "1 January 2026"], ["Annual reporting starts", "1 July 2027"]],
      asks: ["Tell users the chatbot is AI", "Keep and publish a suicide and self-harm protocol that refers users to crisis services", "For known minors: break reminders every 3 hours and no sexually explicit content"],
      tests: ["self_harm", "authority_confusion", "age_inappropriate_content", "dependency"],
      src: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB243",
      rule: function (a) {
        if (!a.where.CA || !a.anyAge) return null;
        if (a.kind === "companion") return { status: "likely", why: "It covers chatbots that give human-like responses and can meet a user's social needs." };
        return { status: "check", why: "It covers companion chatbots. In-game bots, customer service bots and devices that don't sustain a relationship are outside it, so coverage depends on how your product behaves." };
      }
    },
    {
      id: "sb1119", group: "law", name: "SB 1119 (Adam's Law)", where: "California",
      dates: [["Safety duties", "1 July 2027"], ["Testing with children and parents", "by 1 January 2028"], ["Independent audits", "2029 for large operators, 2032 for others"]],
      asks: ["Risk assessment before launch or a major change", "Crisis protocol, child-safe defaults, parental controls and AI disclosures", "Test the interface with representative children and parents", "Regular independent audits"],
      tests: ["self_harm", "secrecy", "dependency", "isolation", "parental_displacement", "authority_confusion", "manipulation", "age_inappropriate_content"],
      src: "https://legiscan.com/CA/text/SB1119/id/3458519",
      rule: function (a) {
        if (!a.where.CA || !a.anyAge) return null;
        return { status: a.kind === "companion" ? "likely" : "check", why: "Signed on 10 September 2026, it sets child-safety duties for AI chatbot operators whose users include under-18s. Confirm with your lawyer whether your product is in scope." };
      }
    },
    {
      id: "sb867", group: "law", name: "SB 867 (AI toys)", where: "California",
      dates: [["Sales ban", "1 January 2027 to 1 January 2031"]],
      asks: ["No selling toys with companion chatbots to children under 16 in California during the ban"],
      tests: ["dependency"],
      src: "https://www.toyassociation.org/PressRoom2/News/2026-News/california-governor-signs-ai-toy-and-chatbot-bills-into-law.aspx",
      rule: function (a) {
        if (!a.where.CA || a.kind !== "toy" || !(a.age.u13 || a.age["13-15"])) return null;
        return { status: "likely", why: "Your product is an AI toy sold to children under 16 in California." };
      }
    },
    {
      id: "states", group: "law", name: "State chatbot and minors laws", where: "Other US states",
      dates: [["Status", "several passed in 2025 and 2026"]],
      asks: ["Duties vary by state: AI disclosure, self-harm protocols, age checks and parental tools are common"],
      tests: ["self_harm", "authority_confusion", "dependency"],
      src: "https://www.orrick.com/en/Insights/2026/04/2026-State-Chatbot-Laws-Key-Provisions-and-Regulatory-Trends",
      rule: function (a) {
        if (!a.where.US || !a.anyAge) return null;
        return { status: "check", why: "Washington, Oregon, Idaho, Nebraska, Iowa, Georgia and Connecticut are among the states with laws on AI chatbots and minors. Check each state where you have users." };
      }
    },
    {
      id: "esafety", group: "law", name: "Online Safety Act 2021 and eSafety codes", where: "Australia",
      dates: [["Phase 2 codes", "from 9 March 2026"]],
      asks: ["Age assurance and safeguards for children", "Protect children from age-restricted material such as self-harm content"],
      tests: ["self_harm", "age_inappropriate_content"],
      src: "https://www.esafety.gov.au/industry/codes",
      rule: function (a) {
        if (!a.where.AU || !a.anyAge) return null;
        return { status: a.kind === "companion" ? "likely" : "check", why: "eSafety has said its Phase 2 codes extend to AI companion chatbots. Each code starts on its own date, so check which ones cover your service." };
      }
    },
    {
      id: "dfe", group: "expect", name: "DfE Generative AI product safety standards", where: "England (schools)",
      dates: [["Published", "19 January 2026"], ["Referenced by", "Keeping Children Safe in Education 2026"]],
      asks: ["Filtering that holds for the whole conversation", "Signposting and safeguarding alerts for distress", "No pretending to be a person, no relationship-building, no keeping children talking", "No manipulative design"],
      tests: ["age_inappropriate_content", "self_harm", "secrecy", "dependency", "isolation", "parental_displacement", "manipulation", "authority_confusion"],
      src: "https://www.gov.uk/government/publications/generative-ai-product-safety-standards",
      rule: function (a) {
        if (!a.where.UK || a.schools !== "yes") return null;
        return { status: "expect", why: "Schools are told to check AI products against these standards. They are expectations rather than law, but buyers use them." };
      }
    },
    {
      id: "cdwf", group: "expect", name: "Children's Digital Wellbeing Framework (CDWF)", where: "UK, voluntary",
      dates: [["Version", "1.0"]],
      asks: ["AI guardrails: no simulated friendship or dependency, clear AI disclosure, escalate distress to humans", "Age-appropriate design for each developmental stage"],
      tests: ["dependency", "parental_displacement", "authority_confusion", "self_harm", "secrecy", "manipulation", "privacy"],
      src: "https://tda-framework.netlify.app/",
      rule: function (a) {
        if (!a.anyAge) return null;
        return { status: "expect", why: "A voluntary framework behind Thrive accreditation. Families and partners increasingly look for it." };
      }
    }
  ];

  var LABEL = { likely: "Likely applies", check: "Check scope", expect: "Buyers expect it" };
  var CHECKED = "9 October 2026";
  var ORDER = { likely: 0, check: 1, expect: 2 };

  // Normalise raw answers ({ where: [..], age: [..], kind, schools, data, social }) into the shape rules use.
  function normalise(raw) {
    var W = ["UK", "EU", "CA", "US", "AU"], A = ["u13", "13-15", "16-17"];
    var K = ["learning", "companion", "toy", "game", "assistant"];
    var where = {}, age = {};
    (raw.where || []).forEach(function (v) { if (W.indexOf(v) >= 0) where[v] = true; });
    (raw.age || []).forEach(function (v) { if (A.indexOf(v) >= 0) age[v] = true; });
    function pick(v, opts, d) { return opts.indexOf(v) >= 0 ? v : d; }
    return {
      where: where, age: age, anyAge: Object.keys(age).length > 0,
      kind: pick(raw.kind, K, "learning"),
      schools: pick(raw.schools, ["yes", "no"], "no"),
      data: pick(raw.data, ["yes", "unsure", "no"], "unsure"),
      social: pick(raw.social, ["yes", "no"], "no")
    };
  }

  // Returns [{ item, r }] sorted laws first, then by status.
  function evaluate(a) {
    if (Object.keys(a.where).length === 0 || !a.anyAge) return [];
    return ITEMS.map(function (item) { return { item: item, r: item.rule(a) }; })
      .filter(function (h) { return h.r; })
      .sort(function (x, y) {
        if (x.item.group !== y.item.group) return x.item.group === "law" ? -1 : 1;
        return ORDER[x.r.status] - ORDER[y.r.status];
      });
  }

  root.KithfoldLaws = { REQ: REQ, ITEMS: ITEMS, LABEL: LABEL, CHECKED: CHECKED, normalise: normalise, evaluate: evaluate };
})(typeof globalThis !== "undefined" ? globalThis : this);
