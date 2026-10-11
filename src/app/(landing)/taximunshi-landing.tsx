"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { plusJakarta, caveat, notoDevanagari } from "./fonts";
import { submitWaitlistLeadAction } from "./waitlist-actions";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#share", label: "Share & export" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const TICKER_TERMS = [
  "80kms/8hrs package",
  "Additional kms",
  "Additional hrs",
  "Toll, tax & parking",
  "CGST + SGST under RCM",
  "HSN 996601",
  "Client-wise rate cards",
  "Vehicle no. & type",
  "Booked by",
  "Billing period",
  "Amount in words",
  "Duty slips",
];

const COMPARISON_ROWS = [
  {
    before: "A separate Excel sheet for every client",
    afterTitle: "Every client in",
    afterHighlight: "one place",
    afterBody: "Duties, rate cards and invoices for all your clients, in one app.",
  },
  {
    before: "Extra km & hours on a calculator",
    afterTitle: "Extras",
    afterHighlight: "calculated on every duty",
    afterBody: "Enter total kms and times. Extra kilometres and hours are worked out for you.",
  },
  {
    before: "₹18 pasted where it should be ₹15",
    afterTitle: "The",
    afterHighlight: "right rate card",
    afterAfter: ", every time",
    afterBody: "Each client's package and extra rates applied automatically, per vehicle type.",
  },
  {
    before: "Invoice sent a week late",
    afterTitle: "Ready and",
    afterHighlight: "shared in one tap",
    afterBody: "Generate the month's invoice and send it on WhatsApp or email.",
  },
];

const FEATURE_CARDS = [
  {
    n: "01",
    title: "Duty management",
    body: "Trips with kilometres, times, toll and parking. Bulk import what you already have.",
    icon: (
      <>
        <rect width="8" height="4" x="8" y="2" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M12 11h4" />
        <path d="M12 16h4" />
        <path d="M8 11h.01" />
        <path d="M8 16h.01" />
      </>
    ),
  },
  {
    n: "02",
    title: "Client-wise rate cards",
    body: "A package and extra rates for every client and vehicle type.",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    n: "03",
    title: "Automatic calculations",
    body: "Extra kilometres and hours worked out against the package on every duty.",
    icon: (
      <>
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M8 6h8" />
        <path d="M16 14v4" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
      </>
    ),
  },
  {
    n: "04",
    title: "GST and RCM settings",
    body: "CGST and SGST on the invoice, including reverse charge where it applies.",
    icon: (
      <>
        <path d="M19 5 5 19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </>
    ),
  },
  {
    n: "05",
    title: "Quotations",
    body: "Quote new clients on the same rates you will bill them.",
    icon: (
      <>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </>
    ),
  },
  {
    n: "06",
    title: "Works anywhere",
    body: "Laptop in the office, phone on the road. Same data on both.",
    icon: (
      <>
        <rect width="14" height="20" x="5" y="2" rx="2" />
        <path d="M12 18h.01" />
      </>
    ),
  },
];

const FAQS = [
  {
    q: "Is TaxiMunshi designed specifically for cab operators?",
    a: "Yes. It is built around trips, vehicles, packages and extra kilometres and hours, not generic line items.",
  },
  {
    q: "Can I maintain different rates for different corporate clients?",
    a: "Yes. Each client gets its own rate card, with a package, additional km rate and additional hour rate for each vehicle type. Set it once and reuse it every month.",
  },
  {
    q: "Can it calculate additional kilometres and hours?",
    a: "Yes. Enter the trip's kilometres and times, and TaxiMunshi works out the extra kilometres and hours against the client's package.",
  },
  {
    q: "Can I create quotations?",
    a: "Yes. You can create quotations for new or existing clients and share them as professional documents.",
  },
  {
    q: "Can I send invoices on WhatsApp or email?",
    a: "Yes. Download any invoice as a PDF in one click, or share it directly on WhatsApp or email from TaxiMunshi.",
  },
  {
    q: "Can I share the month's invoices with my CA?",
    a: "Yes. Export a month's billing as an Excel file formatted for GST filing and send it to your CA in one click.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. TaxiMunshi runs in the browser and works on laptop and mobile.",
  },
  {
    q: "How does the waitlist and free offer work?",
    a: "Join the waitlist with your company name, email and phone. Our team will reach out to set you up, and your first three months are free, with no credit card required.",
  },
];

