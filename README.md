<div align="center">

# `@aklinker1/logger`

[![JSR](https://jsr.io/badges/@aklinker1/logger)](https://jsr.io/@aklinker1/logger)
[![NPM Version](https://img.shields.io/npm/v/%40aklinker1%2Flogger?logo=npm&labelColor=red&color=white)](https://www.npmjs.com/package/@aklinker1/logger)
[![Docs](https://img.shields.io/badge/API%20Reference-blue?logo=readme&logoColor=white)](https://jsr.io/@aklinker1/logger/doc)
[![Install Size](https://pkg-size.dev/badge/install/61804)](https://pkg-size.dev/@aklinker1%2Flogger)

Personalized logger for backends.

![Preview](https://raw.githubusercontent.com/aklinker1/logger/refs/heads/main/.github/preview.png)

</div>

```sh
bun add @aklinker1/logger
```

## Usage

```ts
import { createLogger } from "@aklinker1/logger";

const logger = createLogger("namespace");
logger.info("message", { params: any });
```

### Log Level

Set the `LOG_LEVEL` env var equal to the minimum level you want to see:

```sh
LOG_LEVEL=warn my-script
```

### Log Format

There are two log formatters:

- **Pretty** (`LOG_FORMAT=pretty`): Default for development
- **JSON** (`LOG_FORMAT=json`): Default in production environments where `NODE_ENV=production`
