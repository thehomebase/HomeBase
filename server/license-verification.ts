const STATE_LOOKUP_URLS: Record<string, { url: string; name: string; notes: string }> = {
  AL: { url: "https://arec.alabama.gov/arec/arec_app/LicenseSearch/LicenseSearch.aspx", name: "Alabama Real Estate Commission", notes: "Search by license number or name" },
  AK: { url: "https://www.commerce.alaska.gov/cbp/main/Search/Professional", name: "Alaska Division of Corporations", notes: "Search by license number or name" },
  AZ: { url: "https://services.azre.gov/publicdatabase/SearchLicensees.aspx", name: "Arizona Dept of Real Estate", notes: "Search by license number or name" },
  AR: { url: "https://www.arec.arkansas.gov/license-search/", name: "Arkansas Real Estate Commission", notes: "Search by name or license number" },
  CA: { url: "https://www2.dre.ca.gov/PublicASP/pplinfo.asp", name: "California Dept of Real Estate (DRE)", notes: "Enter DRE license number" },
  CO: { url: "https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx", name: "Colorado DORA", notes: "Search by license number or name" },
  CT: { url: "https://www.elicense.ct.gov/Lookup/LicenseLookup.aspx", name: "Connecticut eLicense", notes: "Search Real Estate category" },
  DE: { url: "https://delpros.delaware.gov/OH_VerifyLicense", name: "Delaware Professional Regulation", notes: "Search by license number or name" },
  FL: { url: "https://www.myfloridalicense.com/wl11.asp?mode=0&SID=&bession_id=", name: "Florida DBPR", notes: "Select Real Estate board, search by name or license" },
  GA: { url: "https://grec.state.ga.us/license-search/", name: "Georgia Real Estate Commission", notes: "Search by name or license number" },
  HI: { url: "https://pvl.ehawaii.gov/pvlsearch/", name: "Hawaii PVL", notes: "Search by license number or name" },
  ID: { url: "https://isecure.boi.idaho.gov/", name: "Idaho Real Estate Commission", notes: "Search by license number or name" },
  IL: { url: "https://online-dfpr.micropact.com/lookup/licenselookup.aspx", name: "Illinois DFPR", notes: "Select Real Estate, search by name or license" },
  IN: { url: "https://mylicense.in.gov/EVerification/Search.aspx", name: "Indiana PLA", notes: "Search by license number or name" },
  IA: { url: "https://eservices.iowa.gov/licensediniowa/", name: "Iowa Professional Licensing", notes: "Search by license type and name" },
  KS: { url: "https://www.accesskansas.org/krec/licenseSearch/", name: "Kansas Real Estate Commission", notes: "Search by name or license number" },
  KY: { url: "https://krec.ky.gov/Pages/license-search.aspx", name: "Kentucky Real Estate Commission", notes: "Search by name or license number" },
  LA: { url: "https://portal.lrec.louisiana.gov/Public/LicenseeSearch", name: "Louisiana Real Estate Commission", notes: "Search by name or license number" },
  ME: { url: "https://www.pfr.maine.gov/ALMSOnline/ALMSQuery/SearchIndividual.aspx", name: "Maine Professional Regulation", notes: "Select Real Estate, search by name" },
  MD: { url: "https://www.dllr.state.md.us/cgi-bin/ElectronicLicensing/OP_Search/OP_search.cgi?calling_app=REC::REC_display", name: "Maryland DLLR", notes: "Search by name or license number" },
  MA: { url: "https://aca-prod.accela.com/LARA/GeneralProperty/LicenseeSearch.aspx", name: "Massachusetts Board of Registration", notes: "Search by license number" },
  MI: { url: "https://aca-prod.accela.com/LARA/GeneralProperty/LicenseeSearch.aspx", name: "Michigan LARA", notes: "Search by name or license number" },
  MN: { url: "https://www.cards.commerce.state.mn.us/CARDS/security/search.do?searchType=DivisionName", name: "Minnesota Dept of Commerce", notes: "Search by name or license number" },
  MS: { url: "https://www.mrec.ms.gov/license-search/", name: "Mississippi Real Estate Commission", notes: "Search by name or license number" },
  MO: { url: "https://pr.mo.gov/licensee-search.asp", name: "Missouri Division of Professional Registration", notes: "Select Real Estate, search by name" },
  MT: { url: "https://ebiz.mt.gov/PublicPortal/#/LicenseSearch", name: "Montana Board of Realty Regulation", notes: "Search by license number or name" },
  NE: { url: "https://www.nrec.ne.gov/License-Search/", name: "Nebraska Real Estate Commission", notes: "Search by name or license number" },
  NV: { url: "https://red.nv.gov/Content/License_Search/", name: "Nevada Real Estate Division", notes: "Search by name or license number" },
  NH: { url: "https://nhrec.nh.gov/licensee-lookup/", name: "New Hampshire Real Estate Commission", notes: "Search by name or license number" },
  NJ: { url: "https://newjersey.mylicense.com/verification/Search.aspx", name: "New Jersey REC", notes: "Search by license number or name" },
  NM: { url: "https://www.rld.nm.gov/boards-and-commissions/real-estate-commission/license-verification/", name: "New Mexico RLD", notes: "Search by name or license number" },
  NY: { url: "https://appext20.dos.ny.gov/lcns_public/chk_caseno_entry", name: "New York DOS", notes: "Search by UID or name" },
  NC: { url: "https://iservices.ncrec.gov/LicenseeLookup/", name: "North Carolina REC", notes: "Search by name or license number" },
  ND: { url: "https://www.ndrealestateboard.org/licensee-search/", name: "North Dakota Real Estate Commission", notes: "Search by name or license number" },
  OH: { url: "https://elicense.ohio.gov/oh_verifylicense", name: "Ohio Division of Real Estate", notes: "Search by license number or name" },
  OK: { url: "https://www.orec.ok.gov/license-search", name: "Oklahoma REC", notes: "Search by name or license number" },
  OR: { url: "https://orea.oregon.gov/OREA/LicenseLookup/", name: "Oregon REA", notes: "Search by name or license number" },
  PA: { url: "https://www.pals.pa.gov/#/page/search", name: "Pennsylvania PALS", notes: "Search by license number or name" },
  RI: { url: "https://health.ri.gov/find/licensees/", name: "Rhode Island DBR", notes: "Search by license type and name" },
  SC: { url: "https://llr.sc.gov/cgi-bin/scllronline.exe/O30", name: "South Carolina LLR", notes: "Search by license number or name" },
  SD: { url: "https://dlr.sd.gov/bdcomm/realestate/licensee_lookup.aspx", name: "South Dakota REC", notes: "Search by name or license number" },
  TN: { url: "https://verify.tn.gov/", name: "Tennessee Commerce & Insurance", notes: "Search by name or license number" },
  TX: { url: "https://www.trec.texas.gov/apps/license-holder-search/", name: "Texas Real Estate Commission (TREC)", notes: "Search by name or license number" },
  UT: { url: "https://secure.utah.gov/llv/search/index.html", name: "Utah DOPL", notes: "Search by name or license number" },
  VT: { url: "https://sos.vermont.gov/opr/advisors/real-estate/", name: "Vermont OPR", notes: "Search by name or license number" },
  VA: { url: "https://dhp.virginiainteractive.org/Lookup/Index", name: "Virginia DPOR", notes: "Search by name or license number" },
  WA: { url: "https://secure.dol.wa.gov/ReSearch/", name: "Washington DOL", notes: "Search by name or license number" },
  WV: { url: "https://wvrec.wv.gov/Pages/license-search.aspx", name: "West Virginia REC", notes: "Search by name or license number" },
  WI: { url: "https://licensesearch.wi.gov/", name: "Wisconsin DSPS", notes: "Search by credential number or name" },
  WY: { url: "https://realestate.wyo.gov/license-lookup/", name: "Wyoming Real Estate Commission", notes: "Search by name or license number" },
  DC: { url: "https://dfrec.dc.gov/node/389572", name: "DC Real Estate Commission", notes: "Search by name or license number" },
};

