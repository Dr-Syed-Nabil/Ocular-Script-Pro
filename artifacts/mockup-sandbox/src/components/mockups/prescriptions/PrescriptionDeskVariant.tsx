import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Filter = "All" | "Needs review" | "Recent";

type Prescription = {
  id: number;
  initials: string;
  name: string;
  age: string;
  date: string;
  sortDate: number;
  rx: string;
  lens: string;
  note: string;
  status: "Ready" | "Review";
  color: string;
};

const prescriptions: Prescription[] = [
  {
    id: 1,
    initials: "RM",
    name: "Rina Mukherjee",
    age: "42 yrs",
    date: "Today · 09:42",
    sortDate: 4,
    rx: "RE  −1.25 / −0.50 × 090",
    lens: "Progressive",
    note: "Headaches after screen use",
    status: "Ready",
    color: "#d9f4ef",
  },
  {
    id: 2,
    initials: "SA",
    name: "Sanjay Ahmed",
    age: "28 yrs",
    date: "Today · 08:18",
    sortDate: 3,
    rx: "RE  −2.00 / plano ×  —",
    lens: "Monofocal",
    note: "Distance blur, both eyes",
    status: "Review",
    color: "#e7e4f7",
  },
  {
    id: 3,
    initials: "NS",
    name: "Nandita Sen",
    age: "61 yrs",
    date: "Yesterday · 16:05",
    sortDate: 2,
    rx: "RE  +1.50 / −0.75 × 080",
    lens: "Bifocal",
    note: "Near vision follow-up",
    status: "Ready",
    color: "#f7ead7",
  },
  {
    id: 4,
    initials: "HK",
    name: "Harish Kapoor",
    age: "36 yrs",
    date: "Yesterday · 11:31",
    sortDate: 1,
    rx: "RE  plano / −0.25 × 180",
    lens: "Monofocal",
    note: "Annual check-up",
    status: "Ready",
    color: "#dfeaf5",
  },
];

