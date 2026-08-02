export const CONTENT_TYPES = {
  legal_tip:         { label: "Legal Tip",         color: "#4EC9E8" },
  faq:               { label: "FAQ",               color: "#8FD94A" },
  myth_vs_fact:      { label: "Myth vs. Fact",     color: "#F5D024" },
  community:         { label: "Community",         color: "#F5901E" },
  client_review:     { label: "Client Review",     color: "#E8412E" },
  service_spotlight: { label: "Service Spotlight", color: "#EC3B8C" },
  firm_news:         { label: "Firm News",         color: "#5B6BE8" },
  motivational:      { label: "Motivational",      color: "#A56BE8" },
};

// A post is a still/carousel; a reel is short vertical video.
export const FORMATS = {
  post: { label: "Post", short: "Post" },
  reel: { label: "Reel", short: "Reel" },
};

export const PLATFORMS = {
  instagram: { label: "Instagram", short: "IG" },
  facebook:  { label: "Facebook",  short: "FB" },
  linkedin:  { label: "LinkedIn",  short: "LI" },
  tiktok:    { label: "TikTok",    short: "TT" },
};

// Post lifecycle. Only these five values are ever written to `status`.
export const STATUS = {
  draft:            "draft",             // Sierra is still working. Client can't see it.
  pending_approval: "pending_approval",  // Sent. Waiting on the client.
  approved:         "approved",          // Client said yes. Locked.
  changes_requested:"changes_requested", // Client left a note. Back to Sierra.
  published:        "published",         // It's live.
};

export const STATUS_LABEL = {
  draft:             "Draft",
  pending_approval:  "Waiting on you",
  approved:          "Approved",
  changes_requested: "Changes requested",
  published:         "Published",
};

// What the client is allowed to see on their calendar.
export const CLIENT_VISIBLE = [
  STATUS.pending_approval,
  STATUS.approved,
  STATUS.changes_requested,
  STATUS.published,
];

export const SUBSCRIPTION_TIERS = {
  basic: {
    label: "Basic",
    price: 500,
    postsPerMonth: 12,
    popular: false,
    features: [
      "12 Custom Branded Posts",
      "Professional Captioning",
      "Scheduled Posting",
    ],
  },
  standard: {
    label: "Standard",
    price: 750,
    postsPerMonth: 12,
    popular: true,
    features: [
      "12 Custom Branded Posts",
      "Professional Captioning",
      "Active Community Engagement",
      "DM/Comment Monitoring",
    ],
  },
  premium: {
    label: "Premium",
    price: 1100,
    postsPerMonth: 16,
    popular: false,
    features: [
      "16 Custom Branded Posts",
      "Professional Captioning",
      "Active Community Engagement",
      "DM/Comment Monitoring",
      "15 Hrs Practice Support",
    ],
  },
};

// New client accounts start on this plan until Sierra sets one.
export const DEFAULT_TIER = "basic";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