function Ticker() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const el = trackRef.current;
      if (el) {
        const half = el.scrollWidth / 2;
        const x = ((now - start) * 0.045) % half;
        el.style.transform = `translateX(${(-x).toFixed(1)}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const list = [...TICKER_TERMS, ...TICKER_TERMS];
  return (
    <div
      aria-label={"Taxi billing details TaxiMunshi handles: " + TICKER_TERMS.join(", ")}
      role="img"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: 16,
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div ref={trackRef} style={{ display: "inline-flex", willChange: "transform" }}>
        {list.map((t, k) => (
          <span
            key={k}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              height: 34,
              padding: "0 14px",
              marginRight: 10,
              borderRadius: 8,
              border: "1px solid #3A352D",
              background: "#24211C",
              color: "#F3EEE3",
              fontSize: 13.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 2, background: "#FFC21A", flexShrink: 0 }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function WaitlistForm({
  sending,
  error,
  onSubmit,
}: {
  sending: boolean;
  error: boolean;
  onSubmit: (data: { company: string; email: string; phone: string }) => void;
}) {
  return (
    <form
      aria-label="Join the waitlist"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          company: String(fd.get("company") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
        });
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#3F3B35" }}>
        Company name
        <input
          name="company"
          type="text"
          autoComplete="organization"
          required
          style={inputStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#3F3B35" }}>
        Email
        <input name="email" type="email" autoComplete="email" required style={inputStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#3F3B35" }}>
        Phone number
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          inputMode="tel"
          pattern="[0-9+ ()-]{10,16}"
          style={inputStyle}
        />
      </label>
      {error && (
        <span role="alert" style={{ fontSize: 13, color: "#B42318" }}>
          Couldn&apos;t submit just now. Please try again.
        </span>
      )}
      <button type="submit" disabled={sending} style={darkButtonStyle}>
        {sending ? "Sending…" : "Join the waitlist"}
      </button>
      <span style={{ fontSize: 12, lineHeight: 1.5, color: "#8A847A" }}>
        Our team will reach out to set you up.
      </span>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  height: 46,
  border: "1px solid #DED8CB",
  borderRadius: 10,
  padding: "0 12px",
  font: "inherit",
  fontSize: 15,
  color: "#1C1A17",
  background: "#FFFFFF",
};

const darkButtonStyle: React.CSSProperties = {
  height: 48,
  border: 0,
  borderRadius: 10,
  background: "#1C1A17",
  color: "#FFFFFF",
  font: "inherit",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

function WaitlistDone() {
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0 4px" }}>
      <strong style={{ fontSize: 18 }}>Shukriya! You&apos;re on the list.</strong>
      <span style={{ fontSize: 14, lineHeight: 1.6, color: "#5E5A52" }}>
        Our team will reach out on your email or phone soon. Your first 3 months will be free.
      </span>
    </div>
  );
}

function Logo({ size = "header" }: { size?: "header" | "footer" }) {
  const box = size === "header" ? 38 : 34;
  const stripeH = size === "header" ? 5 : 4;
  const glyphSize = size === "header" ? 21 : 19;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: box,
        height: box,
        borderRadius: 10,
        background: "#FFC21A",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        boxShadow: size === "header" ? "inset 0 -3px 0 rgba(28,26,23,0.12)" : undefined,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: stripeH,
          background: `repeating-linear-gradient(90deg,#1C1A17 0 ${stripeH}px,#FFC21A ${stripeH}px ${stripeH * 2}px)`,
        }}
      />
      <span
        className={notoDevanagari.className}
        style={{ fontWeight: 800, fontSize: glyphSize, lineHeight: 1, marginTop: stripeH, color: "#1C1A17" }}
      >
        मु
      </span>
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function TaxiMunshiLanding() {
  const bandRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<"dash" | "inv">("dash");
  const [dims, setDims] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [phase, setPhase] = useState<"hidden" | "in" | "done">("hidden");
  const [tilt, setTilt] = useState(0);
  const [floatMounted, setFloatMounted] = useState(false);
  const [floatIn, setFloatIn] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [bubble, setBubble] = useState(true);
  const [bandSeen, setBandSeen] = useState(false);
  const [bandVisible, setBandVisible] = useState(false);
  const [sending, startSending] = useTransition();
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  function later(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function finishIntro() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    try {
      sessionStorage.setItem("tm-intro", "1");
    } catch {
      // ignore
    }
    setPhase("done");
    setTilt(0);
  }

  function openLead() {
    setLeadOpen(true);
    setFloatMounted(true);
    setFloatIn(true);
  }
  function closeLead() {
    setLeadOpen(false);
  }
  function hideBubble() {
    try {
      localStorage.setItem("tm-bubble-off", "1");
    } catch {
      // ignore
    }
    setBubble(false);
  }

  function submitLead(data: { company: string; email: string; phone: string }) {
    setError(false);
    startSending(async () => {
      const result = await submitWaitlistLeadAction(data);
      if (result.ok) {
        try {
          localStorage.setItem("tm-waitlist-done", "1");
        } catch {
          // ignore
        }
        setDone(true);
        setError(false);
      } else {
        setError(true);
      }
    });
  }

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let seen = false;
    let bubbleOff = false;
    let doneBefore = false;
    try {
      seen = sessionStorage.getItem("tm-intro") === "1";
      bubbleOff = localStorage.getItem("tm-bubble-off") === "1";
      doneBefore = localStorage.getItem("tm-waitlist-done") === "1";
    } catch {
      // ignore
    }
    setBubble(!bubbleOff);
    setDone(doneBefore);

    if (reduce || seen) {
      setPhase("done");
    } else {
      later(() => setPhase("in"), 600);
      [-4, 3, -4, 0].forEach((r, k) => later(() => setTilt(r), 1600 + k * 220));
      later(() => finishIntro(), 2700);
    }

    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);

    let io: IntersectionObserver | undefined;
    if (bandRef.current && window.IntersectionObserver) {
      io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            setBandVisible(true);
            setLeadOpen(false);
          } else {
            setBandVisible(false);
          }
          if (e.isIntersecting) {
            later(() => setBandSeen(true), 250);
          }
        },
        { threshold: 0.35 },
      );
      io.observe(bandRef.current);
    } else {
      setBandSeen(true);
    }

    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const past = y > vh * 0.7;
      setFloatMounted((prevMounted) => {
        if (past && !prevMounted) {
          later(() => setFloatIn(true), 30);
          return true;
        }
        return prevMounted;
      });
      setFloatIn((prevIn) => (past !== prevIn ? past : prevIn));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeadOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      io?.disconnect();
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Auto-open the waitlist form once per session after scrolling well
  // past the fold, unless it's already been submitted or is open.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (y > vh * 1.2 && !done && !leadOpen && !bandVisible) {
        let autoFired = false;
        try {
          autoFired = sessionStorage.getItem("tm-auto-form") === "1";
        } catch {
          // ignore
        }
        if (!autoFired) {
          try {
            sessionStorage.setItem("tm-auto-form", "1");
          } catch {
            // ignore
          }
          openLead();
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [done, leadOpen, bandVisible]);

  const narrow = dims.w < 1080;
  const small = dims.w < 600;
  const shortVp = dims.h < 640;
  const standing = dims.w >= 1240;
  const compactHero = !standing;
  const heroIn = phase !== "hidden";
  const heroAnimating = standing && phase !== "done";

  const heroMascotT = heroIn ? "translate(0,0)" : "translate(-30%,18%)";
  const heroMascotO = heroIn ? 1 : 0;
  const heroWave = `rotate(${tilt}deg)`;
  const invoiceMax = standing ? "450px" : "480px";
  const heroJustify = standing ? "flex-start" : "center";
  const heroPad = standing ? "40px 0 clamp(56px,6vw,80px) 200px" : "96px 0 clamp(48px,6vw,72px)";

  const bandMinH = narrow ? "auto" : "460px";
  const bandPadRight = narrow ? "clamp(24px,5vw,64px)" : "560px";
  const cardT = bandSeen ? "translateY(0)" : "translateY(110%)";

  const floatT = floatIn && !(bandVisible && !leadOpen) ? "translateX(0)" : "translateX(120%)";
  const peekW = small ? "70px" : "100px";
  const peekH = small ? "119px" : "170px";
  const peekRight = small ? "-10px" : "-14px";
  const bubbleLift = small ? "70px" : "104px";
  const panelRight = small ? "12px" : "24px";
  const panelBottom = shortVp ? "12px" : small ? "128px" : "182px";
  const panelMaxH = shortVp ? "calc(100vh - 24px)" : small ? "calc(100vh - 140px)" : "calc(100vh - 194px)";
  const formW = small ? "calc(100vw - 24px)" : "340px";
  const showBubble = bubble && !leadOpen && !small && !done;
  const showForm = !done;

  return (
    <div className={plusJakarta.variable + " " + caveat.variable} style={{ fontFamily: "var(--font-landing-sans), system-ui, sans-serif" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        .tm-root a { color: #7A4E00; text-decoration: none; }
        .tm-root a:hover { color: #1C1A17; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>
      <div className="tm-root" style={{ background: "#FFFFFF", color: "#1C1A17", WebkitFontSmoothing: "antialiased", overflowX: "hidden" }}>
        {/* HEADER */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid #ECE7DC",
          }}
        >
          <nav
            aria-label="Main"
            style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px", height: 70, display: "flex", alignItems: "center", gap: 32 }}
          >
            <a href="#top" aria-label="TaxiMunshi home" style={{ display: "flex", alignItems: "center", gap: 11, color: "#1C1A17", flexShrink: 0 }}>
              <Logo size="header" />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
                <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.025em" }}>
                  Taxi
                  <span style={{ background: "linear-gradient(transparent 62%,#FFD65C 62%)", padding: "0 1px" }}>Munshi</span>
                </span>
                <span style={{ fontSize: 11, color: "#8A847A", fontWeight: 500, letterSpacing: "0.01em" }}>Aapka digital munshi</span>
              </span>
            </a>
            {!narrow && (
              <div style={{ display: "flex", gap: 28, fontSize: 15, fontWeight: 500, marginLeft: 16, whiteSpace: "nowrap" }}>
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} style={{ color: "#3F3B35" }}>
                    {l.label}
                  </a>
                ))}
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              {!narrow && (
                <a
                  href="/sign-in"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 42,
                    padding: "0 16px",
                    borderRadius: 10,
                    border: "1px solid #DED8CB",
                    color: "#1C1A17",
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Sign in
                </a>
              )}
              <button
                type="button"
                onClick={openLead}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 42,
                  padding: "0 18px",
                  borderRadius: 10,
                  border: 0,
                  background: "#1C1A17",
                  color: "#FFFFFF",
                  font: "inherit",
                  fontWeight: 700,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                Join the waitlist
              </button>
              {narrow && (
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-label="Menu"
                  style={{
                    width: 42,
                    height: 42,
                    border: "1px solid #DED8CB",
                    borderRadius: 10,
                    background: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    color: "#1C1A17",
                  }}
                >
                  <ChevronIcon />
                </button>
              )}
            </div>
          </nav>
          {narrow && menuOpen && (
            <div style={{ borderTop: "1px solid #ECE7DC", padding: "8px 24px 20px", display: "flex", flexDirection: "column", fontSize: 16, fontWeight: 500 }}>
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ color: "#1C1A17", padding: "12px 0" }}>
                  {l.label}
                </a>
              ))}
              <a href="/sign-in" style={{ padding: "12px 0", fontWeight: 700, color: "#1C1A17" }}>
                Sign in
              </a>
            </div>
          )}
        </header>

        <main id="top">
          {/* HERO */}
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(50% 70% at 78% 40%, #FFE29A 0%, rgba(255,226,154,0) 70%), radial-gradient(40% 50% at 50% 105%, #FFE0CC 0%, rgba(255,224,204,0) 70%), linear-gradient(180deg,#FFFDF7 0%,#FFFFFF 100%)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(#E9DFC6 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                WebkitMaskImage: "radial-gradient(60% 70% at 75% 45%, #000 0%, transparent 75%)",
                maskImage: "radial-gradient(60% 70% at 75% 45%, #000 0%, transparent 75%)",
                opacity: 0.7,
              }}
            />
            <div
              style={{
                position: "relative",
                maxWidth: 1240,
                margin: "0 auto",
                padding: "clamp(40px,5vw,72px) 24px 0",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "clamp(32px,4vw,56px)",
              }}
            >
              <div style={{ flex: "1 1 440px", maxWidth: 540, display: "flex", flexDirection: "column", gap: 26, paddingBottom: "clamp(24px,4vw,72px)" }}>
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#7A4E00",
                    background: "#FFF1CC",
                    border: "1px solid #F6DFA0",
                    padding: "7px 12px",
                    borderRadius: 999,
                  }}
                >
                  BUILT FOR INDIAN CAB OPERATORS
                </span>
                <h1 style={{ margin: 0, fontSize: "clamp(40px,5.4vw,62px)", lineHeight: 1.05, letterSpacing: "-0.04em", fontWeight: 800 }}>
                  Month-end billing?
                  <br />
                  <span style={{ background: "linear-gradient(transparent 58%,#FFC21A 58%)", padding: "0 4px", margin: "0 -4px" }}>Munshi</span> sambhaal
                  lega.
                </h1>
                <p style={{ margin: 0, fontSize: "clamp(16px,1.5vw,18px)", lineHeight: 1.65, color: "#5E5A52" }}>
                  Turn duty slips, client rate cards and extra kilometre/hour charges into accurate corporate invoices. Share them on WhatsApp or email
                  in one tap. No Excel juggling. No manual calculations.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <button type="button" onClick={openLead} style={{ ...darkButtonStyle, gap: 10, height: 54, padding: "0 26px", background: "#FFC21A", color: "#1C1A17", fontWeight: 800, fontSize: 16, boxShadow: "inset 0 -3px 0 rgba(28,26,23,0.14)", display: "inline-flex", alignItems: "center", borderRadius: 12 }}>
                    Join the waitlist
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </button>
                  <a
                    href="#how"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 54,
                      padding: "0 22px",
                      borderRadius: 12,
                      border: "1px solid #DED8CB",
                      color: "#1C1A17",
                      fontWeight: 600,
                      fontSize: 16,
                      background: "rgba(255,255,255,0.8)",
                    }}
                  >
                    See how it works
                  </a>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                  {[
                    { label: "Taxi-specific calculations", icon: <><rect width={16} height={20} x={4} y={2} rx={2} /><path d="M8 6h8" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14v4" /><path d="M8 18h.01" /><path d="M12 18h.01" /></> },
                    { label: "Client-wise rate cards", icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
                    { label: "GST-ready invoices", icon: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /></> },
                  ].map((b) => (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #ECE7DC", borderRadius: 12, background: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        {b.icon}
                      </svg>
                      {b.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", fontSize: 14, color: "#5E5A52" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: "#1C1A17" }}>
                    <CheckIcon color="#1F9D55" />
                    First 3 months free for waitlist members
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5E5A52" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect width={18} height={12} x={3} y={4} rx={2} />
                      <path d="M2 20h20" />
                    </svg>
                    Works on laptop and mobile
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <CheckIcon color="#1F9D55" />
                    No credit card required
                  </span>
                </div>
              </div>

              <div style={{ position: "relative", flex: "1.25 1 520px", minWidth: 0, display: "flex", justifyContent: heroJustify, padding: heroPad }}>
                {compactHero && (
                  <img src="/taximunshi/mascot-sitting.png" alt="" width={160} height={141} style={{ position: "absolute", right: 8, top: 0, width: 160, height: "auto", zIndex: 0 }} />
                )}
                <div style={{ position: "relative", width: "100%", maxWidth: invoiceMax }}>
                  <div aria-hidden="true" style={{ position: "absolute", inset: "18px -14px -14px 18px", background: "#FFFFFF", border: "1px solid #E6E0D3", borderRadius: 10, transform: "rotate(3.5deg)", boxShadow: "0 20px 40px -30px rgba(80,55,10,0.4)" }} />
                  <div aria-hidden="true" style={{ position: "absolute", inset: "10px -6px -8px 10px", background: "#FFFFFF", border: "1px solid #E6E0D3", borderRadius: 10, transform: "rotate(1.6deg)" }} />
                  <SampleInvoiceCard invoiceMax={invoiceMax} />
                  {standing && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: -34,
                        top: -30,
                        zIndex: 3,
                        transform: "rotate(5deg)",
                        background: "#FFE58A",
                        borderRadius: 3,
                        padding: "12px 16px 14px",
                        boxShadow: "0 14px 28px -14px rgba(92,59,0,0.5)",
                        fontFamily: "var(--font-landing-script), cursive",
                        fontWeight: 700,
                        fontSize: 22,
                        lineHeight: 1.1,
                        color: "#3F2A00",
                        maxWidth: 190,
                      }}
                    >
                      Same data. Auto calculations. Bas ek click!
                    </div>
                  )}
                </div>
                {standing && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: -22,
                      bottom: 0,
                      width: 258,
                      height: 437,
                      zIndex: 4,
                      pointerEvents: "none",
                      transform: heroMascotT,
                      opacity: heroMascotO,
                      transition: "transform 900ms cubic-bezier(.2,.8,.2,1), opacity 500ms ease",
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", transformOrigin: "85% 60%", transform: heroWave, transition: "transform 260ms ease-in-out" }}>
                      <img src="/taximunshi/mascot-waving.png" alt="" width={258} height={437} style={{ display: "block", width: "100%", height: "100%" }} />
                    </div>
                  </div>
                )}
                {heroAnimating && (
                  <button
                    type="button"
                    onClick={finishIntro}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      zIndex: 6,
                      border: "1px solid #E6E0D3",
                      background: "rgba(255,255,255,0.9)",
                      borderRadius: 999,
                      padding: "6px 12px",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#5E5A52",
                      cursor: "pointer",
                    }}
                  >
                    Skip intro
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* TRUST STRIP */}
          <div style={{ position: "relative", overflow: "hidden", background: "#1C1A17", color: "#FFFFFF", borderTop: "1px solid #2E2A24" }}>
            <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: "12px 32px", flexWrap: "wrap", minHeight: 76 }}>
              <p style={{ margin: 0, flex: "0 1 auto", padding: "16px 0", fontSize: "clamp(15px,1.5vw,17px)", fontWeight: 600, letterSpacing: "-0.01em", color: "#F3EEE3" }}>
                Designed around the way Indian cab operators <span style={{ color: "#FFC21A" }}>actually</span> bill.
              </p>
              <div style={{ flex: "1 1 360px", minWidth: 0, padding: "0 0 16px", alignSelf: "center" }}>
                <Ticker />
              </div>
            </div>
          </div>

          {/* PROBLEM */}
          <ProblemSection />

          {/* HOW IT WORKS */}
          <HowItWorksSection />

          {/* SHARE & EXPORT */}
          <ShareExportSection />

          {/* FEATURES */}
          <FeaturesSection tab={tab} setTab={setTab} />

          {/* PRICING + FAQ */}
          <section id="pricing" style={{ scrollMarginTop: 70 }}>
            <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(72px,9vw,112px) 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,400px),1fr))", gap: "48px clamp(40px,5vw,72px)", alignItems: "start" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 24,
                  background: "radial-gradient(70% 60% at 80% 20%, #FFE39A 0%, rgba(255,227,154,0) 70%), #FFF4D6",
                  border: "1px solid #F3E2B5",
                  padding: "clamp(28px,4vw,44px) clamp(28px,4vw,44px) 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  minHeight: 520,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: "#7A4E00" }}>PRICING</span>
                <h2 style={{ margin: 0, fontSize: "clamp(28px,3.2vw,38px)", lineHeight: 1.12, letterSpacing: "-0.03em", fontWeight: 800, maxWidth: 380 }}>
                  Join the waitlist. Your first 3 months are free.
                </h2>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#5E5A52", maxWidth: 400 }}>
                  Leave your company name, email and phone. Our team will reach out to set you up. No credit card required.
                </p>
                <button type="button" onClick={openLead} style={{ ...darkButtonStyle, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 10, height: 52, padding: "0 24px", borderRadius: 12, fontSize: 15 }}>
                  Join the waitlist
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
                <img src="/taximunshi/mascot-sitting.png" alt="" width={280} height={246} loading="lazy" style={{ display: "block", width: "min(280px,70%)", height: "auto", marginTop: "auto", alignSelf: "flex-end" }} />
              </div>
              <div id="faq" style={{ display: "flex", flexDirection: "column", gap: 20, scrollMarginTop: 90 }}>
                <h2 style={{ margin: 0, fontSize: "clamp(26px,3vw,34px)", lineHeight: 1.15, letterSpacing: "-0.03em", fontWeight: 800 }}>Frequently asked questions</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {FAQS.map((f, i) => (
                    <div key={f.q} style={{ border: "1px solid #ECE7DC", borderRadius: 12, background: "#FFFFFF" }}>
                      <h3 style={{ margin: 0 }}>
                        <button
                          type="button"
                          onClick={() => setFaqOpen((cur) => (cur === i ? -1 : i))}
                          aria-expanded={faqOpen === i}
                          style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px 18px",
                            background: "none",
                            border: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            font: "inherit",
                            fontSize: 15,
                            fontWeight: 600,
                            color: "#1C1A17",
                            borderRadius: 12,
                          }}
                        >
                          <span>{f.q}</span>
                          <svg
                            width={18}
                            height={18}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#8A847A"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0, transition: "transform 200ms ease", transform: faqOpen === i ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </h3>
                      {faqOpen === i && <p style={{ margin: 0, padding: "0 46px 18px 18px", fontSize: 15, lineHeight: 1.65, color: "#5E5A52" }}>{f.a}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA / WAITLIST */}
          <section
            id="waitlist"
            ref={bandRef}
            style={{ padding: "clamp(48px,7vw,96px) 24px clamp(56px,7vw,88px)", scrollMarginTop: 70 }}
          >
            <div
              style={{
                position: "relative",
                maxWidth: 1192,
                margin: "0 auto",
                borderRadius: 24,
                background: "radial-gradient(55% 120% at 25% 0%, #FFE07A 0%, rgba(255,224,122,0) 70%), #FFC21A",
                color: "#1C1A17",
                minHeight: bandMinH,
                padding: `clamp(40px,5vw,64px) ${bandPadRight} clamp(40px,5vw,64px) clamp(24px,5vw,64px)`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 14,
                boxShadow: "inset 0 -4px 0 rgba(28,26,23,0.08)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: "#5C3B00" }}>EARLY ACCESS</span>
              <h2 style={{ margin: 0, fontSize: "clamp(30px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.035em", fontWeight: 800, maxWidth: 560 }}>
                Spend less time billing. More time running your fleet.
              </h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#3F3B35", maxWidth: 480 }}>
                Join the waitlist and our team will reach out to set you up. Your first 3 months are free.
              </p>
              {!narrow && (
                <div style={{ position: "absolute", right: 40, top: 0, bottom: 0, width: 500 }}>
                  <div style={{ position: "absolute", left: 198, right: 0, top: -40, bottom: 0, overflow: "hidden" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "#FFFFFF",
                        borderRadius: "18px 18px 0 0",
                        boxShadow: "0 -10px 40px -12px rgba(92,59,0,0.35)",
                        padding: "22px 22px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        transform: cardT,
                        transition: "transform 700ms cubic-bezier(.2,.8,.2,1)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <strong style={{ fontSize: 19, letterSpacing: "-0.01em" }}>Join the waitlist</strong>
                        <span style={{ fontSize: 13, color: "#5E5A52" }}>3 quick details · first 3 months free</span>
                      </div>
                      {showForm ? <WaitlistForm sending={sending} error={error} onSubmit={submitLead} /> : <WaitlistDone />}
                    </div>
                  </div>
                  <img src="/taximunshi/mascot-waving.png" alt="" width={230} height={393} loading="lazy" style={{ position: "absolute", left: 0, bottom: 0, width: 230, height: 393, pointerEvents: "none" }} />
                </div>
              )}
              {narrow && (
                <div style={{ marginTop: 12, background: "#FFFFFF", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 460 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <strong style={{ fontSize: 19 }}>Join the waitlist</strong>
                    <span style={{ fontSize: 13, color: "#5E5A52" }}>3 quick details · first 3 months free</span>
                  </div>
                  {showForm ? <WaitlistForm sending={sending} error={error} onSubmit={submitLead} /> : <WaitlistDone />}
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />

        {/* Floating Munshi */}
        {floatMounted && (
          <aside aria-label="TaxiMunshi waitlist" style={{ position: "fixed", right: 0, bottom: 0, zIndex: 30, pointerEvents: "none" }}>
            {leadOpen && (
              <div
                role="dialog"
                aria-modal="false"
                aria-label="Join the waitlist"
                style={{
                  position: "fixed",
                  right: panelRight,
                  bottom: panelBottom,
                  width: formW,
                  maxHeight: panelMaxH,
                  overflowY: "auto",
                  pointerEvents: "auto",
                  background: "#FFFFFF",
                  border: "1px solid #E6E0D3",
                  borderRadius: 18,
                  boxShadow: "0 24px 48px -16px rgba(28,26,23,0.35)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <button
                  type="button"
                  onClick={closeLead}
                  aria-label="Close"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 34,
                    height: 34,
                    border: 0,
                    background: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "#8A847A",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingRight: 32 }}>
                  <strong style={{ fontSize: 19, letterSpacing: "-0.01em" }}>Join the waitlist</strong>
                  <span style={{ fontSize: 13, color: "#5E5A52" }}>3 quick details · first 3 months free</span>
                </div>
                {showForm ? <WaitlistForm sending={sending} error={error} onSubmit={submitLead} /> : <WaitlistDone />}
              </div>
            )}
            <div style={{ position: "fixed", right: 0, bottom: 0, display: "flex", alignItems: "flex-end", transform: floatT, transition: "transform 520ms cubic-bezier(.2,.8,.2,1)" }}>
              {showBubble && (
                <div
                  style={{
                    pointerEvents: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    marginBottom: bubbleLift,
                    marginRight: -4,
                    background: "#FFFFFF",
                    border: "1px solid #E6E0D3",
                    borderRadius: "16px 16px 4px 16px",
                    boxShadow: "0 12px 28px -12px rgba(28,26,23,0.3)",
                    padding: "4px 4px 4px 14px",
                  }}
                >
                  <button type="button" onClick={openLead} style={{ border: 0, background: "none", font: "inherit", fontSize: 14, fontWeight: 700, color: "#1C1A17", cursor: "pointer", padding: "9px 0", textAlign: "left" }}>
                    Namaste! Billing aasaan banayein?
                  </button>
                  <button
                    type="button"
                    onClick={hideBubble}
                    aria-label="Hide message"
                    style={{ width: 32, height: 32, border: 0, background: "none", borderRadius: 99, cursor: "pointer", color: "#8A847A", display: "grid", placeItems: "center" }}
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setLeadOpen((v) => !v)}
                aria-label="Join the TaxiMunshi waitlist"
                aria-expanded={leadOpen}
                style={{ pointerEvents: "auto", display: "block", border: 0, background: "none", padding: 0, margin: `0 ${peekRight} 0 0`, cursor: "pointer", width: peekW, height: peekH }}
              >
                <img src="/taximunshi/mascot-waving.png" alt="" width={100} height={170} style={{ display: "block", width: "100%", height: "100%" }} />
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SampleInvoiceCard({ invoiceMax }: { invoiceMax: string }) {
  return (
    <figure
      aria-label="Sample TaxiMunshi tax invoice with fictional details"
      style={{
        position: "relative",
        zIndex: 1,
        margin: 0,
        width: "100%",
        maxWidth: invoiceMax,
        background: "#FFFFFF",
        border: "1px solid #E6E0D3",
        borderRadius: 10,
        boxShadow: "0 2px 0 #F3EEE3, 0 40px 70px -40px rgba(80,55,10,0.35)",
        padding: "clamp(18px,3vw,28px)",
        fontSize: 12,
        lineHeight: 1.45,
        color: "#1C1A17",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, paddingBottom: 12, borderBottom: "2px solid #1C1A17" }}>
        <strong style={{ fontSize: 15 }}>SHREE GANESH TRAVELS</strong>
        <div style={{ textAlign: "right" }}>
          <strong style={{ fontSize: 15, letterSpacing: "0.02em" }}>TAX INVOICE</strong>
          <div style={{ color: "#8A847A", fontSize: 10 }}>Original for Recipient</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "10px 14px", padding: "12px 0", borderBottom: "1px solid #ECE7DC", fontSize: 11, color: "#6B665D" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em" }}>BILLED BY</span>
          <strong style={{ color: "#1C1A17", fontSize: 12 }}>Shree Ganesh Travels</strong>
          <span>GSTIN 06ABCDE1234F1Z5</span>
          <span>+91 90000 00000</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em" }}>BILLED TO</span>
          <strong style={{ color: "#1C1A17", fontSize: 12 }}>Northwind Technologies Pvt. Ltd.</strong>
          <span>GSTIN 06AAACN0000A1Z9</span>
          <span>Booked By: Ms. Riya Kapoor</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em" }}>INVOICE</span>
          <strong style={{ color: "#1C1A17", fontSize: 12 }}>No. 2141</strong>
          <span>Date: 30/9/26</span>
          <span>7/9/26 – 8/9/26</span>
        </div>
      </div>
      <div role="table" aria-label="Duty-wise charges" style={{ paddingTop: 8 }}>
        <div role="row" style={invoiceRowStyle}>
          <span role="columnheader" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "#8A847A" }}>PARTICULARS</span>
          <span role="columnheader" style={{ ...rightAlign, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "#8A847A" }}>UNITS</span>
          <span role="columnheader" style={{ ...rightAlign, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "#8A847A" }}>RATE</span>
          <span role="columnheader" style={{ ...rightAlign, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "#8A847A" }}>AMOUNT</span>
        </div>
        <div style={{ padding: "8px 0 3px", fontSize: 11, fontWeight: 700, color: "#7A4E00" }}>7/9/26 · 7302 Dzire · HSN 996601 · Total 101 kms</div>
        <div role="row" style={invoiceRowStyle}>
          <span role="cell">80kms/8hrs</span><span role="cell" style={{ ...rightAlign, color: "#8A847A" }}>–</span><span role="cell" style={rightAlign}>1,500.00</span><span role="cell" style={rightAlign}>1,500.00</span>
        </div>
        <div role="row" style={invoiceRowStyle}>
          <span role="cell">Additional kms</span><span role="cell" style={{ ...rightAlign, color: "#8A847A" }}>21.00</span><span role="cell" style={rightAlign}>15.00</span><span role="cell" style={rightAlign}>315.00</span>
        </div>
        <div role="row" style={{ ...invoiceRowStyle, paddingBottom: 8, borderBottom: "1px dashed #E6E0D3" }}>
          <span role="cell">Additional hrs</span><span role="cell" style={{ ...rightAlign, color: "#8A847A" }}>5.50</span><span role="cell" style={rightAlign}>100.00</span><span role="cell" style={rightAlign}>550.00</span>
        </div>
        <div style={{ padding: "8px 0 3px", fontSize: 11, fontWeight: 700, color: "#7A4E00" }}>8/9/26 · 7302 Dzire · HSN 996601 · Total 113 kms</div>
        <div role="row" style={invoiceRowStyle}>
          <span role="cell">80kms/8hrs</span><span role="cell" style={{ ...rightAlign, color: "#8A847A" }}>–</span><span role="cell" style={rightAlign}>1,500.00</span><span role="cell" style={rightAlign}>1,500.00</span>
        </div>
        <div role="row" style={invoiceRowStyle}>
          <span role="cell">Additional kms</span><span role="cell" style={{ ...rightAlign, color: "#8A847A" }}>33.00</span><span role="cell" style={rightAlign}>15.00</span><span role="cell" style={rightAlign}>495.00</span>
        </div>
        <div role="row" style={{ ...invoiceRowStyle, paddingBottom: 8, borderBottom: "1px solid #ECE7DC" }}>
          <span role="cell">Additional hrs</span><span role="cell" style={{ ...rightAlign, color: "#8A847A" }}>2.00</span><span role="cell" style={rightAlign}>100.00</span><span role="cell" style={rightAlign}>200.00</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 0", marginLeft: "auto", maxWidth: 250, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12 }}><span>Total</span><span>₹4,560.00</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#8A847A" }}><span>CGST @ 2.5% Under RCM</span><span>–</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#8A847A" }}><span>SGST @ 2.5% Under RCM</span><span>–</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Toll, Tax &amp; Parking</span><span>₹320.00</span></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", background: "#FFF4D6", borderRadius: 6, padding: "10px 12px" }}>
        <strong style={{ fontSize: 13 }}>Net Amount</strong><strong style={{ fontSize: 17 }}>₹4,880.00</strong>
      </div>
      <div style={{ marginTop: 8, fontSize: 11 }}><strong>In Words:</strong> Four Thousand Eight Hundred &amp; Eighty Only.</div>
      <div aria-hidden="true" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid #ECE7DC", fontSize: 12, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, background: "#1C1A17", color: "#FFFFFF" }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>
          Download PDF
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #CDEBD8", background: "#EEFAF2", color: "#14663A" }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
          WhatsApp
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #E6E0D3", color: "#1C1A17" }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width={20} height={16} x={2} y={4} rx={2} /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
          Email
        </span>
      </div>
      <figcaption style={{ position: "absolute", top: -11, left: 20, background: "#1C1A17", color: "#FFFFFF", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 999 }}>
        SAMPLE · FICTIONAL DATA
      </figcaption>
    </figure>
  );
}

const invoiceRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 42px 64px 76px", gap: 6, padding: "2px 0" };
const rightAlign: React.CSSProperties = { textAlign: "right" };

function ProblemSection() {
  return (
    <section>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(72px,9vw,112px) 24px", display: "flex", flexDirection: "column", gap: "clamp(48px,6vw,72px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "48px clamp(40px,6vw,88px)", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: "#7A4E00" }}>THE MONTH-END PROBLEM</span>
            <h2 style={{ margin: 0, fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.06, letterSpacing: "-0.035em", fontWeight: 800 }}>
              Month-end shouldn&apos;t mean a week inside Excel.
            </h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: "#5E5A52" }}>
              Duty slips, a sheet per client, rates you remember from last year and a calculator. Small mistakes slip in, the client queries the bill,
              and payment waits.
            </p>
          </div>
          <div aria-label="Illustration of a spreadsheet with a wrong rate" style={{ position: "relative", padding: "20px 28px 40px 0" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #DCD9D2", borderRadius: 10, boxShadow: "0 30px 60px -36px rgba(28,26,23,0.35)", overflow: "hidden", fontSize: 12.5, fontVariantNumeric: "tabular-nums", transform: "rotate(-1.5deg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#1F7A45", color: "#FFFFFF", fontSize: 12, fontWeight: 600 }}>
                <span style={{ width: 16, height: 16, borderRadius: 3, background: "#FFFFFF", color: "#1F7A45", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>X</span>
                Northwind_Sept_FINAL_v3.xlsx
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderBottom: "1px solid #E7E5E0", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12 }}>
                <span style={{ color: "#8A847A", fontStyle: "italic" }}>fx</span>
                <span style={{ color: "#1C1A17" }}>=(C2-80)*<span style={{ background: "#FDECEA", color: "#B42318", padding: "0 3px", borderRadius: 3 }}>18</span></span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <SpreadsheetGrid />
              </div>
            </div>
            <div style={{ position: "absolute", right: 0, bottom: 0, maxWidth: 230, background: "#FFE58A", borderRadius: 4, padding: "12px 14px", boxShadow: "0 14px 28px -14px rgba(92,59,0,0.5)", transform: "rotate(3deg)", fontSize: 13, lineHeight: 1.45, color: "#3F2A00" }}>
              <strong style={{ display: "block", marginBottom: 2 }}>Wrong rate.</strong>Northwind pays ₹15 per extra km, not ₹18. This invoice goes back.
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            background: "repeating-linear-gradient(180deg,#FFFDF6 0px,#FFFDF6 55px,#DDE6F0 55px,#DDE6F0 56px)",
            border: "1px solid #EDE6D6",
            borderRadius: 6,
            boxShadow: "0 1px 0 #F3EEE3, 0 40px 70px -50px rgba(80,55,10,0.45)",
            padding: "28px clamp(20px,4vw,56px) 40px clamp(56px,7vw,96px)",
          }}
        >
          <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: "clamp(36px,5vw,68px)", width: 5, borderLeft: "1.5px solid #E8A39C", borderRight: "1.5px solid #E8A39C" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: "4px 40px", paddingBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-landing-script), cursive", fontWeight: 700, fontSize: 26, color: "#D7372F" }}>Purana tareeka</span>
            <span style={{ fontFamily: "var(--font-landing-script), cursive", fontWeight: 700, fontSize: 26, color: "#1C1A17" }}>TaxiMunshi ke saath</span>
          </div>
          {COMPARISON_ROWS.map((row) => (
            <div key={row.before} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: "4px 40px", padding: "14px 0", minHeight: 112, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: "var(--font-landing-script), cursive", fontWeight: 600, fontSize: "clamp(24px,2.4vw,30px)", lineHeight: 1.1, color: "#4A453D", textDecoration: "line-through", textDecorationColor: "#D7372F", textDecorationThickness: "2.5px" }}>
                  {row.before}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ fontSize: 18, lineHeight: 1.35, color: "#1C1A17" }}>
                  {row.afterTitle} <span style={{ background: "linear-gradient(transparent 55%,#FFD65C 55%)", padding: "0 2px" }}>{row.afterHighlight}</span>
                  {row.afterAfter}
                </strong>
                <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "#5E5A52" }}>{row.afterBody}</span>
              </div>
            </div>
          ))}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "clamp(16px,4vw,48px)",
              bottom: -22,
              transform: "rotate(-8deg)",
              border: "3px solid #1C1A17",
              borderRadius: 10,
              padding: "6px 16px",
              background: "#FFC21A",
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "0.06em",
              color: "#1C1A17",
              boxShadow: "0 10px 20px -10px rgba(28,26,23,0.5)",
            }}
          >
            HISAAB SAAF.
          </div>
        </div>
      </div>
    </section>
  );
}

