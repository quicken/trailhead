# @cfkit/vite-plugin-i18n

Build-time i18n plugin for Vite with zero runtime overhead.

## Usage

### 1. Mark Translatable Strings

```typescript
import { t } from "./lib/i18n";

function MyComponent() {
  return <button>{t("Save")}</button>;
}
```

### 2. Extract Strings

```bash
npm run i18n:extract
```

This scans your source code and creates `translations/template.json`:

```json
{
  "Save": "Save",
  "Cancel": "Cancel",
  "Loading...": "Loading..."
}
```

### 3. Create Translation File

```bash
cp translations/template.json translations/de.json
```

### 4. Translate

Edit `translations/de.json`:

```json
{
  "Save": "Speichern",
  "Cancel": "Abbrechen",
  "Loading...": "Lädt..."
}
```

### 5. Validate (Optional)

```bash
npm run i18n:validate
```

Checks for:

- Missing translations
- Extra translations (not in source code)
- Untranslated strings (still in English)

### 6. Build

```bash
npm run build:de
```

At build time, `t("Save")` becomes `"Speichern"` - zero runtime overhead!

## Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "i18n:extract": "node ../vite-plugin-i18n/extract.js",
    "i18n:validate": "node ../vite-plugin-i18n/validate.js",
    "build:de": "vite build --config vite.config.de.js"
  }
}
```

## Workflow

```bash
# 1. Add t() calls in code
<button>{t("Save")}</button>

# 2. Extract strings
npm run i18n:extract

# 3. Create language file
cp translations/template.json translations/de.json

# 4. Translate
# Edit de.json

# 5. Validate
npm run i18n:validate

# 6. Build
npm run build:de
```

## Features

- ✅ Zero runtime overhead
- ✅ Automatic string extraction
- ✅ Validation of translations
- ✅ Simple string replacement
- ✅ Works with TypeScript/JavaScript
- ✅ No dependencies
