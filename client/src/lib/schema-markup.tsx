import { useEffect, useRef } from "react";

interface PersonSchema {
  type: "RealEstateAgent" | "LoanOfficer";
  name: string;
  image?: string | null;
  description?: string | null;
  telephone?: string | null;
  email?: string | null;
  url?: string;
  jobTitle?: string;
  worksFor?: string | null;
  address?: {
    state?: string | null;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  sameAs?: string[];
  areaServed?: string[];
  hasCredential?: {
    credentialCategory: string;
    recognizedBy?: string;
    identifier?: string;
  };
}

interface LocalBusinessSchema {
  type: string;
  name: string;
  image?: string | null;
  description?: string | null;
  telephone?: string | null;
  email?: string | null;
  url?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  sameAs?: string[];
}

function buildPersonJsonLd(data: PersonSchema): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": data.type === "LoanOfficer" ? ["Person", "FinancialService"] : data.type,
  };

  schema.name = data.name;

  if (data.image) schema.image = data.image;
  if (data.description) schema.description = data.description;
  if (data.telephone) schema.telephone = data.telephone;
  if (data.email) schema.email = data.email;
  if (data.url) schema.url = data.url;
  if (data.jobTitle) schema.jobTitle = data.jobTitle;

  if (data.worksFor) {
    schema.worksFor = {
      "@type": "Organization",
      name: data.worksFor,
    };
  }

  if (data.address?.state) {
    schema.address = {
      "@type": "PostalAddress",
      addressRegion: data.address.state,
      addressCountry: "US",
    };
  }

  if (data.aggregateRating && data.aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: data.aggregateRating.ratingValue.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: data.aggregateRating.reviewCount,
    };
  }

  if (data.sameAs && data.sameAs.length > 0) {
    schema.sameAs = data.sameAs;
  }

  if (data.areaServed && data.areaServed.length > 0) {
    schema.areaServed = data.areaServed.map((area) => ({
      "@type": "Place",
      name: area,
    }));
  }

  if (data.hasCredential) {
    schema.hasCredential = {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: data.hasCredential.credentialCategory,
    };
    if (data.hasCredential.recognizedBy) {
      schema.hasCredential.recognizedBy = {
        "@type": "Organization",
        name: data.hasCredential.recognizedBy,
      };
    }
    if (data.hasCredential.identifier) {
      schema.hasCredential.identifier = data.hasCredential.identifier;
    }
  }

  return schema;
}

function getVendorSchemaType(category: string): string {
  const typeMap: Record<string, string> = {
    home_inspector: "ProfessionalService",
    roofer: "RoofingContractor",
    plumber: "Plumber",
    electrician: "Electrician",
    hvac: "HVACBusiness",
    painter: "HousePainter",
    landscaper: "LandscapingBusiness",
    handyman: "HomeAndConstructionBusiness",
    mover: "MovingCompany",
    cleaner: "ProfessionalService",
    pest_control: "ProfessionalService",
    title_company: "ProfessionalService",
    mortgage_lender: "FinancialService",
    appraiser: "ProfessionalService",
    photographer: "ProfessionalService",
    stager: "ProfessionalService",
    general_contractor: "HomeAndConstructionBusiness",
    locksmith: "Locksmith",
  };
  return typeMap[category] || "LocalBusiness";
}

function buildLocalBusinessJsonLd(data: LocalBusinessSchema): object {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": data.type,
  };

  schema.name = data.name;

  if (data.image) schema.image = data.image;
  if (data.description) schema.description = data.description;
  if (data.telephone) schema.telephone = data.telephone;
  if (data.email) schema.email = data.email;
  if (data.url) schema.url = data.url;

  if (data.address && (data.address.street || data.address.city || data.address.state)) {
    schema.address = {
      "@type": "PostalAddress",
    };
    if (data.address.street) schema.address.streetAddress = data.address.street;
    if (data.address.city) schema.address.addressLocality = data.address.city;
    if (data.address.state) schema.address.addressRegion = data.address.state;
    if (data.address.zip) schema.address.postalCode = data.address.zip;
    schema.address.addressCountry = "US";
  }

  if (data.aggregateRating && data.aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: data.aggregateRating.ratingValue.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: data.aggregateRating.reviewCount,
    };
  }

  if (data.sameAs && data.sameAs.length > 0) {
    schema.sameAs = data.sameAs;
  }

  return schema;
}

