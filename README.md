
# DevQnA

**Live:** [devqna.online](https://devqna.online)

Welcome to DevQnA! This project is designed to help you prepare for coding interviews and technical rounds with interactive Q&A, explanations, and examples.

## Getting Started

To get started, take a look at [src/app/page.tsx](src/app/page.tsx).

## Features
- Interactive coding round questions
- Topic-based Q&A
- Example explanations
- Modern UI with custom components

## Customization
You can further customize the app by editing components in the `src/components` directory and updating question data in `src/lib/questions.ts`.

## SEO configuration
Brand, domain and default copy live in `src/lib/site.ts`; schema.org builders in `src/lib/schema.ts`.
Set `NEXT_PUBLIC_SITE_URL` (defaults to `https://devqna.online`) so canonical URLs, `sitemap.xml`,
`robots.txt`, structured data and social cards use the right domain. See `.env.example` for the
optional search console verification tokens.
