# tmrw audit

The cloud is a cage. `tmrw audit` is your escape kit. It scans your codebase to reveal your **Freedom Score**—how trapped you are by vendor lock-in and deplatforming risks. A single Terms of Service (ToS) violation could take your app offline. Parler went dark in 2021 when AWS pulled the plug. Gab lost payments when Stripe banned them. Don’t be next. Run `tmrw audit`, own your infra, or lose it.

## What is `tmrw audit`?

`tmrw audit` is a command-line interface (CLI) tool that analyzes your codebase for cloud dependencies, calculates your Freedom Score (0–100, higher is freer), and provides an **Escape Plan** to reduce vendor lock-in and deplatforming risks. It parses Terraform (`.tf`), YAML (`.yml`, `.yaml`), and `package.json` files to detect proprietary services (e.g., AWS Lambda, Azure Functions) and assess portability (e.g., Docker, Kubernetes). The output is clear, actionable, and aligns with the **Escape Manifesto**’s mission for user-owned, unkillable infrastructure.

## Why Use It?

Cloud giants—AWS, Azure, Google—control your infra with ToS that can shift overnight. `tmrw audit` empowers you to:

- **See Your Risk**: A Freedom Score shows your lock-in level.
- **Escape the Cage**: Get steps to reduce dependency (e.g., swap Lambda for Docker).
- **Stay Sovereign**: Build infrastructure you truly own.

## Installation

Install `tmrw audit` globally from npm:

```bash
npm install -g tmrw-audit
```

## Usage

Navigate to your project directory and run:

```bash
cd your-project
tmrw audit
```

### Example Output

```
AUDIT COMPLETE: YOUR INFRA'S FATE EXPOSED
Freedom Score: 80/100 (CAUTIOUS)
Vendor Lock-In: 0.0%
Deplatforming Risk: Low
Recommendations:
- Ditch proprietary services like Lambda for Dockerized functions.
- Replace vendor-locked storage like S3 with MinIO or self-hosted solutions.
- Spread your infra across multiple providers or go local.
- Deploy the Sovereign Stack: tmrw.it/stack
Report saved to: ./tmrw-audit-report.json
```

To view the detailed report:

```bash
tmrw report
```

### Configuration

Customize file patterns or enable debug mode by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` to set `FILE_PATTERNS` (e.g., `**/*.tf,**/*.yml`) or `DEBUG=true`.

## Commands

- `tmrw audit`: Scan your codebase and get your Freedom Score.
- `tmrw report [file]`: View a saved report (default: `./tmrw-audit-report.json`).

## Contributing

Join the Unchained Cloud movement. Fork the repo, add features (e.g., new file parsers, enhanced scoring), and submit a PR. See `CONTRIBUTING.md` for details.

### Setup for Contributors

Clone the repo:

```bash
git clone https://github.com/tmrw-it/tmrw-audit.git
cd tmrw-audit
```

Install dependencies:

```bash
npm install
```

Build and link locally:

```bash
npm run build
npm link
```

Run tests:

```bash
npm test
```

## License

MIT License. See `LICENSE` for details:

```
MIT License
Copyright (c) 2025 tmrw.it
Permission is hereby granted, free of charge, to any person obtaining a copy of this software...
```

The MIT license ensures `tmrw audit` remains open-source and forkable, aligning with its user-owned ethos.

## Join the Movement

The cloud isn’t your friend. Run `tmrw audit` to see your risk.

Own your cloud or lose it.