const NMLS_LOOKUP_URL = "https://www.nmlsconsumeraccess.org/";

export function getStateLookupUrl(state: string): { url: string; name: string; notes: string } | null {
  return STATE_LOOKUP_URLS[state.toUpperCase()] || null;
}

export function getNmlsLookupUrl(nmlsNumber?: string): string {
  if (nmlsNumber) {
    return `https://www.nmlsconsumeraccess.org/TuringTestPage.aspx?ReturnUrl=/EntityDetails.aspx/COMPANY/${nmlsNumber}`;
  }
  return NMLS_LOOKUP_URL;
}

export function getAllStateLookups(): Record<string, { url: string; name: string; notes: string }> {
  return { ...STATE_LOOKUP_URLS };
}

export function fuzzyNameMatch(name1: string, name2: string): { score: number; matched: boolean } {
  if (!name1 || !name2) return { score: 0, matched: false };

  const normalize = (n: string) =>
    n.toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return { score: 1.0, matched: true };

  const parts1 = n1.split(" ");
  const parts2 = n2.split(" ");

  const lastName1 = parts1[parts1.length - 1];
  const lastName2 = parts2[parts2.length - 1];
  const firstName1 = parts1[0];
  const firstName2 = parts2[0];

  if (lastName1 !== lastName2) {
    const levDist = levenshtein(lastName1, lastName2);
    if (levDist > 2) return { score: 0.1, matched: false };
  }

  let score = 0;

  if (lastName1 === lastName2) score += 0.5;
  else {
    const levDist = levenshtein(lastName1, lastName2);
    score += Math.max(0, 0.5 - levDist * 0.15);
  }

  if (firstName1 === firstName2) {
    score += 0.5;
  } else if (firstName1[0] === firstName2[0]) {
    if (firstName1.length === 1 || firstName2.length === 1) {
      score += 0.35;
    } else {
      const levDist = levenshtein(firstName1, firstName2);
      score += Math.max(0.1, 0.5 - levDist * 0.1);
    }
  }

  const commonNicknames: Record<string, string[]> = {
    robert: ["bob", "rob", "bobby", "robbie"],
    william: ["bill", "will", "billy", "willy"],
    richard: ["rick", "dick", "rich"],
    james: ["jim", "jimmy", "jamie"],
    john: ["jack", "johnny", "jon"],
    michael: ["mike", "mikey"],
    david: ["dave", "davey"],
    joseph: ["joe", "joey"],
    thomas: ["tom", "tommy"],
    charles: ["charlie", "chuck"],
    daniel: ["dan", "danny"],
    matthew: ["matt"],
    christopher: ["chris"],
    jennifer: ["jen", "jenny"],
    elizabeth: ["liz", "beth", "lizzy", "eliza"],
    katherine: ["kate", "kathy", "katie", "kat"],
    margaret: ["maggie", "meg", "peggy"],
    patricia: ["pat", "patty", "trish"],
    rebecca: ["becky", "becca"],
    stephanie: ["steph"],
    alexandra: ["alex", "lexi"],
    jessica: ["jess", "jessie"],
    samantha: ["sam"],
    nicholas: ["nick"],
    anthony: ["tony"],
    benjamin: ["ben"],
    jonathan: ["jon", "jonny"],
    alexander: ["alex"],
    timothy: ["tim", "timmy"],
    stephen: ["steve"],
    edward: ["ed", "eddie", "ted"],
    andrew: ["andy", "drew"],
    joshua: ["josh"],
    kenneth: ["ken", "kenny"],
    raymond: ["ray"],
    lawrence: ["larry"],
    gerald: ["jerry"],
    douglas: ["doug"],
    catherine: ["cathy", "kate", "cat"],
    victoria: ["vicky", "tori"],
    christina: ["chris", "tina"],
    deborah: ["deb", "debbie"],
    susan: ["sue", "susie"],
    nancy: ["nan"],
    barbara: ["barb"],
    dorothy: ["dot", "dotty"],
  };

  if (firstName1 !== firstName2) {
    for (const [formal, nicks] of Object.entries(commonNicknames)) {
      const allVariants = [formal, ...nicks];
      if (allVariants.includes(firstName1) && allVariants.includes(firstName2)) {
        score = Math.max(score, 0.85);
        break;
      }
    }
  }

  const matched = score >= 0.7;
  return { score: Math.round(score * 100) / 100, matched };
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
