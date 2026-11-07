# 06 — Customer Workflows (Phase 0.4)

Research date: 2026-11-07 · Each workflow shows the **current (as-is)** journey and the **proposed AUDIO OS (to-be)** journey. As-is flows are based on typical industry practice [A/K] and must be confirmed in interviews.
🔴 = observed or hypothesised friction point.

---

## W1. Sound designer finds the right sound for a brief (core MVP journey)

**As-is**
```mermaid
flowchart TD
    A[Brief: 'heavy metal door slam, reverb tail'] --> B[Open desktop librarian<br/>Soundly / Soundminer / BaseHead]
    B --> C[Keyword search]
    C --> D{Metadata good?}
    D -- yes --> E[Audition results]
    D -- no 🔴 --> F[Try synonyms, browse folders,<br/>audition dozens of files]
    F --> E
    E --> G{Found?}
    G -- no 🔴 --> H[Check other libraries / drives /<br/>Splice / record new]
    H --> C
    G -- yes --> I[Drag or spot into DAW]
    I --> J[Design & layer]
```

**To-be (AUDIO OS)**
```mermaid
flowchart TD
    A[Brief] --> B[AUDIO OS search bar:<br/>natural-language query]
    B --> C[Hybrid ranking:<br/>keyword + CLAP semantic + filters<br/>UCS category, duration, SR, library, licence]
    C --> D[Audition in browser:<br/>pre-computed waveform, instant streaming preview]
    D --> E{Close but not right?}
    E -- yes --> F[More like this:<br/>audio-to-audio similarity]
    F --> D
    E -- no, found --> G[Add to project collection]
    G --> H[Download original / drag-out<br/>P2: desktop companion spot-to-DAW]
```
**Success metric:** median time-to-acceptable-result and number of files auditioned per search (baseline to be measured in usability tests).

---

## W2. Ingest and organise a new sound library

**As-is**
```mermaid
flowchart TD
    A[Buy or record new library] --> B[Download / copy to drive]
    B --> C[🔴 Decide: keep vendor folders or re-categorise?]
    C --> D[🔴 Rename to UCS manually or by script]
    D --> E[🔴 Fill missing descriptions/keywords by hand]
    E --> F[Librarian rescans folders → database]
    F --> G[🔴 Repeat per machine; metadata drift]
```
Evidence: Reddit discussion asking how professionals handle the first cleanup pass (keep vendor folders, rename, tag, import to Soundly/Soundminer/BaseHead) [T] S37; UCS naming recommended [T] S37, S36.

**To-be**
```mermaid
flowchart TD
    A[Drag folder into AUDIO OS web uploader<br/>resumable multipart] --> B[Validate: type, size, decode check, malware scan]
    B --> C[Extract technical + embedded metadata<br/>ffprobe, BWF bext, iXML, ID3]
    C --> D[Generate preview Opus/MP3 + waveform peaks + spectrogram]
    D --> E[AI: CLAP embedding, tag suggestions,<br/>UCS category suggestion, duplicate detection]
    E --> F[Review queue: accept / correct suggestions in bulk]
    F --> G[Searchable across devices & team]
    G --> H[Optional: write metadata back into file on export]
```

---

## W3. Mix / sound review and approval with a client

**As-is**
```mermaid
sequenceDiagram
    participant Eng as Engineer
    participant Xfer as WeTransfer/Drive
    participant Client
    Eng->>Xfer: Upload mix_v3.wav
    Xfer->>Client: Link by email
    Client->>Eng: 🔴 "Vocals louder around the second chorus?" (no timestamp)
    Eng->>Eng: 🔴 Guess location, re-mix
    Eng->>Xfer: Upload mix_v4_final.wav 🔴 version confusion
    Client->>Eng: "Approved" in WhatsApp 🔴 no audit trail
```
**To-be (P1 feature, not P0)**
```mermaid
sequenceDiagram
    participant Eng as Engineer
    participant AOS as AUDIO OS
    participant Client
    Eng->>AOS: Upload v3 into "Mix" asset (versioned)
    AOS->>AOS: Loudness report (LUFS, true peak)
    Eng->>Client: Share link (no account, passphrase, expiry)
    Client->>AOS: Waveform-anchored comments at 01:42.3
    Eng->>AOS: Upload v4 as new version, A/B compare
    Client->>AOS: Approve v4 (timestamped, recorded in audit log)
```

---

## W4. Game-audio asset production and handoff

**As-is**
```mermaid
flowchart LR
    A[Asset list in sheet/Jira] --> B[Find sources in library]
    B --> C[Design in Reaper]
    C --> D[Render variations<br/>🔴 manual naming rules]
    D --> E[Import to Wwise/FMOD]
    E --> F[Commit to Perforce]
    F --> G[🔴 Lead reviews in-game only;<br/>no record of source files or licences]
```
**To-be (P1–P2)**
```mermaid
flowchart LR
    A[Project in AUDIO OS<br/>with asset list] --> B[AI search shared team library]
    B --> C[Design in DAW]
    C --> D[Upload renders → linked to project + source assets<br/>provenance graph]
    D --> E[Naming-rule validator]
    E --> F[Review link for lead]
    F --> G[API / CLI export to engine pipeline]
```

---

## W5. Podcast episode production (secondary)

```mermaid
flowchart LR
    A[Record: Riverside] --> B[Edit: Descript / Hindenburg]
    B --> C[Process: Auphonic loudness]
    C --> D[🔴 Client review via Drive + email]
    D --> E[Publish to host]
    B -.reuse intros/beds/ads 🔴 scattered files.-> B
```
AUDIO OS role: **shared asset library** for reusable beds, intros and ads with licence metadata, plus **audio review**. Recording and editing stay with incumbents.

---

## W6. Audio library operator publishes a catalog (future, P3)

```mermaid
flowchart LR
    A[Record & edit library] --> B[Bulk metadata authoring<br/>UCS + descriptions]
    B --> C[AI-assisted tagging QA]
    C --> D[Publish catalog to AUDIO OS marketplace]
    D --> E[Licence issued per purchase<br/>licence record attached to asset]
    E --> F[Royalty / sales reporting]
```

## Workflow-derived requirements (feed into MVP)
| Req ID | Requirement | From |
|---|---|---|
| WF-R1 | Search results with audible preview in < 1 s after click [A target] | W1 |
| WF-R2 | Natural-language and similarity search across all of the user's libraries | W1, W4 |
| WF-R3 | Bulk ingest of folders (thousands of files), resumable | W2 |
| WF-R4 | Preserve and read embedded BWF/iXML metadata | W2 |
| WF-R5 | AI tag suggestions with bulk accept/reject | W2 |
| WF-R6 | Collections / projects to group selected sounds | W1, W4 |
| WF-R7 | Share links with time-coded comments (P1) | W3 |
| WF-R8 | Version stack per asset (P1) | W3, W4 |
| WF-R9 | Licence/source metadata on every asset | W4, W6 |
| WF-R10 | Getting files into the DAW: download / drag-out; desktop companion later | W1 |
