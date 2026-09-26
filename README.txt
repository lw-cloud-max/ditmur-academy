DITMUR ACADEMY - LESSON PLAN / SCHEME OF WORK TEMPORARY REMOVAL

This ZIP contains a small PowerShell fix, NOT a compiled .next build and NOT
an entire replacement project. It transfers the lesson-plan/scheme-of-work
removal into your Windows Git checkout without overwriting your other work.
This updated version writes UTF-8 WITHOUT BOM. If you ran an earlier version
and Next.js complained about tsconfig.json:1:1 plus many module-not-found
errors, re-run THIS script (or use the one-line repair below).

What the script does:
- Makes a timestamped backup of affected files next to (not inside) your repo.
- Removes only these feature directories IF they exist:
  src/app/api/ai/lesson-plan
  src/app/api/lesson-plans
  src/app/api/schemes
  src/app/lesson-plan
  src/app/schemes
  ...and their counterparts in the tracked "school-app (25)" backup, if present.
- Removes ONLY menu entries linking to /lesson-plan or /schemes from
  src/components/Sidebar.tsx, MobileNav.tsx, MobileMenuPortal.tsx (if present).
- Adds backup-project directories to the tsconfig.json exclude array without
  replacing other tsconfig settings.
- Does not touch your database schema, examinations, or unrelated files.

STEPS (Windows PowerShell)

1. Extract the ZIP somewhere OUTSIDE your Git project, such as Downloads.
   Open PowerShell in the extracted folder, where Apply-Ditmur-Fix.ps1 is.

2. Run:
   powershell -NoProfile -ExecutionPolicy Bypass -File ".\Apply-Ditmur-Fix.ps1" -ProjectPath "C:\Users\hp\Documents\school-app"

   If your project is elsewhere, change only the ProjectPath. The script
   prints the backup location. If the same fix was already applied, re-running
   the script is harmless.

3. Go to your project, inspect what changed and build:
   cd "C:\Users\hp\Documents\school-app"
   git status --short
   npx prisma generate
   npm run build

   If node_modules are not installed, BEFORE 'npx prisma generate' run:
   npm install --ignore-scripts
   (This avoids a postinstall database push.)

   Confirm that the deleted feature files show as D when they were tracked.
   A successful local build is required before committing. If an error remains,
   do not push: send the first error, 'git status --short', and the git commit
   shown on the Vercel deployment so the exact source can be identified.

4. When the build succeeds, inspect the staged list before committing:
   git add -A
   git diff --cached --stat
   git commit -m "fix: temporarily disable lesson plan and scheme of work"
   git push origin main

   git add -A stages ALL current work, including any unrelated changes you
   already made. Review 'git diff --cached --stat' first. If you see a file
   you do not want in this commit, unstage it using:
   git restore --staged -- "path/to/file"
   Then commit/push. Vercel should deploy the new GitHub commit automatically.

QUICK REPAIR if the old ZIP already changed your files: from the project root,
run this in PowerShell to remove the UTF-8 BOM from tsconfig.json only:

   $p = (Resolve-Path '.\tsconfig.json').Path
   $s = [System.IO.File]::ReadAllText($p).TrimStart([char]0xFEFF)
   [System.IO.File]::WriteAllText($p, $s, (New-Object System.Text.UTF8Encoding($false)))
   npm run build

If Vercel still reports the old getMockData error after the push, compare
Vercel's deployment commit SHA with 'git rev-parse HEAD' on this machine and
confirm Vercel points to the correct repository, branch, and root directory.
