export type CitationFormat = "apa" | "mla" | "chicago" | "harvard" | "ieee";

export type CitationSourceType =
  | "website"
  | "book"
  | "journal"
  | "newspaper"
  | "video";

export interface CitationFields {
  authors?: string[];
  title?: string;
  year?: string;
  url?: string;
  accessedDate?: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  city?: string;
  edition?: string;
  siteName?: string;
  newspaper?: string;
  platform?: string;
  uploader?: string;
}

const FORMAT_NAMES: Record<CitationFormat, string> = {
  apa: "APA 7th",
  mla: "MLA 9th",
  chicago: "Chicago 17th",
  harvard: "Harvard",
  ieee: "IEEE",
};

export function formatLabel(f: CitationFormat): string {
  return FORMAT_NAMES[f];
}

function parseAuthor(raw: string): { last: string; first: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { last: "", first: "" };
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((s) => s.trim());
    return { last, first: first ?? "" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { last: parts[0], first: "" };
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return { last, first };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");
}

function clean(s?: string): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t || undefined;
}

function formatAccessed(date?: string, style: "long" | "short" = "long"): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  if (style === "long") {
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Author formatters ───────────────────────────────────────────────────

function formatAuthorsAPA(authors: string[]): string {
  if (!authors.length) return "";
  const formatted = authors.map((a) => {
    const { last, first } = parseAuthor(a);
    if (!last) return "";
    return first ? `${last}, ${initials(first)}` : last;
  }).filter(Boolean);
  if (formatted.length === 0) return "";
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, & ${formatted[formatted.length - 1]}`;
}

function formatAuthorsMLA(authors: string[]): string {
  if (!authors.length) return "";
  const first = parseAuthor(authors[0]);
  const firstStr = first.first
    ? `${first.last}, ${first.first}`
    : first.last;
  if (authors.length === 1) return firstStr;
  if (authors.length === 2) {
    const second = parseAuthor(authors[1]);
    const secondStr = second.first
      ? `${second.first} ${second.last}`
      : second.last;
    return `${firstStr}, and ${secondStr}`;
  }
  return `${firstStr}, et al`;
}

function formatAuthorsChicago(authors: string[]): string {
  if (!authors.length) return "";
  const first = parseAuthor(authors[0]);
  const firstStr = first.first
    ? `${first.last}, ${first.first}`
    : first.last;
  if (authors.length === 1) return firstStr;
  const rest = authors.slice(1).map((a) => {
    const p = parseAuthor(a);
    return p.first ? `${p.first} ${p.last}` : p.last;
  });
  if (rest.length === 1) return `${firstStr} and ${rest[0]}`;
  return `${firstStr}, ${rest.slice(0, -1).join(", ")}, and ${rest[rest.length - 1]}`;
}

function formatAuthorsHarvard(authors: string[]): string {
  // Harvard: similar to APA but uses "and" instead of "&"
  if (!authors.length) return "";
  const formatted = authors.map((a) => {
    const { last, first } = parseAuthor(a);
    if (!last) return "";
    return first ? `${last}, ${initials(first)}` : last;
  }).filter(Boolean);
  if (formatted.length === 0) return "";
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")} and ${formatted[formatted.length - 1]}`;
}

function formatAuthorsIEEE(authors: string[]): string {
  if (!authors.length) return "";
  const formatted = authors.map((a) => {
    const { last, first } = parseAuthor(a);
    if (!last) return "";
    return first ? `${initials(first)} ${last}` : last;
  }).filter(Boolean);
  if (formatted.length === 0) return "";
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  if (formatted.length > 6) return `${formatted[0]} et al.`;
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
}

// ─── Helpers to join with separator, dropping empties ────────────────────

function joinParts(parts: (string | undefined | null)[], sep: string): string {
  return parts.filter((p): p is string => !!p && !!p.trim()).join(sep);
}

// ─── Format builders ─────────────────────────────────────────────────────

function buildAPA(type: CitationSourceType, f: CitationFields): string {
  const authors = formatAuthorsAPA(f.authors ?? []);
  const year = clean(f.year);
  const title = clean(f.title);
  const url = clean(f.url);

  if (type === "website") {
    const site = clean(f.siteName) ?? clean(f.publisher);
    return joinParts(
      [
        authors,
        year ? `(${year}).` : undefined,
        title ? `${title}.` : undefined,
        site ? `${site}.` : undefined,
        url,
      ],
      " "
    );
  }
  if (type === "book") {
    const ed = clean(f.edition);
    const pub = clean(f.publisher);
    const city = clean(f.city);
    return joinParts(
      [
        authors,
        year ? `(${year}).` : undefined,
        title ? (ed ? `${title} (${ed} ed.).` : `${title}.`) : undefined,
        pub ? `${city ? `${city}: ` : ""}${pub}.` : undefined,
      ],
      " "
    );
  }
  if (type === "journal") {
    const journal = clean(f.journal);
    const vol = clean(f.volume);
    const issue = clean(f.issue);
    const pages = clean(f.pages);
    const doi = clean(f.doi);
    const journalBit = journal
      ? `${journal}${vol ? `, ${vol}` : ""}${issue ? `(${issue})` : ""}${pages ? `, ${pages}` : ""}.`
      : undefined;
    return joinParts(
      [
        authors,
        year ? `(${year}).` : undefined,
        title ? `${title}.` : undefined,
        journalBit,
        doi ? `https://doi.org/${doi}` : url,
      ],
      " "
    );
  }
  if (type === "newspaper") {
    const news = clean(f.newspaper);
    const pages = clean(f.pages);
    return joinParts(
      [
        authors,
        year ? `(${year}).` : undefined,
        title ? `${title}.` : undefined,
        news ? `${news}${pages ? `, ${pages}` : ""}.` : undefined,
        url,
      ],
      " "
    );
  }
  // video
  const platform = clean(f.platform);
  const uploader = clean(f.uploader);
  return joinParts(
    [
      authors || uploader,
      year ? `(${year}).` : undefined,
      title ? `${title} [Video].` : undefined,
      platform ? `${platform}.` : undefined,
      url,
    ],
    " "
  );
}

function buildMLA(type: CitationSourceType, f: CitationFields): string {
  const authors = formatAuthorsMLA(f.authors ?? []);
  const year = clean(f.year);
  const title = clean(f.title);
  const url = clean(f.url);

  if (type === "website") {
    const site = clean(f.siteName) ?? clean(f.publisher);
    const accessed = clean(f.accessedDate);
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `"${title}."` : undefined,
        site ? `${site}, ` : undefined,
        year ? `${year}, ` : undefined,
        url ? `${url}.` : undefined,
        accessed ? `Accessed ${formatAccessed(accessed)}.` : undefined,
      ],
      ""
    ).replace(/\s+/g, " ").trim();
  }
  if (type === "book") {
    const ed = clean(f.edition);
    const pub = clean(f.publisher);
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `${title}.` : undefined,
        ed ? `${ed} ed., ` : undefined,
        pub ? `${pub}, ` : undefined,
        year ? `${year}.` : undefined,
      ],
      ""
    ).replace(/\s+/g, " ").trim();
  }
  if (type === "journal") {
    const journal = clean(f.journal);
    const vol = clean(f.volume);
    const issue = clean(f.issue);
    const pages = clean(f.pages);
    const doi = clean(f.doi);
    const journalBit = journal
      ? `${journal}, ${vol ? `vol. ${vol}` : ""}${vol && issue ? ", " : ""}${issue ? `no. ${issue}` : ""}${(vol || issue) && year ? ", " : ""}${year ?? ""}${pages ? `, pp. ${pages}` : ""}.`
      : undefined;
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `"${title}."` : undefined,
        journalBit,
        doi ? `https://doi.org/${doi}.` : url ? `${url}.` : undefined,
      ],
      " "
    );
  }
  if (type === "newspaper") {
    const news = clean(f.newspaper);
    const pages = clean(f.pages);
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `"${title}."` : undefined,
        news ? `${news}, ` : undefined,
        year ? `${year}` : undefined,
        pages ? `, p. ${pages}` : undefined,
        url ? `, ${url}` : undefined,
      ],
      ""
    ).replace(/\s+/g, " ").trim() + (year || pages || url ? "." : "");
  }
  const platform = clean(f.platform);
  const uploader = clean(f.uploader);
  return joinParts(
    [
      authors || uploader ? `${authors || uploader}. ` : undefined,
      title ? `"${title}." ` : undefined,
      platform ? `${platform}, ` : undefined,
      year ? `${year}, ` : undefined,
      url ? `${url}.` : undefined,
    ],
    ""
  ).replace(/\s+/g, " ").trim();
}

