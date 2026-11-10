"""
Seed script — populates the billers table in SQLite.

The biller directory shown in the app is derived from BILLER_REGISTRY in
ml/categorizer.py, so the two can never drift apart: the ML rule table and the
list a user can link from are the same 45 billers. Icons and colours are looked
up per biller, with a sensible per-category default for any not listed.

Run once (or any time the registry grows):
    python seed_billers.py
"""
from models.database import SessionLocal, Biller, create_tables
from ml.categorizer import BILLER_REGISTRY

# Per-category fallback icon + colour
CATEGORY_STYLE = {
    "Utilities":     ("flash",         "#3B82F6"),
    "Telecoms":      ("cellular",      "#8B5CF6"),
    "Finance":       ("card",          "#10B981"),
    "Insurance":     ("shield",        "#EF4444"),
    "Housing":       ("home",          "#F59E0B"),
    "Entertainment": ("tv",            "#DC2626"),
    "Education":     ("school",        "#D97706"),
    "Transport":     ("bus",           "#0284C7"),
    "Food & Dining": ("restaurant",    "#EA580C"),
    "Travel":        ("airplane",      "#0891B2"),
}

# Per-biller overrides where a more specific icon reads better
OVERRIDES = {
    "PUB Water":        ("water",            "#0EA5E9"),
    "City Gas":         ("flame",            "#F59E0B"),
    "StarHub":          ("wifi",             "#7C3AED"),
    "M1 Mobile":        ("phone-portrait",   "#6D28D9"),
    "DBS Home Loan":    ("business",         "#10B981"),
    "OCBC Mortgage":    ("business",         "#047857"),
    "AIA Insurance":    ("shield-checkmark", "#DC2626"),
    "Prudential":       ("shield-half",      "#B91C1C"),
    "Spotify":          ("musical-notes",    "#16A34A"),
    "Disney Plus":      ("tv",               "#1D4ED8"),
    "Apple TV":         ("tv",               "#374151"),
    "YouTube Premium":  ("logo-youtube",     "#DC2626"),
    "Amazon Prime":     ("cart",             "#F59E0B"),
    "Grab Transport":   ("car",              "#16A34A"),
    "SMRT":             ("train",            "#0369A1"),
    "ComfortDelGro":    ("car-sport",         "#0284C7"),
}


# Codes already present in the database and referenced by existing transactions,
# demo data and the History screen's icon map. These must not change, or old
# rows orphan and icons stop resolving.
LEGACY_CODES = {
    "SP Power":        "SP_POWER",
    "PUB Water":       "PUB_WATER",
    "City Gas":        "CITY_GAS",
    "Singtel":         "SINGTEL",
    "StarHub":         "STARHUB",
    "M1 Mobile":       "M1_MOBILE",
    "HDB Rent":        "HDB_RENT",
    "DBS Home Loan":   "DBS_LOAN",
    "UOB Credit Card": "UOB_CARD",
    "NTUC Income":     "NTUC_INS",
    "AIA Insurance":   "AIA_INS",
    "Prudential":      "PRUDENTIAL",
    "Netflix":         "NETFLIX",
    "Spotify":         "SPOTIFY",
    "Disney Plus":     "DISNEY",
    "NUS Tuition":     "NUS_FEES",
    "NTU Fees":        "NTU_FEES",
    "SBS Transit":     "SBS",
    "Grab Transport":  "GRAB",
}


def biller_code(name: str) -> str:
    """'SP Power' -> 'SP_POWER', preserving any pre-existing code."""
    if name in LEGACY_CODES:
        return LEGACY_CODES[name]
    return name.upper().replace("&", "AND").replace("-", " ").replace("  ", " ").strip().replace(" ", "_")


def main():
    create_tables()
    db = SessionLocal()
    added = updated = 0

    try:
        for name, category in BILLER_REGISTRY.items():
            code = biller_code(name)
            icon, color = OVERRIDES.get(name, CATEGORY_STYLE.get(category, ("receipt", "#6B7280")))

            existing = db.query(Biller).filter(Biller.biller_code == code).first()
            if existing:
                # Keep the directory in step if a category or style changed
                if (existing.name, existing.category, existing.icon, existing.color) != (name, category, icon, color):
                    existing.name, existing.category = name, category
                    existing.icon, existing.color = icon, color
                    updated += 1
            else:
                db.add(Biller(biller_code=code, name=name, category=category,
                              icon=icon, color=color))
                added += 1

        # Report any directory rows that are no longer in the registry, e.g. an
        # earlier seed's "OCBC Credit Card". Left in place on purpose — deleting
        # them would orphan any transaction that referenced them.
        valid_codes = {biller_code(n) for n in BILLER_REGISTRY}
        stale = [b for b in db.query(Biller).all() if b.biller_code not in valid_codes]

        db.commit()

        total = db.query(Biller).count()
        by_cat = {}
        for b in db.query(Biller).all():
            by_cat[b.category] = by_cat.get(b.category, 0) + 1

        print(f"Registry entries: {len(BILLER_REGISTRY)}")
        print(f"Added: {added}   Updated: {updated}   Total in database: {total}\n")
        for cat in sorted(by_cat):
            print(f"  {cat:15} {by_cat[cat]}")

        if stale:
            print("\nNot in BILLER_REGISTRY (left in the directory, review manually):")
            for b in stale:
                print(f"  {b.biller_code:22} {b.name}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
