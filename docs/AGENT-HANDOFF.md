# Agent handoff

## What WishUBest is

WishUBest is a multilingual, international platform connecting patients with doctors. Patients discover public doctor profiles and book video, online chat, or in-person consultations. Doctors manage professional presence, services, availability, appointments, and authorized patient communication. Translation is a core capability across UI, public content, notifications, and permitted communication.

It is not a generic marketplace product. Do not reintroduce a generic marketplace vocabulary or model.

## Start here

1. Read the root README rule, this handoff, PROJECT-STATE, and relevant ADRs.
2. Update canonical documentation in place; preserve paths and leave unresolved questions explicitly open.
3. Before implementation, resolve the medical/legal and privacy boundary, scheduling/booking lifecycle, initial locales/translation policy, and evaluation criteria.
4. Do not select video, realtime, translation, payment, hosting, cloud, storage, messaging, or email/SMS providers by implication; document evaluation and material ADRs.
5. After each commit, update PROJECT-STATE in the same commit when possible.

## Current safe next step

Perform Phase 0–1 analysis for the first patient discovery-to-booking workflow. Define target markets, doctor verification/publication, services and consultation modes, availability/time zones, booking changes, consent/retention, SEO requirements, and translation boundaries. Do not scaffold Laravel, create migrations, install dependencies, or implement an application.

## High-risk decisions

Cross-border healthcare/legal scope, patient-data classification, credential verification, appointment concurrency, consultation communication/recording, translation of medical content, payment/tax/refund responsibility, and public-profile SEO can materially change the architecture.