function buildChicago(type: CitationSourceType, f: CitationFields): string {
  const authors = formatAuthorsChicago(f.authors ?? []);
  const year = clean(f.year);
  const title = clean(f.title);
  const url = clean(f.url);

  if (type === "website") {
    const site = clean(f.siteName) ?? clean(f.publisher);
    const accessed = clean(f.accessedDate);
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `"${title}."` : undefined,
        site ? `${site}.` : undefined,
        year ? `${year}.` : undefined,
        accessed ? `Accessed ${formatAccessed(accessed)}.` : undefined,
        url ? `${url}.` : undefined,
      ],
      " "
    );
  }
  if (type === "book") {
    const ed = clean(f.edition);
    const pub = clean(f.publisher);
    const city = clean(f.city);
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `${title}${ed ? `. ${ed} ed` : ""}.` : undefined,
        city ? `${city}: ` : undefined,
        pub ? `${pub}, ` : undefined,
        year ? `${year}.` : undefined,
      ],
      ""
    ).replace(/\s+/g, " ").trim();
  }
  if (type === "journal") {
    const journal = clean(f.journal);
    const vol = clean(f.volume);
    const issue = clean(f.issue);
    const pages = clean(f.pages);
    const doi = clean(f.doi);
    const journalBit = journal
      ? `${journal} ${vol ?? ""}${issue ? `, no. ${issue}` : ""}${year ? ` (${year})` : ""}${pages ? `: ${pages}` : ""}.`
      : undefined;
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `"${title}."` : undefined,
        journalBit,
        doi ? `https://doi.org/${doi}.` : url ? `${url}.` : undefined,
      ],
      " "
    );
  }
  if (type === "newspaper") {
    const news = clean(f.newspaper);
    return joinParts(
      [
        authors ? `${authors}.` : undefined,
        title ? `"${title}."` : undefined,
        news ? `${news},` : undefined,
        year ? `${year}.` : undefined,
        url ? `${url}.` : undefined,
      ],
      " "
    );
  }
  const platform = clean(f.platform);
  const uploader = clean(f.uploader);
  return joinParts(
    [
      authors || uploader ? `${authors || uploader}.` : undefined,
      title ? `"${title}."` : undefined,
      platform ? `${platform},` : undefined,
      year ? `${year}.` : undefined,
      url ? `${url}.` : undefined,
    ],
    " "
  );
}

