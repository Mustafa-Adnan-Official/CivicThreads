# CivicThreads
Aggregate solution for community involvement with complaints/warnings to local government officials in a centralized webapp.


## Framework
Gemini, Firebase Auth, Firestore Database
HTML, CSS (Vanilla no tailwind), React.js/Node.js
Features
Has a heatmap of all the issues, Gemini Embeddings will do matchings for related issues. They are aggregated into threads. The map works on a reportVolume (Y), demand (X). Top right is higher in value for automatic accessibility (or more red), greener or less value in the bottom left, then in between would be orange/mid value.

Clicking on the thread opens an AI overview on the whole thread. And you can see it as a post, with an upvote section, Gov. announcements & count of common Issues related.

Heatmap has the Forum submision for RESIDENTIAL users, optional image addition. Ward users can not create issues, or delete anything. Administrative users will assign ward access.

AI summary will auto update on every related issue post. If new issue gives new examples, Gemini will add 'Users specify the following: ""'

All user's will have to log in, but residental users can choose to be anonymous.

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
