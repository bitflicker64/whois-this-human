# Who Is This Human?

A web app that takes a GitHub username, analyzes their repos, and assigns a coding persona with a matching song.

## How it works
1. Enter a GitHub username
2. Server fetches profile + repos via GitHub API (with caching)
3. Analyzes repos to find the most-used programming language
4. Assigns one of 4 personas based on language and repo count
5. Maps the persona to a song — click to open in Spotify

## Run locally
```
npm install
cp .env.example .env   # add your GitHub token (optional)
node server.js          # http://localhost:3333
```

**Tech:** Node.js, Express, Vanilla JS, GitHub API

https://whois-this-human.vercel.app/
