export const WAIVER_VERSION = "MC2026-v1";

export const WAIVER_TITLE = "Melanated Campout 2026 — Homecoming";
export const WAIVER_SUBTITLE =
  "Terms, Waiver & Consent Agreement · September 25–27, 2026 · Lake Blackshear Resort · Cordele, GA · Adults 21+ Only";

export interface WaiverSection {
  heading: string;
  body?: string;
  bullets?: string[];
}

export const WAIVER_SECTIONS: WaiverSection[] = [
  {
    heading: "1. Agreement to Participate",
    body: "By purchasing a ticket and/or entering the event grounds, you agree to all terms outlined in this Agreement. This Agreement is a legally binding contract between you and Melanated Campout, LLC. This is an adults-only event (21+). A valid government-issued photo ID is required for entry.",
  },
  {
    heading: "2. Event Conditions — Rain or Shine",
    body: "Melanated Campout takes place rain or shine. Weather or unforeseen conditions may require schedule or activity changes at the sole discretion of Melanated Campout, LLC. If the event proceeds as planned, no refunds will be issued for weather or personal circumstances. If the event is canceled in full by Melanated Campout, further guidance will be provided to registered attendees.",
  },
  {
    heading: "3. Payments, Transfers & No Refund Policy",
    body: "All payments are final and non-refundable, including deposits made under a payment plan. If a payment plan balance is not completed by the due date shown at checkout, your registration may be forfeited without refund of any amount paid. Ticket transfers are permitted up to 10 days before the event through official channels:",
    bullets: [
      "Self-service via your Registrant Account: $35 transfer fee",
      "Via email or phone request: $45 transfer fee",
      "All transfers must be completed through official Melanated Campout channels. Tickets are transferable but not refundable.",
      "Optional third-party purchase protection is available at checkout and is strongly recommended. Claims are handled through purchaseprotection.com — not by Melanated Campout.",
    ],
  },
  {
    heading: "4. Health, Safety & Responsibility",
    body: "By attending, you agree to:",
    bullets: [
      "Take responsibility for your own health and wellbeing throughout the event",
      "Not attend if you are experiencing symptoms of a contagious illness",
      "Follow all safety instructions from staff and security personnel",
      "On-site support includes first aid assistance, security personnel, and emergency response coordination. In the event of a life-threatening emergency, call 911 first.",
    ],
  },
  {
    heading: "5. Assumption of Risk",
    body: "You understand and acknowledge that outdoor events carry inherent risks, including but not limited to:",
    bullets: [
      "Uneven terrain and environmental conditions",
      "Weather exposure",
      "Physical activities and recreational water use",
      "Interaction with other attendees",
      "You voluntarily assume all risks associated with your participation in this event.",
    ],
  },
  {
    heading: "6. Release of Liability",
    body: "You agree to release, waive, and hold harmless Melanated Campout, LLC, its officers, team members, partners, sponsors, and vendors from any and all claims, demands, or causes of action related to:",
    bullets: [
      "Bodily injury, illness, or death",
      "Loss, theft, or damage to personal property",
      "Incidents occurring during the event or while traveling to or from the event",
      "This release applies whether such claims arise from negligence or otherwise, to the fullest extent permitted by Georgia law. You further agree to indemnify and hold harmless Melanated Campout, LLC from any claims brought by third parties arising out of your participation or conduct at the event.",
    ],
  },
  {
    heading: "7. Community Standards & Removal Policy",
    body: "Melanated Campout is a curated, respectful, and safe space. By attending, you agree to:",
    bullets: [
      "Treat all attendees, staff, and vendors with respect",
      "Follow all directions from staff and security",
      "Honor posted community guidelines and quiet hours",
      "Quiet hours: 4:00 AM – 7:00 AM. No amplified music during this period.",
      "Melanated Campout, LLC reserves the right to remove any attendee, without refund, whose behavior disrupts the safety, peace, or experience of the community.",
    ],
  },
  {
    heading: "8. Camping, Fire & Site Guidelines",
    bullets: [
      "One tent per registration; maximum size 20 ft × 20 ft",
      "Maintain appropriate spacing between campsites (minimum 10 ft)",
      "Campfires are permitted only in designated fire pits in the premium camping section. No open fires in tailgate or dry-tent areas.",
      "Never leave a fire unattended",
      "Generators are limited to designated tailgate and dry-RV areas. Solar or battery power is strongly recommended for tent campers.",
    ],
  },
  {
    heading: "9. Parking & Vehicles",
    bullets: [
      "One vehicle per package; additional vehicles require a separate parking pass",
      "Speed limit: 5 MPH at all times on event grounds",
      "Tent campers must park in designated tent-camper lots",
      "RV pads are reserved exclusively for registered RV packages",
      "Violations may result in towing, additional fees, or removal from the event without refund.",
    ],
  },
  {
    heading: "10. Prohibited Items",
    body: "The following items are strictly prohibited on event grounds:",
    bullets: [
      "Weapons of any kind",
      "Fireworks or pyrotechnics",
      "Illegal substances",
      "Pets of any kind",
      "Any items deemed unsafe by staff at their discretion",
      "Bag checks are conducted upon entry. Security personnel are on-site 24/7.",
    ],
  },
  {
    heading: "Service Animals",
    body: "No pets are permitted on event grounds at any time. The only animals permitted are dogs individually trained to perform a specific task directly related to a handler's disability, as defined under Titles II and III of the Americans with Disabilities Act (ADA). Emotional support animals, comfort animals, therapy animals, and companion animals do not qualify as service animals under the ADA and will not be admitted. Service animals must remain on a leash or harness and under the handler's control at all times. Melanated Campout, LLC reserves the right to remove any animal that is out of control, not housebroken, poses a direct threat to the health or safety of other attendees, or does not meet the ADA definition of a service animal — regardless of claimed status — without refund.",
  },
  {
    heading: "11. Alcohol Policy",
    body: "BYOB is permitted for personal consumption. Guests are expected to drink responsibly. Disruptive behavior related to intoxication may result in removal from the event without refund. Melanated Campout, LLC does not assume liability for guest alcohol consumption.",
  },
  {
    heading: "12. Water Activities",
    body: "Swimming and water activities are available in designated areas only. No lifeguards are on duty. All water activities are undertaken at your own risk. The buddy system is strongly encouraged. Do not swim alone.",
  },
  {
    heading: "13. Personal Property",
    body: "Melanated Campout, LLC is not responsible for lost, stolen, or damaged personal items. Found items will be held for 48 hours following the conclusion of the event and then donated or discarded. Guests are encouraged to keep valuables secured at all times.",
  },
  {
    heading: "14. Media, Recording & AI Consent",
    body: "Melanated Campout may capture photos, video, and audio recordings throughout the event for promotional, educational, and archival purposes. This content may be used across digital, print, and media platforms without additional compensation or approval. Melanated Campout also uses AI tools to assist with media editing, content creation, and event communications, including our voice assistant (Zoey), automated messaging systems, and generative media software. By attending, you:",
    bullets: [
      "Consent to the recording, processing, and storage of your image, voice, and likeness by AI-enabled systems",
      "Grant Melanated Campout, LLC a perpetual, worldwide, royalty-free license to use AI-generated or AI-edited derivative works from such recordings for promotional, educational, and operational purposes of Melanated Campout",
      "Acknowledge that biometric identifiers collected through AI systems are not sold to third parties and are processed in accordance with our Privacy Policy",
      "Understand that AI-assisted communications (including Zoey) may contain errors. You are responsible for verifying time-sensitive or critical information through official channels at melanatedcampout.com",
    ],
  },
  {
    heading: "15. Privacy",
    body: "Your information is used for event-related communication, updates, and operational purposes. Contact information may be shared with aligned event partners or sponsors unless you opt out. To opt out of sponsor data sharing, email hello@melanatedcampout.com before the event. Melanated Campout does not sell personal data. All data handling is governed by our Privacy Policy available at melanatedcampout.com/privacy.",
  },
  {
    heading: "16. Environmental Responsibility",
    body: "We are guests on this land. Leave No Trace principles apply throughout the event. Dispose of all trash properly, respect shared spaces, and do not disturb the natural environment. Sites left in disarray may result in additional charges billed to the registered camper. RV gray and black water may only be disposed of at designated dump stations.",
  },
  {
    heading: "17. Vendor Disclaimer",
    body: "Melanated Campout, LLC is not responsible for transactions, services, or disputes between attendees and third-party vendors operating at the event.",
  },
  {
    heading: "18. Force Majeure",
    body: "Melanated Campout, LLC is not liable for delays, modifications, or cancellations caused by events beyond reasonable control, including severe weather, natural disasters, government restrictions, public health emergencies, or acts of God. If the event is canceled under such circumstances, no refunds will be issued unless otherwise stated in separate written communication from Melanated Campout, LLC.",
  },
  {
    heading: "19. Governing Law & Severability",
    body: "This Agreement is governed by the laws of the State of Georgia. If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
  },
];

export const WAIVER_ACKNOWLEDGEMENTS = [
  { id: "age", label: "I am 21 years of age or older." },
  {
    id: "terms",
    label:
      "I have read this Agreement in full and voluntarily agree to all terms, including assumption of risk and the release of liability.",
  },
  {
    id: "media",
    label: "I consent to the media, recording, and AI data processing terms described above.",
  },
] as const;

export const ESIGN_NOTICE =
  "Your electronic signature constitutes full agreement to these terms and carries the same legal weight as a handwritten signature under the Electronic Signatures in Global and National Commerce Act (E-SIGN).";
