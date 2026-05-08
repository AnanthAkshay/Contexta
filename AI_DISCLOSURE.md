# AI Disclosure

**Project:** Contexta — context-aware smartphone automation app (Samsung Hackathon)
**Team Name:** Team Beta Onepiece — M.S. Ramaiah Institute of Technology

## 1. Overview
This document discloses the use of AI tools during the development of Contexta, in accordance with the hackathon guidelines. AI assistance was utilized to accelerate boilerplate generation and documentation, while the core intellectual property and decision-making remain human-driven.

## 2. AI Tools Used
The following AI tools were used during development:
- GitHub Copilot / ChatGPT / Claude / Cursor
- **Used for:** TypeScript service files, Spring Boot controller scaffolding, and Android native module boilerplate.

## 3. What Was AI-Assisted
- Initial project scaffolding and folder structure boilerplate.
- UI component layout suggestions and styling refinements.
- Documentation drafting, including initial versions of the README and architecture notes.

## 4. What Was Human-Designed
- **Core Detection Algorithms:** The logic for variance thresholds in movement detection, SSID matching for home state, and keyword-based calendar event classification.
- **System Architecture:** All major architectural and feature decisions.
- **Integration Layer:** The complex wiring between React Native, Android native modules (JNI/Bridge), and the Spring Boot REST API.
- **Business Logic:** All logic contained within `contextDetector.ts`, `movementDetector.ts`, and `homeDetector.ts`.

## 5. Verification
All AI-generated code snippets were thoroughly reviewed, manually tested, and fully understood by the team before being integrated into the codebase. The team maintains full responsibility for the stability and security of the application.

## 6. Contact
Akshay A (1MS24IS013) — akshaya@example.com