const cellStyle: React.CSSProperties = { padding: "7px 9px", borderRight: "1px solid #E7E5E0", borderBottom: "1px solid #E7E5E0", whiteSpace: "nowrap" };
const headCellStyle: React.CSSProperties = { ...cellStyle, background: "#F3F2EE", color: "#8A847A", fontWeight: 600, textAlign: "center" };

function SpreadsheetGrid() {
  const rows: (string | { text: string; style?: React.CSSProperties })[][] = [
    ["", "A", "B", "C", "D", "E"],
    ["1", { text: "Date", style: { fontWeight: 700 } }, { text: "Vehicle", style: { fontWeight: 700 } }, { text: "Kms", style: { fontWeight: 700 } }, { text: "Extra km", style: { fontWeight: 700 } }, { text: "Amount", style: { fontWeight: 700 } }],
    ["2", "7/9/26", "Dzire", "101", "21", { text: "378", style: { background: "#FDECEA", color: "#B42318", fontWeight: 700, boxShadow: "inset 0 0 0 2px #E5484D" } }],
    ["3", "8/9/26", "Dzire", "113", "33", "495"],
    ["4", "11/9/26", "Ertiga", "155", { text: "#REF!", style: { color: "#B42318" } }, { text: "#VALUE!", style: { color: "#B42318" } }],
    ["5", { text: "…", style: { color: "#B5AFA4" } }, "", "", "", ""],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 70px 76px 52px 72px 76px", minWidth: 378 }}>
      {rows.map((row, ri) =>
        row.map((cell, ci) => {
          const isHeaderRow = ri === 0;
          const isHeaderCol = ci === 0;
          const base = isHeaderRow || isHeaderCol ? headCellStyle : cellStyle;
          const content = typeof cell === "string" ? cell : cell.text;
          const extraStyle = typeof cell === "string" ? {} : cell.style;
          return (
            <span key={`${ri}-${ci}`} style={{ ...base, ...extraStyle }}>
              {content}
            </span>
          );
        }),
      )}
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      n: 1,
      title: "Add a duty",
      body: "Client, date, vehicle, times, kilometres and toll or parking, straight from the slip.",
      preview: (
        <>
          <div style={previewHeadStyle}>Add trip</div>
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {[
              ["Client", "Northwind Tech."],
              ["Date", "7/9/26"],
              ["Vehicle", "7302 Dzire"],
              ["Total kms", "101"],
              ["Start – end", "08:00 – 21:30"],
              ["Toll/parking", "₹160"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ color: "#8A847A" }}>{label}</span>
                <span style={{ border: "1px solid #E6E0D3", borderRadius: 7, padding: "6px 8px" }}>{value}</span>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      n: 2,
      title: "Apply the client rate card",
      body: "Each client has its own package and extra rates per vehicle type. Set once, reused on every duty.",
      preview: (
        <>
          <div style={previewHeadStyle}>Rate card · Northwind Technologies</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.7fr 0.7fr", gap: 6, padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#8A847A", borderBottom: "1px solid #ECE7DC" }}>
            <span>VEHICLE</span><span>80kms/8hrs</span><span>+ km</span><span>+ hr</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.7fr 0.7fr", gap: 6, padding: "9px 12px", borderBottom: "1px solid #F3EFE6", background: "#FFFBEF" }}>
            <strong>Dzire</strong><span>₹1,500</span><span>₹15</span><span>₹100</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.7fr 0.7fr", gap: 6, padding: "9px 12px", borderBottom: "1px solid #F3EFE6" }}>
            <strong>Ertiga</strong><span>₹1,800</span><span>₹18</span><span>₹150</span>
          </div>
          <div style={{ padding: "9px 12px", fontSize: 11.5, color: "#8A847A" }}>Toll, tax &amp; parking at actuals</div>
        </>
      ),
    },
    {
      n: 3,
      title: "Generate the invoice",
      body: "Pick the client and period. Every duty becomes a line, with extras, tax treatment and amount in words.",
      preview: (
        <>
          <div style={{ ...previewHeadStyle, display: "flex", justifyContent: "space-between" }}>
            <span>Invoice 2141</span>
            <span style={{ fontWeight: 500, color: "#8A847A" }}>7/9/26 – 8/9/26</span>
          </div>
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5E5A52" }}>7/9 · +21 km · +5.5 h</span><span>2,365.00</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5E5A52" }}>8/9 · +33 km · +2 h</span><span>2,195.00</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5E5A52" }}>Toll, tax &amp; parking</span><span>320.00</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, padding: "8px 10px", borderRadius: 7, background: "#FFF4D6", fontWeight: 800 }}><span>Net Amount</span><span>₹4,880.00</span></div>
          </div>
        </>
      ),
    },
  ];
  return (
    <section id="how" style={{ background: "#FFF8E8", scrollMarginTop: 70, borderTop: "1px solid #F3E8CC", borderBottom: "1px solid #F3E8CC" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(72px,9vw,112px) 24px", display: "flex", flexDirection: "column", gap: 52 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(30px,3.6vw,42px)", lineHeight: 1.12, letterSpacing: "-0.03em", fontWeight: 800 }}>From duty slip to invoice.</h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#5E5A52" }}>Enter a duty once. Apply the right client rates. Generate a professional invoice.</p>
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 24 }}>
          {steps.map((s) => (
            <li key={s.n} style={{ background: "#FFFFFF", border: "1px solid #EFE6D0", borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 18px 36px -30px rgba(80,55,10,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: 999, background: "#FFC21A", color: "#1C1A17", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>{s.n}</span>
                <h3 style={{ margin: 0, fontSize: 19 }}>{s.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#5E5A52" }}>{s.body}</p>
              <div style={{ marginTop: "auto", border: "1px solid #ECE7DC", borderRadius: 12, overflow: "hidden", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{s.preview}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const previewHeadStyle: React.CSSProperties = { padding: "9px 12px", background: "#FAF8F3", borderBottom: "1px solid #ECE7DC", fontWeight: 700 };

function ShareExportSection() {
  const items = [
    {
      bg: "#FFF4D6",
      iconColor: "#1C1A17",
      icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
      title: "One-click PDF export",
      body: "Download any invoice or quotation as a clean PDF in one click.",
    },
    {
      bg: "#EEFAF2",
      iconColor: "#14663A",
      icon: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
      title: "Share on WhatsApp or email",
      body: "Send the invoice straight to the client's accounts team, from your laptop or phone.",
    },
    {
      bg: "#FFF4D6",
      iconColor: "#1C1A17",
      icon: <><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width={20} height={14} x={2} y={6} rx={2} /></>,
      title: "Export for your CA",
      body: "Download the month's billing as an Excel file formatted for GST filing, ready for your CA.",
    },
  ];
  return (
    <section id="share" style={{ scrollMarginTop: 70 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(72px,9vw,112px) 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "48px clamp(40px,6vw,96px)", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: "#7A4E00" }}>SHARE &amp; EXPORT</span>
            <h2 style={{ margin: 0, fontSize: "clamp(30px,3.6vw,42px)", lineHeight: 1.12, letterSpacing: "-0.03em", fontWeight: 800 }}>Invoice ready? Send it in one tap.</h2>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#5E5A52" }}>
              No saving, attaching and forwarding. Send the invoice from TaxiMunshi itself, and hand your CA a GST-ready Excel at month-end.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {items.map((it, i) => (
              <div key={it.title} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 16, padding: "20px 0", borderTop: "1px solid #ECE7DC", borderBottom: i === items.length - 1 ? "1px solid #ECE7DC" : undefined }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: it.bg, display: "grid", placeItems: "center" }}>
                  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={it.iconColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    {it.icon}
                  </svg>
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <strong style={{ fontSize: 17 }}>{it.title}</strong>
                  <span style={{ fontSize: 15, lineHeight: 1.6, color: "#5E5A52" }}>{it.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div aria-label="Representative share and export panel" style={{ position: "relative", background: "radial-gradient(70% 70% at 70% 30%, #FFE9AE 0%, rgba(255,233,174,0) 75%), #FFF8E8", border: "1px solid #F3E8CC", borderRadius: 24, padding: "clamp(20px,4vw,40px)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E6E0D3", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 20px 40px -30px rgba(80,55,10,0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12, color: "#8A847A", fontWeight: 600 }}>#2141 · 30 September 2026 · 2 trips</span>
                <strong style={{ fontSize: 16 }}>NORTHWIND TECHNOLOGIES PVT LTD</strong>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9A3412", background: "#FFEDE3", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>Unpaid</span>
            </div>
            <strong style={{ fontSize: 28, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>₹4,880.00</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, fontSize: 13, fontWeight: 700 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 9, background: "#1C1A17", color: "#FFFFFF" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>
                PDF
              </span>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 9, background: "#EEFAF2", border: "1px solid #CDEBD8", color: "#14663A" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                WhatsApp
              </span>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 9, border: "1px solid #E6E0D3", color: "#1C1A17" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width={20} height={16} x={2} y={4} rx={2} /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                Email
              </span>
            </div>
          </div>
          <div style={{ background: "#1C1A17", color: "#FFFFFF", borderRadius: 14, padding: 18, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 10, background: "#FFC21A", color: "#1C1A17", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width={20} height={14} x={2} y={6} rx={2} /></svg>
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong style={{ fontSize: 15 }}>September 2026 · GST export</strong>
                <span style={{ fontSize: 13, color: "#C9C3B6" }}>Excel formatted for GST filing</span>
              </div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 9, background: "#FFC21A", color: "#1C1A17", fontSize: 13, fontWeight: 800 }}>Export Excel</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ tab, setTab }: { tab: "dash" | "inv"; setTab: (t: "dash" | "inv") => void }) {
  const showcase =
    tab === "dash"
      ? {
          title: "Know where the month stands.",
          bullets: [
            "What you billed this month and this financial year.",
            "How much is still outstanding, without opening a sheet.",
            "Clients, cars and your latest invoices on one screen.",
          ],
          laptop: "/taximunshi/dashboard-laptop.png",
          laptopAlt: "TaxiMunshi dashboard on a laptop: billed this month, billed this year, outstanding, and recent invoices",
          phone: "/taximunshi/dashboard-phone.png",
          phoneAlt: "TaxiMunshi dashboard on a phone",
        }
      : {
          title: "Every invoice in one list.",
          bullets: [
            "Raise a quick invoice, or build one from trips.",
            "Filter paid and unpaid, search by client or number.",
            "Download the PDF or share it from your phone.",
          ],
          laptop: "/taximunshi/invoices-laptop.png",
          laptopAlt: "TaxiMunshi invoice list on a laptop with amounts, paid or unpaid status and download buttons",
          phone: "/taximunshi/invoices-phone.png",
          phoneAlt: "TaxiMunshi invoice list on a phone with share and download buttons",
        };

  return (
    <section
      id="features"
      style={{
        scrollMarginTop: 70,
        background: "radial-gradient(60% 50% at 50% 0%, #2E2920 0%, rgba(46,41,32,0) 70%), #1C1A17",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(80px,10vw,128px) 24px clamp(64px,8vw,96px)", display: "flex", flexDirection: "column", gap: "clamp(48px,6vw,72px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "20px 64px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", color: "#FFC21A" }}>INSIDE TAXIMUNSHI</span>
            <h2 style={{ margin: 0, fontSize: "clamp(36px,4.6vw,58px)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}>
              Built for the way you <span style={{ color: "#FFC21A" }}>actually</span> bill.
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#BDB6A8", maxWidth: 400 }}>
            Not another generic invoice maker. These are real TaxiMunshi screens, with client names swapped for sample data.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div role="tablist" aria-label="Product screens" style={{ alignSelf: "flex-start", display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "#2A2722", border: "1px solid #3A352D" }}>
            {(["dash", "inv"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                onClick={() => setTab(t)}
                aria-selected={tab === t}
                style={{
                  height: 40,
                  padding: "0 18px",
                  borderRadius: 999,
                  border: 0,
                  font: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: tab === t ? "#FFC21A" : "transparent",
                  color: tab === t ? "#1C1A17" : "#D9D3C7",
                }}
              >
                {t === "dash" ? "Dashboard" : "Invoices"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "40px clamp(32px,5vw,72px)" }}>
            <div style={{ flex: "1 1 280px", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ margin: 0, fontSize: "clamp(22px,2.4vw,28px)", lineHeight: 1.2, letterSpacing: "-0.02em", color: "#FFFFFF" }}>{showcase.title}</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {showcase.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.55, color: "#D9D3C7" }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFC21A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ position: "relative", flex: "2 1 560px", minWidth: 0, padding: "0 clamp(24px,6%,72px) clamp(40px,5vw,60px) 0" }}>
              <div aria-hidden="true" style={{ position: "absolute", left: "8%", right: "12%", bottom: "6%", height: "40%", background: "radial-gradient(closest-side,rgba(255,194,26,0.35),rgba(255,194,26,0))", filter: "blur(20px)" }} />
              <div style={{ position: "relative", background: "#0E0D0B", borderRadius: "18px 18px 6px 6px", padding: "12px 12px 14px", boxShadow: "0 0 0 1px #3A352D, 0 60px 90px -40px rgba(0,0,0,0.8)" }}>
                <div aria-hidden="true" style={{ position: "absolute", top: 4, left: "50%", width: 6, height: 6, marginLeft: -3, borderRadius: 9, background: "#2A2722" }} />
                <img src={showcase.laptop} alt={showcase.laptopAlt} width={1600} height={906} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderRadius: 6 }} />
              </div>
              <div aria-hidden="true" style={{ position: "relative", height: 18, margin: "0 -6%", borderRadius: "3px 3px 18px 18px", background: "linear-gradient(#6B655B,#2E2A24)", boxShadow: "0 30px 40px -16px rgba(0,0,0,0.7)" }}>
                <div style={{ width: "16%", height: 6, margin: "0 auto", borderRadius: "0 0 8px 8px", background: "#1E1B17" }} />
              </div>
              <div style={{ position: "absolute", right: 0, bottom: 0, width: "27%", minWidth: 110, maxWidth: 200, background: "#0E0D0B", borderRadius: 28, padding: 7, boxShadow: "0 0 0 1px #3A352D, 0 40px 60px -16px rgba(0,0,0,0.85)" }}>
                <img src={showcase.phone} alt={showcase.phoneAlt} width={585} height={1220} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderRadius: 22 }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", columnGap: 24, borderBottom: "1px solid #34302A" }}>
          {FEATURE_CARDS.map((f) => (
            <div key={f.n} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "28px 28px 30px", borderTop: "1px solid #34302A" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#FFC21A" }}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6F685D", letterSpacing: "0.08em" }}>{f.n}</span>
              </div>
              <strong style={{ fontSize: 18, color: "#FFFFFF", marginTop: 6 }}>{f.title}</strong>
              <span style={{ fontSize: 15, lineHeight: 1.6, color: "#BDB6A8" }}>{f.body}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #ECE7DC" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 24px 36px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo size="footer" />
          <span style={{ display: "flex", flexDirection: "column", gap: 3, lineHeight: 1 }}>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.025em" }}>TaxiMunshi</span>
            <span style={{ fontSize: 12, color: "#8A847A" }}>Aapka cab business ka digital munshi</span>
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 56, fontSize: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <strong style={{ fontSize: 12, letterSpacing: "0.08em" }}>PRODUCT</strong>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ color: "#5E5A52" }}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <strong style={{ fontSize: 12, letterSpacing: "0.08em" }}>ACCOUNT</strong>
            <a href="/sign-in" style={{ color: "#5E5A52" }}>Sign in</a>
            <a href="#waitlist" style={{ color: "#5E5A52" }}>Join the waitlist</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <strong style={{ fontSize: 12, letterSpacing: "0.08em" }}>LEGAL</strong>
            <a href="/privacy" style={{ color: "#5E5A52" }}>Privacy policy</a>
            <a href="/terms" style={{ color: "#5E5A52" }}>Terms of service</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 24px 30px", borderTop: "1px solid #ECE7DC", fontSize: 13, color: "#8A847A" }}>
        © 2026 TaxiMunshi
      </div>
    </footer>
  );
}