let schemaCounter = 0;

export function useSchemaMarkup(jsonLd: object | null) {
  const scriptIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!jsonLd) return;

    if (!scriptIdRef.current) {
      scriptIdRef.current = `schema-jsonld-${++schemaCounter}`;
    }

    const scriptId = scriptIdRef.current;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(jsonLd);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [JSON.stringify(jsonLd)]);
}

export function useAgentProfileSchema(profile: {
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  profilePhoto?: string | null;
  profilePhotoUrl?: string | null;
  profileBio?: string | null;
  profilePhone?: string | null;
  email?: string | null;
  brokerageName?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  id?: number;
} | null | undefined, reviewData?: { avgRating: number; reviewCount: number } | null, serviceAreas?: string[]) {
  const jsonLd = profile ? buildPersonJsonLd({
    type: profile.role === "lender" ? "LoanOfficer" : "RealEstateAgent",
    name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
    image: profile.profilePhotoUrl || profile.profilePhoto || undefined,
    description: profile.profileBio || undefined,
    telephone: profile.profilePhone || undefined,
    email: profile.email || undefined,
    url: profile.id ? `${window.location.origin}/profile/${profile.id}` : undefined,
    jobTitle: profile.role === "broker" ? "Real Estate Broker" : profile.role === "lender" ? "Loan Officer" : "Real Estate Agent",
    worksFor: profile.brokerageName,
    address: { state: profile.licenseState },
    aggregateRating: reviewData && reviewData.reviewCount > 0 ? {
      ratingValue: reviewData.avgRating,
      reviewCount: reviewData.reviewCount,
    } : undefined,
    sameAs: [
      profile.facebookUrl,
      profile.instagramUrl,
      profile.twitterUrl,
      profile.linkedinUrl,
    ].filter(Boolean) as string[],
    areaServed: serviceAreas,
    hasCredential: profile.licenseNumber ? {
      credentialCategory: "Real Estate License",
      recognizedBy: profile.licenseState ? `${profile.licenseState} Real Estate Commission` : undefined,
      identifier: profile.licenseNumber,
    } : undefined,
  }) : null;

  useSchemaMarkup(jsonLd);
}

export function useVendorSchema(vendor: {
  name?: string;
  category?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  averageRating?: number | null;
  agentRating?: number | null;
  reviewCount?: number | null;
  googleMapsUrl?: string | null;
  yelpUrl?: string | null;
  bbbUrl?: string | null;
} | null | undefined) {
  const jsonLd = vendor ? buildLocalBusinessJsonLd({
    type: getVendorSchemaType(vendor.category || ""),
    name: vendor.name || "",
    description: vendor.description || undefined,
    telephone: vendor.phone || undefined,
    email: vendor.email || undefined,
    url: vendor.website || undefined,
    address: {
      street: vendor.address,
      city: vendor.city,
      state: vendor.state,
      zip: vendor.zipCode,
    },
    aggregateRating: (vendor.averageRating || vendor.agentRating) && (vendor.reviewCount || 0) > 0 ? {
      ratingValue: vendor.averageRating || vendor.agentRating || 0,
      reviewCount: vendor.reviewCount || 0,
    } : undefined,
    sameAs: [
      vendor.googleMapsUrl,
      vendor.yelpUrl,
      vendor.bbbUrl,
    ].filter(Boolean) as string[],
  }) : null;

  useSchemaMarkup(jsonLd);
}
