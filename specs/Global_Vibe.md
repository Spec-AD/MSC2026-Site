Global Vibe Standard:

// Ensure your code is easy to maintain and readable for a long standing.

// Project Soul: Comfortable, Calm, Modern, Rhythm Game Community mainly, Sophisticated Use  Interface.

// Principle: We want to make a sense like osu! community and create a really fantastic website. You can modify original code if they violated our goals and rules.

1.Fonts: Use 'Quicksand' for default English presenting.



2.Layout design: Don't use rounded corner card. More precisely, it doesn't need a strong sense of card layout.

2-1 If you use card layout and there are two or more functions combined to one section, you need keep the card as one, but use slight-different color or pattern to divide different functions, like daily recommendation (70%) and view history(30%) in card daily track.

    2-1-a Division technique (proven & preferred):
    Use a vertical divider line (w-px bg-zinc-100 dark:bg-white/5) on desktop and a horizontal one (h-px) on mobile to cleanly separate sub-sections within one card.

    2-1-b Background image with dual-mode overlay (proven & preferred):
    When applying a decorative background image to a sub-section, always layer it as follows:
      Layer 1 (bottom) — Background image:
        opacity-30 dark:opacity-20, group-hover:opacity-40 dark:group-hover:opacity-30
        Use object-cover to fill the area. Always include onError fallback.
      Layer 2 (middle) — Gradient mask for readability:
        Light mode: bg-gradient-to-br from-gray-50/60 via-transparent to-indigo-500/5
        Dark mode:  dark:from-[#0c0c11]/60 dark:to-indigo-500/10
        On hover:   from-gray-100/70 / dark:from-[#0c0c11]/70
        This ensures text contrast in both themes without hardcoding colors.
      Layer 3 (top) — Content (icons, text):
        Always set relative z-10 to float above the image and mask layers.

    2-1-c Hover behavior:
    Sub-sections that are clickable should use hover:bg-gray-50 dark:hover:bg-[#1a1a24] as the base hover state, combined with group-hover transitions on icons (scale-110) and text (color shift to indigo).