function buildHarvard(type: CitationSourceType, f: CitationFields): string {
  const authors = formatAuthorsHarvard(f.authors ?? []);
  const year = clean(f.year);
  const title = clean(f.title);
  const url = clean(f.url);

  if (type === "website") {
    const site = clean(f.siteName) ?? clean(f.publisher);
    const accessed = clean(f.accessedDate);
    return joinParts(
      [
        authors ? `${authors}` : undefined,
        year ? `(${year})` : undefined,
        title ? `${title}.` : undefined,
        site ? `${site}.` : undefined,
        url ? `Available at: ${url}` : undefined,
        accessed ? `(Accessed: ${formatAccessed(accessed)}).` : undefined,
      ],
      " "
    );
  }
  if (type === "book") {
    const ed = clean(f.edition);
    const pub = clean(f.publisher);
    const city = clean(f.city);
    return joinParts(
      [
        authors ? `${authors}` : undefined,
        year ? `(${year})` : undefined,
        title ? `${title}${ed ? `. ${ed} edn` : ""}.` : undefined,
        city ? `${city}: ` : undefined,
        pub ? `${pub}.` : undefined,
      ],
      " "
    );
  }
  if (type === "journal") {
    const journal = clean(f.journal);
    const vol = clean(f.volume);
    const issue = clean(f.issue);
    const pages = clean(f.pages);
    const doi = clean(f.doi);
    const journalBit = journal
      ? `${journal}, ${vol ?? ""}${issue ? `(${issue})` : ""}${pages ? `, pp. ${pages}` : ""}.`
      : undefined;
    return joinParts(
      [
        authors ? `${authors}` : undefined,
        year ? `(${year})` : undefined,
        title ? `${title}.` : undefined,
        journalBit,
        doi ? `https://doi.org/${doi}` : url,
      ],
      " "
    );
  }
  if (type === "newspaper") {
    const news = clean(f.newspaper);
    const pages = clean(f.pages);
    return joinParts(
      [
        authors ? `${authors}` : undefined,
        year ? `(${year})` : undefined,
        title ? `${title}.` : undefined,
        news ? `${news}${pages ? `, pp. ${pages}` : ""}.` : undefined,
        url,
      ],
      " "
    );
  }
  const platform = clean(f.platform);
  const uploader = clean(f.uploader);
  return joinParts(
    [
      authors || uploader ? `${authors || uploader}` : undefined,
      year ? `(${year})` : undefined,
      title ? `${title} [Video].` : undefined,
      platform ? `${platform}.` : undefined,
      url ? `Available at: ${url}.` : undefined,
    ],
    " "
  );
}

