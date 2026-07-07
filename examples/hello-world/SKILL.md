---
name: hello-world
description: Minimal example skill — a copy-paste template for your own skills.
version: 1.0.0
triggers: [hello, hi]
---

# Hello, world!

This is the smallest possible skill. When a user types `/hello` (or `/hi`), the
agent runs `skill trigger hello` and this body is loaded into context.

## What to do

1. Greet the user warmly.
2. Briefly offer to help with whatever they're working on.

---

## Make it your own

Replace the frontmatter and this body with your own instructions. The only
required field is `name`; `description`, `version`, and `triggers` are recommended.

```yaml
---
name: my-skill            # required, plain identifier (a-z 0-9 . _ -)
description: What it does # recommended — shown by `skill list` / `skill show`
version: 1.0.0            # recommended — surfaced by `skill update`
triggers: [x, y]          # optional — powers /x and /y
---
```

## Try it locally

```bash
# from a checkout of this repo, install this example into your store:
skill install ./examples

# then:
skill list
skill trigger hello
```
