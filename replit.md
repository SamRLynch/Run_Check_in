# Clubb Nubb Check-In App

## Overview
Clubb Nubb is a mobile-first web application designed for a small running group to efficiently coordinate daily runs. Its primary purpose is to allow members to see who is running, check in with a single tap, and set up recurring check-ins. The application streamlines the process of organizing group runs, fostering community engagement and consistent participation.

The vision for Clubb Nubb is to provide a user-friendly and reliable platform that simplifies run coordination for small, dedicated groups. It aims to reduce communication overhead and increase participation by making check-ins quick and accessible. Future ambitions include expanding customization options for run types and enhancing social features.

## User Preferences
I prefer clear, concise communication. When explaining concepts, prioritize practical examples over theoretical discussions. I like iterative development with small, testable changes. Please ask before making major architectural changes or introducing new external dependencies. I appreciate detailed explanations for complex features or decisions. Do not make changes to files in the `shared` folder without explicit confirmation.

## System Architecture
The application follows a modern web architecture, utilizing **React, Vite, TailwindCSS, and shadcn/ui** for the frontend, with `wouter` handling client-side routing. The backend is built with **Express.js**, providing a RESTful API. **PostgreSQL** is used as the database, accessed via the **Drizzle ORM**. User identity is managed locally using `localStorage` for simplicity in this initial version.

**UI/UX Decisions:**
- **Mobile-first design** with responsive layouts.
- **Color Palette:** A distinct palette featuring off-white, burnt orange (primary), dark navy (foreground), slate (muted text), and forest green (success states).
- **Typography:** Inter for body text and Fraunces (bold serif) for headings to provide a clear visual hierarchy.
- **Custom icons:** Weather icons are rendered from a custom PNG sprite for consistent branding.
- **Intuitive Interactions:** Single-tap check-ins, clear status indicators, and streamlined dialogs for creating/editing runs. Dialogs are positioned at the top of the screen to avoid keyboard overlap on mobile.
- **Location Integration:** Utilizes geocoding for run locations, allowing specific weather forecasts. A "saved locations" feature enhances user experience for frequently used spots.
- **Run Display:** Next run and upcoming runs are displayed prominently with relevant weather, time, and participant information. Custom runs are visually distinguished with a colored left-border indicator and show the creator's name.
- **User Roles:** A simple role-based permission system (runner, creator, admin) controls access to features like creating, editing, and deleting runs.

**Technical Implementations:**
- **Dynamic Run Creation:** Users with appropriate roles can create custom runs with configurable names, dates, times, and geocoded locations.
- **Check-in System:** Users can mark themselves as "running" or "skipping" with real-time updates and avatar displays.
- **Weather and Tide Integration:** Fetches and displays location-specific weather forecasts and tide charts for run planning.
- **Permissions System:** `permissions.ts` defines logic for determining user capabilities based on their role and run ownership.
- **Preloader:** A custom preloader with the app logo ensures a smooth initial loading experience.
- **Run Routing:** The detail page route is `/run/:runId` where `runId` is the run's database ID. Default runs have ID = date string (e.g. "2026-05-08"), custom runs have ID = "custom-TIMESTAMP". The page finds runs by `r.id === runId || r.date === runId` for backward compatibility.
- **Run Title Helper:** `getRunTitle(run)` in `lib/dates.ts` returns consistent titles: custom name if set, else "Today's Run", "Tomorrow's Run", or "{Day} Run". Used on both home and detail pages.
- **Run Visibility:** Admins can hide/unhide default runs via a `⋯` menu on the detail page. Hidden runs are invisible to non-admins. Schema has `hidden: boolean` on the `runs` table. API endpoint: `PATCH /api/runs/:id/visibility`.

**Feature Specifications:**
- **Home Screen:** Displays the next upcoming run in detail, followed by a list of other upcoming runs. Custom runs are sorted before default runs when on the same date. Hidden runs are filtered out for non-admins (dimmed for admins). Includes quick check-in/skip functionality.
- **Run Detail Page:** Provides comprehensive information for a specific run, including weather, tide data, a roster of participants (runners and skippers), and action buttons. Admins see a "Hidden" badge and hide/unhide menu on default runs.
- **Run Management:** Creators and admins can edit or delete custom runs through a dedicated menu on the run detail page. Admins can hide/unhide default runs.
- **Settings Page:** Allows users to update their display name and manage their account role (admin login).
- **Location Management:** Features a `LocationSearch` component with address autocomplete, biased towards York, ME, and the ability to save locations for quick selection.

## External Dependencies
- **Open-Meteo API:** Used for fetching weather forecasts (temperature, wind, precipitation) based on geographical coordinates.
- **NOAA CO-OPS API:** Provides tide predictions for York Harbor (station 8419317) to display on run detail pages.
- **Photon API (photon.komoot.io):** Utilized for address geocoding and autocomplete functionality within the `LocationSearch` component.
- **PostgreSQL:** The primary database for storing application data such as runs, check-ins, and user-saved locations.