function buildIEEE(type: CitationSourceType, f: CitationFields): string {
  const authors = formatAuthorsIEEE(f.authors ?? []);
  const year = clean(f.year);
  const title = clean(f.title);
  const url = clean(f.url);

  if (type === "website") {
    const site = clean(f.siteName) ?? clean(f.publisher);
    const accessed = clean(f.accessedDate);
    return joinParts(
      [
        authors ? `${authors},` : undefined,
        title ? `"${title},"` : undefined,
        site ? `${site},` : undefined,
        year ? `${year}.` : undefined,
        accessed ? `[Accessed: ${formatAccessed(accessed, "short")}].` : undefined,
        url ? `[Online]. Available: ${url}` : undefined,
      ],
      " "
    );
  }
  if (type === "book") {
    const ed = clean(f.edition);
    const pub = clean(f.publisher);
    const city = clean(f.city);
    return joinParts(
      [
        authors ? `${authors},` : undefined,
        title ? `${title}${ed ? `, ${ed} ed.` : ""}.` : undefined,
        city ? `${city}: ` : undefined,
        pub ? `${pub}, ` : undefined,
        year ? `${year}.` : undefined,
      ],
      ""
    ).replace(/\s+/g, " ").trim();
  }
  if (type === "journal") {
    const journal = clean(f.journal);
    const vol = clean(f.volume);
    const issue = clean(f.issue);
    const pages = clean(f.pages);
    const doi = clean(f.doi);
    const journalBit = journal
      ? `${journal}${vol ? `, vol. ${vol}` : ""}${issue ? `, no. ${issue}` : ""}${pages ? `, pp. ${pages}` : ""}${year ? `, ${year}` : ""}.`
      : undefined;
    return joinParts(
      [
        authors ? `${authors},` : undefined,
        title ? `"${title},"` : undefined,
        journalBit,
        doi ? `doi: ${doi}.` : url,
      ],
      " "
    );
  }
  if (type === "newspaper") {
    const news = clean(f.newspaper);
    return joinParts(
      [
        authors ? `${authors},` : undefined,
        title ? `"${title},"` : undefined,
        news ? `${news},` : undefined,
        year ? `${year}.` : undefined,
        url,
      ],
      " "
    );
  }
  const platform = clean(f.platform);
  const uploader = clean(f.uploader);
  return joinParts(
    [
      authors || uploader ? `${authors || uploader},` : undefined,
      title ? `"${title},"` : undefined,
      platform ? `${platform},` : undefined,
      year ? `${year}.` : undefined,
      url ? `[Online]. Available: ${url}` : undefined,
    ],
    " "
  );
}

export function formatCitation(
  format: CitationFormat,
  type: CitationSourceType,
  fields: CitationFields
): string {
  let result = "";
  switch (format) {
    case "apa":
      result = buildAPA(type, fields);
      break;
    case "mla":
      result = buildMLA(type, fields);
      break;
    case "chicago":
      result = buildChicago(type, fields);
      break;
    case "harvard":
      result = buildHarvard(type, fields);
      break;
    case "ieee":
      result = buildIEEE(type, fields);
      break;
  }
  return result.replace(/\s+\./g, ".").replace(/\.\.+/g, ".").replace(/\s+/g, " ").trim();
}