export function PrescriptionDeskVariant() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [showNewRx, setShowNewRx] = useState(false);
  const [activeTab, setActiveTab] = useState("Prescriptions");
  const [notice, setNotice] = useState("");

  const visiblePrescriptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return prescriptions.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.rx} ${item.lens}`.toLowerCase().includes(normalized);
      const matchesFilter =
        filter === "All" ||
        (filter === "Needs review" && item.status === "Review") ||
        (filter === "Recent" && item.sortDate >= 3);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query]);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };

  const handleTab = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "Prescriptions") announce(`${tab} view is ready for the next visit`);
  };

  return (
    <main style={styles.page}>
      <section style={styles.shell} aria-label="OptiScript prescription desk">
        <header style={styles.hero}>
          <div style={styles.heroTopline}>
            <div style={styles.brandMark}>
              <span style={styles.brandDot} />
              <span>OPTISCRIPT</span>
            </div>
            <button
              type="button"
              style={styles.profileButton}
              aria-label="Open profile"
              onClick={() => announce("Profile settings opened")}
            >
              NB
            </button>
          </div>

          <div style={styles.greetingRow}>
            <div>
              <p style={styles.eyebrow}>MONDAY, 18 MARCH 2024</p>
              <h1 style={styles.title}>
                Good morning,
                <br />
                <em>Dr. Nabil.</em>
              </h1>
            </div>
            <div style={styles.todayBadge}>
              <span style={styles.liveDot} />
              <span>Clinic open</span>
            </div>
          </div>

          <div style={styles.statsRow}>
            <div>
              <strong style={styles.statNumber}>18</strong>
              <span style={styles.statLabel}>prescriptions</span>
            </div>
            <div style={styles.statDivider} />
            <div>
              <strong style={styles.statNumber}>04</strong>
              <span style={styles.statLabel}>need review</span>
            </div>
            <button
              type="button"
              style={styles.newButton}
              onClick={() => setShowNewRx(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New Rx</span>
            </button>
          </div>

          <label style={styles.searchBox}>
            <Search size={17} strokeWidth={2} />
            <input
              style={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, PUID, or Rx"
              aria-label="Search prescriptions"
            />
            <button
              type="button"
              aria-label="Filter prescriptions"
              style={styles.searchAction}
              onClick={() =>
                setFilter(filter === "All" ? "Needs review" : "All")
              }
            >
              <SlidersHorizontal size={16} />
            </button>
          </label>
        </header>

        <section style={styles.content}>
          <div style={styles.sectionHeading}>
            <div>
              <p style={styles.sectionKicker}>YOUR WORKSPACE</p>
              <h2 style={styles.sectionTitle}>Recent prescriptions</h2>
            </div>
            <button
              type="button"
              style={styles.moreButton}
              aria-label="More prescription options"
              onClick={() => announce("More prescription options opened")}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div style={styles.filterRail} role="tablist" aria-label="Prescription filters">
            {(["All", "Needs review", "Recent"] as Filter[]).map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={filter === item}
                key={item}
                style={{
                  ...styles.filterButton,
                  ...(filter === item ? styles.filterButtonActive : {}),
                }}
                onClick={() => setFilter(item)}
              >
                {item}
                {item === "Needs review" ? <span style={styles.filterCount}>4</span> : null}
              </button>
            ))}
          </div>

          <div style={styles.list} aria-live="polite">
            {visiblePrescriptions.length === 0 ? (
              <div style={styles.emptyState}>
                <FileText size={22} />
                <strong>No matching prescriptions</strong>
                <span>Try a different name or filter.</span>
              </div>
            ) : (
              visiblePrescriptions.map((item) => {
                const selected = selectedId === item.id;
                return (
                  <article
                    key={item.id}
                    style={{
                      ...styles.prescriptionRow,
                      ...(selected ? styles.prescriptionRowSelected : {}),
                    }}
                  >
                    <button
                      type="button"
                      style={styles.rowMain}
                      onClick={() => setSelectedId(selected ? null : item.id)}
                      aria-expanded={selected}
                    >
                      <div style={styles.dateRail}>
                        <span style={styles.dateTime}>{item.date.split(" · ")[1]}</span>
                        <span style={styles.dateLine} />
                      </div>
                      <div style={{ ...styles.avatar, background: item.color }}>
                        {item.initials}
                      </div>
                      <div style={styles.rowCopy}>
                        <div style={styles.nameLine}>
                          <strong>{item.name}</strong>
                          {item.status === "Review" ? (
                            <span style={styles.reviewDot} aria-label="Needs review" />
                          ) : null}
                        </div>
                        <span style={styles.metaLine}>
                          {item.age} <span style={styles.metaSeparator}>·</span> {item.lens}
                        </span>
                        <span style={styles.rxLine}>{item.rx}</span>
                      </div>
                      <ChevronRight
                        size={17}
                        style={{
                          ...styles.chevron,
                          transform: selected ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      />
                    </button>
                    {selected ? (
                      <div style={styles.expandedRow}>
                        <div style={styles.noteBlock}>
                          <span style={styles.noteLabel}>VISIT NOTE</span>
                          <span style={styles.noteText}>{item.note}</span>
                        </div>
                        <button
                          type="button"
                          style={styles.openButton}
                          onClick={() => announce(`Opening ${item.name}'s prescription`)}
                        >
                          <span>Open Rx</span>
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>

          <div style={styles.queueCard}>
            <div style={styles.queueIcon}>
              <Clock3 size={17} />
            </div>
            <div style={styles.queueCopy}>
              <strong>Afternoon queue</strong>
              <span>3 follow-ups scheduled after 2:00 PM</span>
            </div>
            <CheckCircle2 size={18} color="#1b9b83" />
          </div>
        </section>

        <nav style={styles.bottomNav} aria-label="Primary">
          {[
            { label: "Prescriptions", icon: FileText },
            { label: "Patients", icon: Users },
            { label: "Profile", icon: UserRound },
          ].map(({ label, icon: Icon }) => {
            const active = activeTab === label;
            return (
              <button
                type="button"
                key={label}
                style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}
                onClick={() => handleTab(label)}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {showNewRx ? (
          <div style={styles.sheetBackdrop} role="presentation" onClick={() => setShowNewRx(false)}>
            <section
              style={styles.newSheet}
              role="dialog"
              aria-modal="true"
              aria-label="Create a new prescription"
              onClick={(event) => event.stopPropagation()}
            >
              <div style={styles.sheetHandle} />
              <div style={styles.sheetHeader}>
                <div>
                  <span style={styles.sectionKicker}>START A VISIT</span>
                  <h2 style={styles.sheetTitle}>New prescription</h2>
                </div>
                <button
                  type="button"
                  aria-label="Close new prescription"
                  style={styles.closeButton}
                  onClick={() => setShowNewRx(false)}
                >
                  <X size={19} />
                </button>
              </div>
              <label style={styles.patientInput}>
                <span>Patient name or PUID</span>
            <input style={styles.patientInputField} placeholder="Search existing patient" autoFocus />
              </label>
              <button
                type="button"
                style={styles.startButton}
                onClick={() => {
                  setShowNewRx(false);
                  announce("New prescription draft created");
                }}
              >
                <Plus size={17} />
                Start blank Rx
              </button>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => setShowNewRx(false)}
              >
                Cancel
              </button>
            </section>
          </div>
        ) : null}

        {notice ? <div style={styles.toast}>{notice}</div> : null}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#dfe7ee",
    display: "flex",
    justifyContent: "center",
    padding: "0",
    color: "#102c3d",
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  shell: {
    width: "100%",
    maxWidth: 468,
    height: "100dvh",
    background: "#f6f8f6",
    position: "relative",
    overflowX: "hidden",
    overflowY: "auto",
    boxShadow: "0 0 45px rgba(16, 44, 61, 0.16)",
  },
  hero: {
    background: "#102c3d",
    color: "#f6f8f6",
    padding: "22px 20px 22px",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  brandMark: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 10,
    letterSpacing: "0.18em",
    fontWeight: 800,
    color: "#b9d8d4",
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#7ed9c8",
    boxShadow: "0 0 0 4px rgba(126, 217, 200, 0.12)",
  },
  profileButton: {
    width: 31,
    height: 31,
    border: "1px solid rgba(246, 248, 246, 0.24)",
    borderRadius: "50%",
    background: "rgba(246, 248, 246, 0.08)",
    color: "#f6f8f6",
    fontSize: 10,
    letterSpacing: "0.05em",
    fontWeight: 800,
    cursor: "pointer",
  },
  greetingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  eyebrow: {
    margin: 0,
    color: "#88b5b4",
    fontSize: 9,
    letterSpacing: "0.16em",
    fontWeight: 800,
  },
  title: {
    margin: "8px 0 0",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 30,
    lineHeight: 1.03,
    letterSpacing: "-0.045em",
    fontWeight: 500,
  },
  todayBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "1px solid rgba(126, 217, 200, 0.25)",
    borderRadius: 20,
    padding: "6px 9px",
    color: "#b8dbd6",
    fontSize: 9,
    whiteSpace: "nowrap",
    marginTop: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#7ed9c8",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginTop: 25,
  },
  statNumber: {
    display: "block",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontWeight: 500,
    fontSize: 24,
    lineHeight: 1,
    color: "#f6f8f6",
  },
  statLabel: {
    display: "block",
    marginTop: 5,
    color: "#91b1b5",
    fontSize: 9,
    letterSpacing: "0.04em",
  },
  statDivider: {
    height: 31,
    width: 1,
    background: "rgba(246, 248, 246, 0.18)",
  },
  newButton: {
    marginLeft: "auto",
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    border: "none",
    borderRadius: 10,
    padding: "11px 13px",
    background: "#7ed9c8",
    color: "#102c3d",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  },
  searchBox: {
    marginTop: 21,
    display: "flex",
    alignItems: "center",
    gap: 9,
    height: 44,
    padding: "0 7px 0 13px",
    borderRadius: 12,
    background: "#f6f8f6",
    color: "#6a858d",
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#102c3d",
    fontFamily: "inherit",
    fontSize: 11,
  },
  searchAction: {
    display: "grid",
    placeItems: "center",
    width: 31,
    height: 31,
    border: "none",
    borderRadius: 8,
    background: "#e7efed",
    color: "#1b9b83",
    cursor: "pointer",
  },
  content: {
    padding: "24px 18px 94px",
  },
  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionKicker: {
    display: "block",
    margin: 0,
    color: "#78939a",
    fontSize: 9,
    letterSpacing: "0.15em",
    fontWeight: 800,
  },
  sectionTitle: {
    margin: "5px 0 0",
    color: "#102c3d",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 23,
    lineHeight: 1.05,
    fontWeight: 500,
    letterSpacing: "-0.035em",
  },
  moreButton: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    border: "1px solid #dbe5e4",
    borderRadius: "50%",
    color: "#6e8991",
    background: "transparent",
    cursor: "pointer",
  },
  filterRail: {
    display: "flex",
    gap: 7,
    margin: "18px 0 14px",
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  filterButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    border: "none",
    borderRadius: 20,
    padding: "8px 12px",
    background: "#e9efee",
    color: "#6b858b",
    fontSize: 10,
    fontWeight: 800,
    cursor: "pointer",
  },
  filterButtonActive: {
    background: "#102c3d",
    color: "#f6f8f6",
  },
  filterCount: {
    display: "grid",
    placeItems: "center",
    minWidth: 16,
    height: 16,
    borderRadius: "50%",
    background: "#e66d5d",
    color: "#fff8f3",
    fontSize: 9,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },
  prescriptionRow: {
    overflow: "hidden",
    border: "1px solid #e0e8e6",
    borderRadius: 15,
    background: "#fbfcfa",
    transition: "transform 160ms ease, border-color 160ms ease",
  },
  prescriptionRowSelected: {
    borderColor: "#9dd9cd",
    background: "#f8fcfa",
  },
  rowMain: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "11px 11px 11px 0",
    border: "none",
    background: "transparent",
    textAlign: "left",
    color: "#102c3d",
    cursor: "pointer",
  },
  dateRail: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 48,
    flexShrink: 0,
    alignSelf: "stretch",
    paddingTop: 2,
  },
  dateTime: {
    color: "#94a8aa",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
  dateLine: {
    width: 1,
    flex: 1,
    marginTop: 8,
    background: "#dce8e5",
  },
  avatar: {
    display: "grid",
    placeItems: "center",
    width: 37,
    height: 37,
    flexShrink: 0,
    borderRadius: "50%",
    color: "#245263",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.02em",
  },
  rowCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 10,
  },
  nameLine: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  nameLineStrong: {},
  reviewDot: {
    width: 6,
    height: 6,
    flexShrink: 0,
    borderRadius: "50%",
    background: "#e66d5d",
  },
  metaLine: {
    display: "block",
    overflow: "hidden",
    marginTop: 3,
    color: "#84999e",
    fontSize: 10,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metaSeparator: {
    color: "#b6c5c4",
    padding: "0 2px",
  },
  rxLine: {
    display: "block",
    overflow: "hidden",
    marginTop: 7,
    color: "#2c6873",
    fontSize: 10,
    fontWeight: 800,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 7,
    color: "#91a8aa",
    transition: "transform 160ms ease",
  },
  expandedRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    padding: "0 13px 13px 59px",
    borderTop: "1px dashed #dce8e5",
  },
  noteBlock: {
    minWidth: 0,
    paddingTop: 10,
  },
  noteLabel: {
    display: "block",
    color: "#9aadae",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "0.14em",
  },
  noteText: {
    display: "block",
    overflow: "hidden",
    marginTop: 4,
    color: "#547079",
    fontSize: 10,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  openButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    border: "none",
    background: "transparent",
    color: "#1b9b83",
    fontSize: 10,
    fontWeight: 800,
    cursor: "pointer",
  },
  queueCard: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    marginTop: 17,
    padding: "12px 13px",
    borderRadius: 14,
    background: "#e8f3f0",
  },
  queueIcon: {
    display: "grid",
    placeItems: "center",
    width: 31,
    height: 31,
    flexShrink: 0,
    borderRadius: 9,
    background: "#c9e9e1",
    color: "#1b806f",
  },
  queueCopy: {
    minWidth: 0,
    flex: 1,
  },
  queueCopyStrong: {},
  bottomNav: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    justifyContent: "space-around",
    padding: "10px 11px 15px",
    borderTop: "1px solid #e0e9e6",
    background: "rgba(251, 252, 250, 0.96)",
    backdropFilter: "blur(10px)",
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    minWidth: 92,
    padding: "2px 8px 0",
    border: "none",
    background: "transparent",
    color: "#8ba0a2",
    fontSize: 9,
    fontWeight: 700,
    cursor: "pointer",
  },
  navItemActive: {
    color: "#1b9b83",
  },
  sheetBackdrop: {
    position: "absolute",
    inset: 0,
    zIndex: 5,
    display: "flex",
    alignItems: "flex-end",
    background: "rgba(16, 44, 61, 0.4)",
  },
  newSheet: {
    width: "100%",
    padding: "11px 20px 23px",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    background: "#fbfcfa",
    boxShadow: "0 -10px 30px rgba(16, 44, 61, 0.15)",
  },
  sheetHandle: {
    width: 35,
    height: 4,
    margin: "0 auto 19px",
    borderRadius: 4,
    background: "#d8e3e0",
  },
  sheetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sheetTitle: {
    margin: "6px 0 0",
    color: "#102c3d",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 24,
    fontWeight: 500,
    letterSpacing: "-0.04em",
  },
  closeButton: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    border: "1px solid #dbe5e4",
    borderRadius: "50%",
    background: "transparent",
    color: "#6e8991",
    cursor: "pointer",
  },
  patientInput: {
    display: "block",
    marginTop: 22,
    color: "#66858d",
    fontSize: 10,
    fontWeight: 800,
  },
  patientInputField: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 7,
    padding: "12px 13px",
    border: "1px solid #dbe5e4",
    borderRadius: 10,
    outline: "none",
    background: "#f4f8f6",
    color: "#102c3d",
    fontFamily: "inherit",
    fontSize: 12,
  },
  startButton: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginTop: 14,
    padding: 13,
    border: "none",
    borderRadius: 11,
    background: "#1b9b83",
    color: "#f6f8f6",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  cancelButton: {
    display: "block",
    width: "100%",
    marginTop: 8,
    padding: 10,
    border: "none",
    background: "transparent",
    color: "#78939a",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  toast: {
    position: "absolute",
    right: 16,
    bottom: 78,
    left: 16,
    zIndex: 8,
    padding: "11px 14px",
    borderRadius: 11,
    background: "#102c3d",
    color: "#f6f8f6",
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(16, 44, 61, 0.2)",
  },
};

export default PrescriptionDeskVariant;