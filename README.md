To update the `README.md` file for the `tmrw-audit` project based on the enhancements and changes discussed, we need to reflect new features like API support, updated CLI commands, and improved documentation. Below is the fully updated `README.md` file, incorporating these changes while maintaining the project's tone and ethos:

---

# tmrw audit

The cloud is a cage. `tmrw audit` is your escape kit. It scans your codebase to reveal your **Freedom Score**—how trapped you are by vendor lock-in and deplatforming risks. A single Terms of Service (ToS) violation could take your app offline. Firebase shut down Iranian devs' projects without warning. GitHub banned Tornado Cash after Treasury pressure. Parler went dark in 2021 when AWS pulled the plug. Don’t be next. Run `tmrw audit`, own your infra, or lose it.

## What is `tmrw audit`?

`tmrw audit` is a command-line interface (CLI) tool that analyzes your codebase for cloud dependencies, calculates your Freedom Score (0–100, higher is freer), and provides an **Escape Plan** to reduce vendor lock-in and deplatforming risks. It parses Terraform (`.tf`), YAML (`.yml`, `.yaml`), CloudFormation JSON, and `package.json` files to detect proprietary services (e.g., AWS Lambda, Azure Functions) and assess portability (e.g., Docker, Kubernetes). The output is clear, actionable, and aligns with the **TMRW Manifesto**’s mission for user-owned, unchained infrastructure.

## Why Use It?

DNS, payment, storage, compute, serverless providers—own your infra with ToS that can shift overnight. `tmrw audit` empowers you to:

- **See Your Risk**: A Freedom Score shows your lock-in level.
- **Build an Escape Plan**: Get steps to reduce dependency (e.g., swap Lambda for Docker).
- **Unchain your Stack**: Build infrastructure you truly own.

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

Edit `.env` to set `FILE_PATTERNS` (e.g., `**/*.tf,**/*.yml`), `DEBUG=true`, or `VERBOSE=true`.

## Commands

- **`tmrw audit`**: Scan your codebase and get your Freedom Score.
  - `--output <path>`: Specify the output path for the report (default: `./tmrw-audit-report.json`).
  - `--patterns <patterns>`: Comma-separated file patterns to scan (e.g., `*.tf,*.yml`).
  - `--verbose`: Enable verbose logging for scanning details.
- **`tmrw report [file]`**: View a saved report (default: `./tmrw-audit-report.json`).
- **`tmrw escape`**: Get instructions on deploying the Sovereign Stack.

## API Usage

`tmrw audit` can also be used programmatically in other applications. Here's an example:

```typescript
import { runAudit, getReport } from "tmrw-audit";

async function example() {
  try {
    const results = await runAudit({
      dir: "/path/to/codebase",
      filePatterns: ["**/*.tf", "**/*.yml"],
      output: "./custom-report.json",
      verbose: true,
    });
    console.log("Freedom Score:", results.freedomScore);
    await getReport("./custom-report.json");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

example();
```

## Contributing

Join the Unchained Infrastructure. Fork the repo, add features (e.g., new file parsers, enhanced scoring, API improvements), and submit a PR. See `CONTRIBUTING.md` for details.

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

Build the project:

```bash
npm run build
```

Link the CLI globally:

```bash
sudo npm link
```

Run tests:

```bash
npm test
```

## License

MIT License  
Copyright (c) 2025 tmrw.it  
Permission is hereby granted, free of charge, to any person obtaining a copy of this software...

The MIT license ensures `tmrw audit` remains open-source and forkable, aligning with its user-owned ethos.

## Join the Movement

The cloud isn’t your friend. Run `tmrw audit` to see your risk.

Own your cloud or lose it.